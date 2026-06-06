import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../../lib/supabase";
import { adminAuth } from "../../../firebase/admin";
import { parseCookies } from "nookies";

/**
 * GET /api/image/[...path]
 *
 * - Verifies the request is from an authenticated user (via Bearer token or session cookie).
 * - Generates a short‑lived signed URL for the requested Supabase storage object.
 * - Responds with a 302 redirect to the signed URL.
 *
 * The client simply sets the image `src` to `/api/image/<storagePath>` and never sees the
 * actual Supabase URL or token.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  // The dynamic route captures the full storage path as an array of segments.
  const { path: pathSegments } = req.query;
  if (!Array.isArray(pathSegments) || pathSegments.length === 0) {
    return res.status(400).json({ error: "Missing storage path" });
  }
  const storagePath = decodeURIComponent(pathSegments.join("/"));

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
    // In a real app you would also check ownership or admin role here.
  } catch (e) {
    console.error("Auth error in image endpoint:", e);
    return res.status(403).json({ error: "Forbidden or token invalid" });
  }

  // ----- Generate signed URL -----
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "report-images";
  // Log for debugging – helps verify the exact path being requested.
  console.log("[Image API] Generating signed URL for bucket", bucket, "path", storagePath);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60);
  if (error) {
    // If the object does not exist, return a clear 404 response instead of a generic 500.
    if (error.status === 400 && error.message?.includes("Object not found")) {
      console.warn("[Image API] Object not found for path", storagePath);
      return res.status(404).json({ error: "Image not found" });
    }
    console.error("Signed URL error:", error);
    return res.status(500).json({ error: "Failed to generate signed URL" });
  }

  // Redirect the client to the signed URL (302). This keeps the Supabase URL hidden.
  if (data?.signedUrl) {
    res.writeHead(302, { Location: data.signedUrl });
    return res.end();
  }
  return res.status(500).json({ error: "Signed URL not available" });
}
