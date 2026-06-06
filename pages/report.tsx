// pages/report.tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase/client";
import Link from "next/link";
import LoadingSpinner from "../components/LoadingSpinner";
import Head from "next/head";
import {
  Lock,
  CheckCircle,
  Camera,
  ImageIcon,
  AlertTriangle,
  Info,
  Send,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

const STEPS = ["Info Kasus", "Bukti & Identitas", "Kirim"];
const MAX_CHARS = 2000;
// Limited to the six e‑wallet categories required for the new feature.
// QRIS is treated as a provider here to simplify handling in the UI.
const EWALLET_PROVIDERS = [
  "DANA",
  "OVO",
  "GoPay",
  "LinkAja",
  "ShopeePay",
  "QRIS",
];

// Safe static classes for each upload type (avoids Tailwind purging dynamic classes)
const UPLOAD_STYLES = {
  qris: {
    drag: "border-blue-500/70 bg-blue-500/5",
    progress: "bg-blue-500",
  },
  post: {
    drag: "border-emerald-500/70 bg-emerald-500/5",
    progress: "bg-emerald-500",
  },
};

export default function Report() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [title, setTitle] = useState("");
  const [chronology, setChronology] = useState("");
  const [hasEwallet, setHasEwallet] = useState(false);
  const [ewalletProvider, setEwalletProvider] = useState("");
  const [ewalletAccount, setEwalletAccount] = useState("");
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [postFile, setPostFile] = useState<File | null>(null);
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);
  const [postPreview, setPostPreview] = useState<string | null>(null);
  const [qrisDrag, setQrisDrag] = useState(false);
  const [postDrag, setPostDrag] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (file: File | null, type: "qris" | "post") => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file tidak boleh melebihi 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (JPG, PNG, WEBP, dll).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "qris") {
        setQrisFile(file);
        setQrisPreview(reader.result as string);
      } else {
        setPostFile(file);
        setPostPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  /**
   * Upload a single file to /api/upload (Supabase Storage via server-side upload).
   * Returns the public HTTPS URL of the uploaded image.
   */
  const uploadFile = async (file: File, type: string): Promise<string> => {
    if (!user) throw new Error("Not authenticated");

    const idToken = await user.getIdToken();
    const formData = new FormData();
    formData.append("file", file);

    // Show progress indicator
    setUploadProgress((p) => ({ ...p, [type]: 10 }));

    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "x-file-type": type,
      },
      body: formData,
    });

    setUploadProgress((p) => ({ ...p, [type]: 90 }));

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? `Upload gagal (${res.status})`);
    }

    const { url } = await res.json(); // Supabase Storage returns { url, path }
    setUploadProgress((p) => ({ ...p, [type]: 100 }));
    return url;
  };

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!title.trim()) return "Judul kasus wajib diisi.";
      if (!chronology.trim()) return "Kronologi kejadian wajib diisi.";
    }
    if (step === 1) {
      // At least one evidence (QRIS photo or post screenshot) is required
      if (!qrisFile && !postFile)
        return "Sertakan minimal satu bukti gambar (QRIS atau screenshot postingan/chat).";
      // If user toggled E-Wallet, both fields are mandatory
      if (hasEwallet) {
        if (!ewalletProvider) return "Pilih provider E-Wallet terlebih dahulu.";
        if (!ewalletAccount.trim())
          return "Nomor akun E-Wallet wajib diisi.";
      }
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep(currentStep);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Sesi habis. Silakan masuk kembali.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload files to Supabase Storage — returns public URLs
      const evidenceUrls: string[] = [];
      if (qrisFile) evidenceUrls.push(await uploadFile(qrisFile, "qris"));
      if (postFile) evidenceUrls.push(await uploadFile(postFile, "post"));

      if (evidenceUrls.length === 0) {
        throw new Error("Upload gagal. Pastikan file gambar valid dan coba lagi.");
      }

      const ewalletDetails = hasEwallet
        ? `E-Wallet: ${ewalletProvider} - ${ewalletAccount}`
        : "";

      const idToken = await user.getIdToken();

      const res = await fetch("/api/reports", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ title, chronology, ewalletDetails, evidenceUrls }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Gagal mengirimkan laporan (${res.status}).`);
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan yang tidak terduga.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setCurrentStep(0);
    setTitle("");
    setChronology("");
    setHasEwallet(false);
    setEwalletProvider("");
    setEwalletAccount("");
    setQrisFile(null);
    setPostFile(null);
    setQrisPreview(null);
    setPostPreview(null);
    setUploadProgress({});
    setError(null);
  };

  if (authLoading)
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );

  if (!user)
    return (
      <>
        <Head>
          <title>Buat Laporan — Pengaduan Scammer</title>
        </Head>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="max-w-md glass bg-slate-900/50 p-10 rounded-2xl border border-white/10 text-center animate-slide-up">
            <div className="flex justify-center mb-5 animate-float">
              <div className="w-16 h-16 bg-slate-800/80 border border-white/10 rounded-full flex items-center justify-center">
                <Lock className="w-7 h-7 text-slate-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Akses Terbatas
            </h2>
            <p className="text-slate-400 mb-7 text-sm leading-relaxed">
              Anda harus masuk menggunakan Akun Google sebelum membuat pengaduan
              baru.
            </p>
            <Link href="/login" className="btn-primary">
              Masuk dengan Google
            </Link>
          </div>
        </div>
      </>
    );

  if (success)
    return (
      <>
        <Head>
          <title>Laporan Terkirim — Pengaduan Scammer</title>
        </Head>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="max-w-md glass bg-slate-900/50 p-10 rounded-2xl border border-white/10 text-center animate-slide-up">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-glow-pulse">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Laporan Dikirim!
            </h2>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              Laporan Anda berhasil masuk antrean. Tim admin akan melakukan
              verifikasi sebelum laporan dipublikasikan.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link href="/" className="btn-ghost !text-xs !py-2.5">
                Kembali ke Beranda
              </Link>
              <button onClick={resetForm} className="btn-primary !text-xs !py-2.5">
                Buat Laporan Baru
              </button>
            </div>
          </div>
        </div>
      </>
    );

  const uploadFields = [
    {
      type: "qris" as const,
      label: "Foto QRIS Scammer",
      Icon: Camera,
      preview: qrisPreview,
      file: qrisFile,
      drag: qrisDrag,
      setDrag: setQrisDrag,
      progress: uploadProgress.qris,
      styles: UPLOAD_STYLES.qris,
    },
    {
      type: "post" as const,
      label: "Screenshot Postingan / Chat",
      Icon: ImageIcon,
      preview: postPreview,
      file: postFile,
      drag: postDrag,
      setDrag: setPostDrag,
      progress: uploadProgress.post,
      styles: UPLOAD_STYLES.post,
    },
  ];

  return (
    <>
      <Head>
        <title>Buat Laporan Pengaduan — Pengaduan Scammer</title>
        <meta
          name="description"
          content="Laporkan scammer QRIS dan E-Wallet. Ditinjau admin sebelum dipublikasikan."
        />
      </Head>
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold gradient-text mb-2">
            Buat Laporan Pengaduan
          </h1>
          <p className="text-sm text-slate-400">
            Lengkapi formulir dengan bukti kuat untuk mempercepat peninjauan
            admin.
          </p>
        </div>

        {/* Step Indicator */}
        <div
          className="flex items-center gap-2 mb-8"
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemax={STEPS.length}
        >
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center gap-2 transition-all ${
                  i <= currentStep ? "opacity-100" : "opacity-35"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    i < currentStep
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : i === currentStep
                      ? "border-blue-500 text-blue-400 bg-blue-500/10"
                      : "border-white/20 text-slate-600"
                  }`}
                >
                  {i < currentStep ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    i === currentStep ? "text-white" : "text-slate-500"
                  }`}
                >
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px ${
                    i < currentStep ? "bg-emerald-500/50" : "bg-white/10"
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="alert-error mb-6 flex items-start gap-2" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── STEP 0: Info Kasus ── */}
          {currentStep === 0 && (
            <div className="space-y-5 animate-slide-up">
              <div className="glass bg-slate-900/30 p-6 rounded-2xl border border-white/8 space-y-3">
                <label htmlFor="report-title" className="section-label block">
                  Judul Kasus Scam <span className="text-red-400">*</span>
                </label>
                <input
                  id="report-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Penipuan Online Shop Instagram Akun @scam_id"
                  className="input-base"
                  maxLength={150}
                  required
                />
                <p className="text-[10px] text-slate-600 text-right">
                  {title.length}/150
                </p>
              </div>

              <div className="glass bg-slate-900/30 p-6 rounded-2xl border border-white/8 space-y-3">
                <label
                  htmlFor="report-chronology"
                  className="section-label block"
                >
                  Kronologi Kejadian <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="report-chronology"
                  value={chronology}
                  onChange={(e) =>
                    setChronology(e.target.value.slice(0, MAX_CHARS))
                  }
                  rows={7}
                  placeholder="Jelaskan bagaimana penipuan berlangsung..."
                  className="input-base resize-y"
                  required
                />
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-600">
                    Semakin detail, semakin cepat diverifikasi.
                  </span>
                  <span
                    className={
                      chronology.length >= MAX_CHARS * 0.9
                        ? "text-amber-400"
                        : "text-slate-600"
                    }
                  >
                    {chronology.length}/{MAX_CHARS}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  Lanjutkan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Bukti & Identitas ── */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-slide-up">
              {/* E-Wallet Toggle */}
              <div className="glass bg-slate-900/30 p-6 rounded-2xl border border-white/8 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Metode Pembayaran Scammer
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aktifkan jika scammer menggunakan E-Wallet
                    </p>
                  </div>
                  <label
                    className="relative inline-flex items-center cursor-pointer"
                    aria-label="Toggle E-Wallet"
                  >
                    <input
                      type="checkbox"
                      id="has-ewallet"
                      checked={hasEwallet}
                      onChange={() => setHasEwallet((v) => !v)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white transition-colors" />
                  </label>
                </div>

                {hasEwallet && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-slide-up">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ewallet-provider"
                        className="section-label block"
                      >
                        Provider <span className="text-red-400">*</span>
                      </label>
                      <select
                        id="ewallet-provider"
                        value={ewalletProvider}
                        onChange={(e) => setEwalletProvider(e.target.value)}
                        className="input-base"
                        required={hasEwallet}
                      >
                        <option value="" disabled className="bg-slate-900">
                          Pilih E-Wallet
                        </option>
                        {EWALLET_PROVIDERS.map((p) => (
                          <option key={p} value={p} className="bg-slate-900">
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ewallet-account"
                        className="section-label block"
                      >
                        {ewalletProvider === "QRIS" ? "ID Merchant" : "Nomor Akun"} <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="ewallet-account"
                        type="text"
                        value={ewalletAccount}
                        onChange={(e) => setEwalletAccount(e.target.value)}
                        placeholder={ewalletProvider === "QRIS" ? "ID Merchant" : "081234567890"}
                        className="input-base"
                        required={hasEwallet}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Areas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {uploadFields.map(
                  ({ type, label, Icon, preview, file, drag, setDrag, progress, styles }) => (
                    <div
                      key={type}
                      className="glass bg-slate-900/30 p-5 rounded-2xl border border-white/8 flex flex-col gap-3"
                    >
                      <label
                        htmlFor={`${type}-upload`}
                        className="section-label block"
                      >
                        {label}
                      </label>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDrag(true);
                        }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDrag(false);
                          const f = e.dataTransfer.files?.[0];
                          if (f) handleFileChange(f, type);
                        }}
                        className={`flex-1 flex flex-col items-center justify-center rounded-xl p-4 border-2 border-dashed transition-all relative min-h-[140px] cursor-pointer ${
                          drag
                            ? styles.drag
                            : "border-white/10 hover:border-white/25"
                        }`}
                      >
                        <input
                          id={`${type}-upload`}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleFileChange(e.target.files?.[0] || null, type)
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          aria-label={label}
                        />
                        {preview ? (
                          <div className="text-center space-y-2">
                            <img
                              src={preview}
                              alt="Preview"
                              className="max-h-[120px] rounded-lg object-contain mx-auto"
                            />
                            <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {file?.name}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Icon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <span className="text-xs text-slate-500 block">
                              Klik atau drag &amp; drop
                            </span>
                            <span className="text-[10px] text-slate-600 block">
                              Maks. 5MB · JPG, PNG, WEBP
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Upload progress bar */}
                      {(progress ?? 0) > 0 && (progress ?? 0) < 100 && (
                        <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden">
                          <div
                            className={`${styles.progress} h-1 transition-all`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setCurrentStep(0); setError(null); }}
                  className="btn-ghost !text-xs !px-4 !py-2.5 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  Lanjutkan <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Ringkasan & Kirim ── */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-slide-up">
              <div className="glass bg-slate-900/30 p-6 rounded-2xl border border-white/8 space-y-4">
                <h3 className="text-sm font-bold text-white">
                  Ringkasan Laporan
                </h3>
                <dl className="space-y-3 text-xs">
                  {[
                    { dt: "Judul", dd: title },
                    {
                      dt: "Kronologi",
                      dd: (
                        <span className="line-clamp-3">{chronology}</span>
                      ),
                    },
                    ...(hasEwallet
                      ? [
                          {
                            dt: "E-Wallet",
                            dd: (
                              <span className="text-emerald-400">
                                {ewalletProvider} — {ewalletAccount}
                              </span>
                            ),
                          },
                        ]
                      : []),
                    {
                      dt: "Bukti",
                      dd:
                        [
                          qrisFile && "Foto QRIS",
                          postFile && "Screenshot",
                        ]
                          .filter(Boolean)
                          .join(", ") || "Tidak ada",
                    },
                  ].map(({ dt, dd }) => (
                    <div key={dt} className="flex gap-3">
                      <dt className="section-label w-24 shrink-0 pt-0.5">
                        {dt}
                      </dt>
                      <dd className="text-slate-300">{dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="alert-info text-center text-[11px] flex items-center justify-center gap-2">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Laporan ditinjau admin dalam 1×24 jam. Laporan palsu atau
                fitnah akan langsung ditolak.
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setCurrentStep(1); setError(null); }}
                  className="btn-ghost !text-xs !px-4 !py-2.5 inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Laporan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
