/**
 * GET /api/report/[reportId]/image/[index]
 * 
 * Proxy endpoint for report evidence images.
 * - Verifies user is authenticated
 * - Fetches report and extracts object path at index
 * - Generates a signed URL from Supabase
 * - Proxies the image response (Supabase URL never exposed to client)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../../../lib/supabase";
import { adminAuth, adminFirestore } from "../../../../../firebase/admin";
import { parseCookies } from "nookies";
import { extractObjectPath } from "../../../../../utils/storage";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  const { reportId, index } = req.query;

  // Validate parameters
  if (!reportId || typeof reportId !== "string") {
    return res.status(400).json({ error: "Missing or invalid reportId" });
  }

  const imageIndex = parseInt(index as string, 10);
  if (isNaN(imageIndex) || imageIndex < 0) {
    return res.status(400).json({ error: "Invalid image index" });
  }

  // ----- Authentication -----
  const cookies = parseCookies({ req });
  const sessionToken = cookies.session;
  const authHeader = req.headers.authorization ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const tokenToVerify = bearerToken || sessionToken;

  if (!tokenToVerify) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await adminAuth.verifyIdToken(tokenToVerify);
  } catch (e) {
    console.error("[Report Image API] Auth error:", e);
    return res.status(403).json({ error: "Forbidden or token invalid" });
  }

  try {
    // ----- Fetch report -----
    const docRef = adminFirestore.collection("reports").doc(reportId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.warn("[Report Image API] Report not found:", reportId);
      return res.status(404).json({ error: "Report not found" });
    }

    const data = docSnap.data();
    if (!data || data.status !== "approved") {
      console.warn("[Report Image API] Report not approved or missing data");
      return res.status(403).json({ error: "Report not accessible" });
    }

    // ----- Get image path -----
    const evidenceUrls = (data.evidenceUrls || []) as (string | null)[];
    if (imageIndex >= evidenceUrls.length) {
      console.warn("[Report Image API] Image index out of bounds:", imageIndex, "total:", evidenceUrls.length);
      return res.status(404).json({ error: "Image not found" });
    }

    const rawPath = evidenceUrls[imageIndex];
    if (!rawPath) {
      console.warn("[Report Image API] Empty evidence URL at index:", imageIndex);
      return res.status(404).json({ error: "Image not found" });
    }

    // ----- Extract object path (handles both old full URLs and new paths) -----
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "report-images";
    const objectPath = extractObjectPath(rawPath, bucketName);
    console.log("[Report Image API] Fetching image:", objectPath);

    // ----- Generate signed URL -----
    const { data: signed, error: signedErr } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(objectPath, 60);

    if (signedErr || !signed?.signedUrl) {
      console.error("[Report Image API] Failed to generate signed URL:", signedErr);
      return res.status(500).json({ error: "Failed to fetch image" });
    }

    // ----- Fetch image from Supabase using signed URL -----
    const imageResponse = await fetch(signed.signedUrl);
    if (!imageResponse.ok) {
      console.error("[Report Image API] Supabase fetch failed:", imageResponse.status);
      return res.status(imageResponse.status).json({ error: "Image fetch failed" });
    }

    // ----- Proxy the image response -----
    // Copy relevant headers from Supabase response
    const contentType = imageResponse.headers.get("content-type");
    const contentLength = imageResponse.headers.get("content-length");

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    // Set cache headers - images are immutable (UUID filename ensures uniqueness)
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    // Prevent MIME type sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Copy image data to response
    const buffer = await imageResponse.arrayBuffer();
    res.status(200);
    res.end(Buffer.from(buffer));
  } catch (e) {
    console.error("[Report Image API] Error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
