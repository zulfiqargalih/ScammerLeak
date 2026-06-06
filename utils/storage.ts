/**
 * Supabase Storage utility functions
 */

/**
 * Extracts the object path from a full Supabase Storage URL.
 * 
 * Converts from:
 * https://PROJECT.supabase.co/storage/v1/object/sign/report-images/path/to/file.png?token=...
 * 
 * To:
 * path/to/file.png
 * 
 * If the input is already a path (doesn't start with http), returns it as-is.
 */
export function extractObjectPath(url: string, bucketName: string = "report-images"): string {
  // If it's already a path (doesn't start with http), return as-is
  if (!url.startsWith("http")) {
    return url;
  }

  // Extract from full URL: find bucket name and extract everything after it
  const marker = `/${bucketName}/`;
  const idx = url.indexOf(marker);

  if (idx === -1) {
    // Fallback: try to extract from generic storage URL pattern
    const storagePattern = /\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+?)(?:\?|$)/;
    const match = url.match(storagePattern);
    return match ? decodeURIComponent(match[1]) : url;
  }

  // Extract path after bucket name and remove query params
  return decodeURIComponent(
    url
      .substring(idx + marker.length)
      .split("?")[0]
  );
}

/**
 * Generates a storage path for a new file upload.
 * 
 * Format: bucket-category/{userId}/{filename}
 * Uses UUID for filename to ensure uniqueness.
 */
export function generateStoragePath(
  userId: string,
  category: string,
  extension: string
): string {
  // Remove the leading dot from extension if present
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  
  // Generate a UUID-like identifier (simple version)
  const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return `${category}/${userId}/${uuid}${ext}`;
}
