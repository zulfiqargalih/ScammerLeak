// lib/supabase.ts
// Server-side Supabase client — gunakan HANYA di API routes (server side).
// Menggunakan service_role key agar bisa bypass RLS dan akses penuh ke database.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[Supabase] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi. " +
    "Pastikan sudah mengisi .env.local."
  );
}

/**
 * Supabase admin client (server-side only).
 * Gunakan ini di semua pages/api/* — jangan import di komponen React.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // Nonaktifkan auto-refresh token — ini server-side, tidak butuh session
    persistSession: false,
    autoRefreshToken: false,
  },
});
