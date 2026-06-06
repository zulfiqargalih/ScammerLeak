// pages/api/admin/review.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminFirestore } from "../../../firebase/admin";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { parseCookies } from "nookies";

/**
 * GET  /api/admin/review - Get all pending reports (admin only).
 * POST /api/admin/review - Approve or reject a report (admin only).
 *
 * Evidence images are stored as Supabase Storage public URLs in evidenceUrls[].
 * No Firebase Storage signed URL generation needed.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = parseCookies({ req });
  const sessionToken = cookies.session;

  // Also support Bearer token
  const authHeader = req.headers.authorization ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const tokenToVerify = bearerToken || sessionToken;

  if (!tokenToVerify) {
    return res.status(401).json({ error: "Unauthorized. Admin session required." });
  }

  try {
    // 1. Verify user identity
    const decodedUser = await adminAuth.verifyIdToken(tokenToVerify);
    const userEmail = decodedUser.email || "";

    // 2. Check if the user email is whitelisted as admin
    const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
    const adminEmails = adminEmailsEnv
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    if (!adminEmails.includes(userEmail.toLowerCase())) {
      return res.status(403).json({ error: "Forbidden. You are not authorized as an admin." });
    }

    if (req.method === "GET") {
      // Fetch all reports awaiting review (status = "pending")
      const pendingSnapshot = await adminFirestore
        .collection("reports")
        .where("status", "==", "pending")
        .get();

      // Sort by createdAt descending in memory (avoids needing a composite index)
      pendingSnapshot.docs.sort((a: QueryDocumentSnapshot, b: QueryDocumentSnapshot) => {
        const aTime = (a.data().createdAt as string) ?? "";
        const bTime = (b.data().createdAt as string) ?? "";
        return bTime.localeCompare(aTime);
      });

      // evidenceUrls are already Supabase Storage public URLs — return directly
      const reports = pendingSnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
        // Ensure evidenceUrls field always exists (backwards compat for old Firebase Storage reports)
        evidenceUrls: doc.data().evidenceUrls ?? [],
      }));

      return res.status(200).json(reports);

    } else if (req.method === "POST") {
      const { reportId, action } = req.body; // action: "approve" | "reject"

      if (!reportId || !action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({
          error: "Invalid parameters. reportId and action (approve/reject) are required.",
        });
      }

      const status = action === "approve" ? "approved" : "rejected";

      // Update the report status in Firestore
      await adminFirestore.collection("reports").doc(reportId).update({
        status,
        reviewedBy: userEmail,
        reviewedAt: new Date().toISOString(),
      });

      return res.status(200).json({ message: `Report successfully ${status}.` });

    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).end("Method Not Allowed");
    }
  } catch (e) {
    console.error("Admin review handler error:", e);
    return res.status(401).json({ error: "Authentication failed or server error." });
  }
}
