// pages/login.tsx
import { useState } from "react";
import { loginWithGoogle, sendTokenToServer } from "../utils/auth";
import { useRouter } from "next/router";
import Head from "next/head";
import { Lock, Eye, Shield, AlertTriangle } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const userCredentials = await loginWithGoogle();
      await sendTokenToServer(userCredentials.idToken);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Gagal masuk menggunakan Google Account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Masuk — Pengaduan Scammer</title>
        <meta name="description" content="Masuk dengan Google untuk melaporkan scammer QRIS dan E-Wallet di Indonesia." />
      </Head>

      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md animate-slide-up">

          {/* Glow card wrapper */}
          <div className="relative">
            {/* Background glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-70" aria-hidden="true" />

            <div className="relative glass bg-slate-900/70 p-8 rounded-2xl border border-white/10 flex flex-col items-center text-center">

              {/* Animated shield icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/30
                              flex items-center justify-center mb-6 animate-glow-pulse">
                <svg className="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
              </div>

              <h1 className="text-2xl font-extrabold gradient-text mb-2">Masuk Akun</h1>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed max-w-xs">
                Untuk menjaga keaslian laporan, pelapor wajib masuk menggunakan Akun Google.
              </p>

              {error && (
                <div className="alert-error w-full mb-6 text-center flex items-center justify-center gap-2" role="alert">
                  <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50
                           text-slate-900 font-semibold py-3.5 px-6 rounded-xl transition-all
                           shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed
                           active:scale-[0.98]"
                aria-label="Masuk dengan akun Google"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Masuk dengan Google</span>
                  </>
                )}
              </button>

              {/* Trust badges */}
              <div className="mt-8 grid grid-cols-3 gap-3 w-full">
                {[
                  { Icon: Lock, label: "Enkripsi Bcrypt" },
                  { Icon: Eye, label: "Zero Password" },
                  { Icon: Shield, label: "Anonim Penuh" },
                ].map(({ Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/4 border border-white/6">
                    <Icon className="w-5 h-5 text-slate-400" aria-hidden="true" />
                    <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-[10px] text-slate-600 leading-relaxed">
                Kami hanya menyimpan nama dan email publik Google Anda. Kredensial Anda terproteksi sepenuhnya dan tidak pernah disimpan dalam bentuk asli.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
