// pages/api/reports.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminFirestore } from "../../firebase/admin";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { parseCookies } from "nookies";
import { sendReportNotification } from "../../utils/email";

/**
 * POST /api/reports - Submit a new scam report (requires authenticated user).
 * GET  /api/reports - Get all approved reports (public feed).
 *
 * Evidence images are stored as Supabase Storage public URLs in evidenceUrls[].
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

      if (!title || !chronology) {
        return res.status(400).json({ error: "Judul dan kronologi wajib diisi." });
      }
      if (!Array.isArray(evidenceUrls) || evidenceUrls.length === 0) {
        return res.status(400).json({ error: "Minimal satu bukti gambar diperlukan." });
      }

      // Prepare report data — evidenceUrls are direct Supabase Storage public URLs
      const newReport = {
        title,
        chronology,
        ewalletDetails: ewalletDetails || "",
        evidenceUrls,   // array of Supabase Storage HTTPS URLs
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

      // evidenceUrls are already Supabase Storage public URLs — no signed URL generation needed
      const reports = reportsSnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
      }));

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
