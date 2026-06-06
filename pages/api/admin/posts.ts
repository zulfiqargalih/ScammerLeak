// pages/api/admin/posts.ts
// Admin management API for posts (reports).
// Provides endpoints to list, delete, and update existing reports.
// All actions require admin authentication (same logic as review.ts).

import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth, adminFirestore } from "../../../firebase/admin";
import { parseCookies } from "nookies";

/**
 * Helper: verify that the request is made by an admin user.
 * Returns the admin email if verification succeeds, otherwise throws.
 */
async function verifyAdmin(req: NextApiRequest): Promise<string> {
  const cookies = parseCookies({ req });
  const sessionToken = cookies.session;
  const authHeader = req.headers.authorization ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const tokenToVerify = bearerToken || sessionToken;

  if (!tokenToVerify) {
    throw new Error("Unauthorized. Admin session required.");
  }

  const decoded = await adminAuth.verifyIdToken(tokenToVerify);
  const userEmail = decoded.email?.toLowerCase() ?? "";
  const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
  const adminEmails = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.includes(userEmail)) {
    throw new Error("Forbidden. You are not authorized as an admin.");
  }
  return userEmail;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await verifyAdmin(req);
  } catch (e: any) {
    return res.status(401).json({ error: e.message ?? "Authentication failed." });
  }

  if (req.method === "GET") {
    // Return all reports (any status). Admin can see everything.
    const snapshot = await adminFirestore.collection("reports").get();
    const reports = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(reports);
  }

    if (req.method === "DELETE") {
      const { reportId } = req.body;
      if (!reportId) {
        return res.status(400).json({ error: "Missing reportId in request body." });
      }
      // Delete the report
      await adminFirestore.collection("reports").doc(reportId).delete();
      // Log the deletion for audit purposes
      const adminEmail = await verifyAdmin(req); // reuse verification to get admin email
      const { logDeletion } = await import("../../../utils/audit");
      await logDeletion(adminEmail, reportId);
      return res.status(200).json({ message: "Report deleted successfully." });
    }

  if (req.method === "PUT") {
    const { reportId, updates } = req.body;
    if (!reportId || typeof updates !== "object" || updates === null) {
      return res
        .status(400)
        .json({ error: "Missing reportId or updates object in request body." });
    }
    // Prevent admin from accidentally changing immutable fields like id.
    const allowedFields = [
      "title",
      "description",
      "status",
      "evidenceUrls",
      "category",
    ];
    const filteredUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }
    await adminFirestore.collection("reports").doc(reportId).update(filteredUpdates);
    return res.status(200).json({ message: "Report updated successfully." });
  }

  // Unsupported method
  res.setHeader("Allow", ["GET", "DELETE", "PUT"]);
  return res.status(405).end("Method Not Allowed");
}
