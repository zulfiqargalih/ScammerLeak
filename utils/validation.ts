// utils/validation.ts
// Centralized validation helpers for server‑side input validation.
// These functions are deliberately lightweight and avoid external heavy
// dependencies. They return an error string when validation fails, or null
// when the value is acceptable.

/** Validate a title string.
 *  - non‑empty
 *  - max length 150 characters
 *  - allowed characters: letters, numbers, spaces, basic punctuation.
 */
export function validateTitle(title: unknown): string | null {
  if (typeof title !== "string" || title.trim().length === 0) {
    return "Title must be a non‑empty string.";
  }
  const trimmed = title.trim();
  if (trimmed.length > 150) {
    return "Title exceeds maximum length of 150 characters.";
  }
  const allowed = /^[a-zA-Z0-9\s.,!?\-_'"()]+$/;
  if (!allowed.test(trimmed)) {
    return "Title contains disallowed characters.";
  }
  return null;
}

/** Validate chronology/content.
 *  - non‑empty string
 *  - max length 5000 characters
 */
export function validateChronology(chronology: unknown): string | null {
  if (typeof chronology !== "string" || chronology.trim().length === 0) {
    return "Chronology must be a non‑empty string.";
  }
  if (chronology.length > 5000) {
    return "Chronology exceeds maximum length of 5000 characters.";
  }
  return null;
}

/** Validate e‑wallet details.
 *  Accepts a string or object containing numbers/IDs.
 *  - If a DANA/OVO/GoPay/LinkAja/ShopeePay number: 10‑15 digits.
 *  - If a QRIS code: 8‑12 alphanumeric uppercase characters.
 */
/**
 * Validate e‑wallet details.
 *
 * The original implementation accepted only a plain numeric string (10‑15 digits)
 * for DANA/OVO/GoPay/LinkAja/ShopeePay or an uppercase alphanumeric QRIS code.
 * In practice users often include a provider label or extra characters, e.g.
 * "E‑WalletOVO — 082145454545". To make the validation more tolerant while still
 * enforcing the required formats, we now:
 *   1. Strip all non‑digit characters when checking numeric wallets.
 *   2. Keep the strict QRIS regex unchanged.
 *   3. Return an error only if neither format matches after cleaning.
 */
export function validateEwalletDetails(details: unknown): string | null {
  if (!details) return null; // optional field
  const raw = String(details).trim();
  // Remove any non‑digit characters (spaces, dashes, provider text, etc.)
  const digitsOnly = raw.replace(/\D/g, "");
  const danaRegex = /^\d{10,15}$/;
  const qrisRegex = /^[A-Z0-9]{8,12}$/;
  if (danaRegex.test(digitsOnly) || qrisRegex.test(raw)) {
    return null;
  }
  return "E‑wallet details are not in a recognized format.";
}

/** Simple in‑memory rate limiter per IP.
 *  Allows `maxRequests` within `windowMs` milliseconds.
 *  Returns true if the request should be allowed, false otherwise.
 */
type RateRecord = { timestamps: number[] };
const rateMap = new Map<string, RateRecord>();
export function allowRequest(ip: string, maxRequests = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = rateMap.get(ip) ?? { timestamps: [] };
  // Remove timestamps older than window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
  if (record.timestamps.length >= maxRequests) {
    rateMap.set(ip, record);
    return false;
  }
  record.timestamps.push(now);
  rateMap.set(ip, record);
  return true;
}
