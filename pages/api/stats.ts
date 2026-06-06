// pages/api/stats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { adminFirestore } from "../../firebase/admin";

/**
 * GET /api/stats
 * Returns aggregate platform statistics for the hero section.
 * Counts: total approved reports, unique e-wallet providers reported, unique reporters.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    // Fetch all approved reports
    const snapshot = await adminFirestore
      .collection("reports")
      .where("status", "==", "approved")
      .get();

    const docs = snapshot.docs as any[];
    const totalReports = docs.length;

    // Count unique e-wallet providers mentioned
    const providers = new Set<string>();
    const reporters = new Set<string>();

    for (const doc of docs) {
      const data = doc.data();
      if (data.ewalletDetails) {
        // Extract provider name from "E-Wallet: DANA - 081234..." format
        const match = data.ewalletDetails.match(/E-Wallet:\s*(\w+)/i);
        if (match) providers.add(match[1].toUpperCase());
      }
      if (data.userId) reporters.add(data.userId);
    }

    // Also count pending (total submissions ever)
    const pendingSnapshot = await adminFirestore
      .collection("reports")
      .where("status", "==", "pending")
      .get();

    const totalSubmissions = totalReports + (pendingSnapshot.docs?.length ?? 0);

    return res.status(200).json({
      totalReports,
      totalSubmissions,
      uniqueProviders: providers.size || 0,
      uniqueReporters: reporters.size || 0,
    });
  } catch (err) {
    console.error("[/api/stats] Error:", err);
    // Return zeros gracefully — don't break the page
    return res.status(200).json({
      totalReports: 0,
      totalSubmissions: 0,
      uniqueProviders: 0,
      uniqueReporters: 0,
    });
  }
}
