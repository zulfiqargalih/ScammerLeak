// pages/api/upload.ts
// Handles file uploads via Supabase Storage (free tier).
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth } from "../../firebase/admin";
import { supabase } from "../../lib/supabase";
import { parseCookies } from "nookies";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { randomUUID } from "crypto";

// Disable Next.js body parser so formidable can parse multipart/form-data
export const config = {
  api: { bodyParser: false },
};

/** Parse multipart form with formidable */
function parseForm(
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 5 * 1024 * 1024 }); // 5 MB limit
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  // Auth — accept Bearer token or session cookie
  const cookies = parseCookies({ req });
  const authHeader = req.headers.authorization ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const tokenToVerify = bearerToken || cookies.session;

  if (!tokenToVerify) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(tokenToVerify);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  // Validate Supabase Storage config
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "report-images";
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Supabase is not configured on server." });
  }

  try {
    const { files } = await parseForm(req);

    // formidable may return array or single file
    const fileEntry = files.file;
    const rawFile: FormidableFile | undefined = Array.isArray(fileEntry)
      ? fileEntry[0]
      : fileEntry;

    if (!rawFile) {
      return res.status(400).json({ error: "No file received." });
    }

    // Validate MIME type and extension
    const mime = rawFile.mimetype ?? "";
    const allowedMimes = ["image/png", "image/jpeg", "image/webp"]; // whitelist
    if (!allowedMimes.includes(mime)) {
      return res.status(400).json({ error: "Only PNG, JPEG, or WebP images are allowed." });
    }
    const fileExt = path.extname(rawFile.originalFilename || "").toLowerCase();
    const allowedExts = [".png", ".jpg", ".jpeg", ".webp"];
    if (!allowedExts.includes(fileExt)) {
      return res.status(400).json({ error: "Unsupported file extension." });
    }

    const typeLabel = (req.headers["x-file-type"] as string) || "file";
    const fileName = `${typeLabel}_${randomUUID()}${fileExt}`;
    const filePath = `pengaduan-scammer/${uid}/${fileName}`;

    // Read file, re‑encode with sharp to strip metadata and ensure safe format
    const rawBuffer = fs.readFileSync(rawFile.filepath);
    let processedBuffer: Buffer;
    try {
      // Convert extension (e.g., ".png") to Sharp format name (e.g., "png")
      const format = fileExt.replace(".", "") as keyof import('sharp').FormatEnum;
      processedBuffer = await sharp(rawBuffer)
        .rotate() // correct orientation based on EXIF
        .toFormat(format) // keep original format safely typed
        .toBuffer();
    } catch (e) {
      console.error("Sharp processing error:", e);
      return res.status(500).json({ error: "Image processing failed." });
    }

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, processedBuffer, {
        contentType: mime,
        upsert: false,
        // Ensure the object is stored privately (default for Supabase, but explicit for clarity)
        // No public flag is set; we will generate signed URLs when needed.
      });

    // Clean up temp file
    fs.unlinkSync(rawFile.filepath);

    if (error) {
      console.error("[Upload API] Supabase upload error:", error);
      return res.status(500).json({ error: "Supabase upload failed." });
    }


    // Return only the storage path. The client will request a signed URL via the /api/image endpoint when needed.
    return res.status(200).json({ path: data.path });
  } catch (err: any) {
    console.error("[Upload API] Error:", err);
    return res.status(500).json({ error: err.message ?? "Upload failed." });
  }
}
