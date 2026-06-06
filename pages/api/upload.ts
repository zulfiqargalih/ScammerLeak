// pages/api/upload.ts
// Handles file uploads via Supabase Storage (free tier).
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuth } from "../../firebase/admin";
import { supabase } from "../../lib/supabase";
import { parseCookies } from "nookies";
import formidable, { File as FormidableFile } from "formidable";
import fs from "fs";
import path from "path";

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

    // Validate MIME type
    const mime = rawFile.mimetype ?? "";
    if (!mime.startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are allowed." });
    }

    const typeLabel = (req.headers["x-file-type"] as string) || "file";
    const fileExt = path.extname(rawFile.originalFilename || "").toLowerCase() || ".jpg";
    const fileName = `${typeLabel}_${Date.now()}${fileExt}`;
    const filePath = `pengaduan-scammer/${uid}/${fileName}`;

    // Read file and upload to Supabase Storage
    const fileBuffer = fs.readFileSync(rawFile.filepath);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: mime,
        upsert: false,
      });

    // Clean up temp file
    fs.unlinkSync(rawFile.filepath);

    if (error) {
      console.error("[Upload API] Supabase upload error:", error);
      return res.status(500).json({ error: "Supabase upload failed." });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return res.status(200).json({
      url: publicUrl,        // public HTTPS URL, stored in Firestore
      path: data.path,       // Supabase storage path
    });
  } catch (err: any) {
    console.error("[Upload API] Error:", err);
    return res.status(500).json({ error: err.message ?? "Upload failed." });
  }
}
