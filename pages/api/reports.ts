// pages/api/reports.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminFirestore } from "../../firebase/admin";
import { supabase } from "../../lib/supabase";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { parseCookies } from "nookies";
import { sendReportNotification } from "../../utils/email";
import { validateTitle, validateChronology, validateEwalletDetails, allowRequest } from "../../utils/validation";

/**
 * POST /api/reports - Submit a new scam report (requires authenticated user).
 * GET  /api/reports - Get all approved reports (public feed).
 *
 * Evidence images are stored as Supabase Storage object paths in evidenceUrls[].
 * Signed URLs are generated on-demand when images are requested.
 * No Firebase Storage is used.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parseCookies({ req });
  const sessionToken = cookies.session;

  if (req.method === "POST") {
    try {
      // Accept token from Authorization header (preferred) or session cookie (fallback)
      const authHeader = req.headers.authorization ?? "";
      const bearerToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
      const tokenToVerify = bearerToken || sessionToken;
      if (!tokenToVerify) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
      }
      const decodedUser = await adminAuth.verifyIdToken(tokenToVerify);
      const { uid, email, name } = decodedUser;

      const { title, chronology, ewalletDetails, evidenceUrls } = req.body;

      // Simple IP‑based rate limiting (10 requests per minute)
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket?.remoteAddress || '';
      if (!allowRequest(ip, 10, 60_000)) {
        return res.status(429).json({ error: "Too many requests, please try again later." });
      }

      // Server‑side validation of inputs
      const titleErr = validateTitle(title);
      const chronoErr = validateChronology(chronology);
      const ewalletErr = validateEwalletDetails(ewalletDetails);
      if (titleErr || chronoErr || ewalletErr) {
        return res.status(400).json({ error: titleErr || chronoErr || ewalletErr });
      }

      if (!Array.isArray(evidenceUrls) || evidenceUrls.length === 0) {
        return res.status(400).json({ error: "Minimal satu bukti gambar diperlukan." });
      }

      // Prepare report data — evidenceUrls are Supabase Storage object paths
      // Signed URLs will be generated on-demand when displaying the report
      const newReport = {
        title,
        chronology,
        ewalletDetails: ewalletDetails || "",
        evidenceUrls,   // array of Supabase Storage object paths (NOT full URLs)
        userId: uid,
        userName: name || "Anonymous User",
        userEmail: email || "no-email@google.com",
        status: "pending", // All reports must be reviewed by admin
        createdAt: new Date().toISOString(),
      };

      // Add to Firestore "reports" collection
      const docRef = await adminFirestore.collection("reports").add(newReport);

      // Trigger admin email notification (async — does not block response)
      sendReportNotification({
        reportId: docRef.id,
        title,
        reporterName: newReport.userName,
        reporterEmail: newReport.userEmail,
      }).catch((err) => console.error("Email notification error:", err));

      return res.status(201).json({
        message: "Report submitted successfully and is awaiting admin review.",
        reportId: docRef.id,
      });
    } catch (e) {
      console.error("Error submitting report:", e);
      return res.status(401).json({ error: "Invalid session or submission error." });
    }

  } else if (req.method === "GET") {
    // Public feed — fetch only approved reports
    try {
      const reportsSnapshot = await adminFirestore
        .collection("reports")
        .where("status", "==", "approved")
        .get();

      // Sort by createdAt descending in memory
      reportsSnapshot.docs.sort((a: QueryDocumentSnapshot, b: QueryDocumentSnapshot) => {
        const aTime = a.data().createdAt ?? "";
        const bTime = b.data().createdAt ?? "";
        return bTime.localeCompare(aTime);
      });

      // Generate signed URLs for each evidence path (if stored as path)
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "report-images";
      const reports = await Promise.all(
        reportsSnapshot.docs.map(async (doc: QueryDocumentSnapshot) => {
          const data = doc.data();
          // evidenceUrls may be an array of paths or full URLs; handle both.
          const evidence = Array.isArray(data.evidenceUrls)
            ? await Promise.all(
                // Filter out null/undefined entries before processing.
                (data.evidenceUrls as (string | null)[])
                  .filter((p): p is string => typeof p === "string" && p !== null)
                  .map(async (p: string) => {
                    // If already a full URL, keep it.
                    if (p.startsWith("http")) return p;
                    // Generate a signed URL for the stored image path. Await the async call.
                    const { data: signed, error } = await supabase.storage
                      .from(bucketName)
                      .createSignedUrl(p, 60);
                    // If there is an error generating the signed URL, fall back to the original path.
                    return error ? p : signed?.signedUrl || p;
                  })
              )
            : [];
          return { id: doc.id, ...data, evidenceUrls: evidence };
        })
      );

      return res.status(200).json(reports);
    } catch (e) {
      console.error("Error fetching reports:", e);
      return res.status(500).json({ error: "Failed to fetch reports." });
    }

  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).end("Method Not Allowed");
  }
}
