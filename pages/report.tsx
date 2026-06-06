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
  X,
  Plus,
} from "lucide-react";

const STEPS = ["Info Kasus", "Bukti & Identitas", "Kirim"];
const MAX_CHARS = 2000;
const MAX_FILES = 7;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

interface EvidenceFile {
  file: File;
  preview: string;
  uploadProgress?: number;
}

export default function Report() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [title, setTitle] = useState("");
  const [chronology, setChronology] = useState("");
  const [hasEwallet, setHasEwallet] = useState(false);
  const [ewalletProvider, setEwalletProvider] = useState("");
  const [ewalletAccount, setEwalletAccount] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;

    const newFiles: EvidenceFile[] = [];
    const totalFiles = evidenceFiles.length + files.length;

    if (totalFiles > MAX_FILES) {
      setError(`Maksimal ${MAX_FILES} gambar yang diizinkan.`);
      return;
    }

    Array.from(files).forEach((file) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" melebihi 5MB.`);
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" bukan file gambar.`);
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenceFiles((prev) => [
          ...prev,
          {
            file,
            preview: reader.result as string,
            uploadProgress: 0,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    setError(null);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Upload a single file to /api/upload (Supabase Storage via server-side upload).
   * Returns the storage object path (not a signed URL).
   */
  const uploadFile = async (file: File, fileIndex: number): Promise<string> => {
    if (!user) throw new Error("Not authenticated");

    const idToken = await user.getIdToken();
    const formData = new FormData();
    formData.append("file", file);

    // Update progress
    setEvidenceFiles((prev) => {
      const updated = [...prev];
      if (updated[fileIndex]) updated[fileIndex].uploadProgress = 10;
      return updated;
    });

    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "x-file-type": `evidence_${fileIndex}`,
      },
      body: formData,
    });

    setEvidenceFiles((prev) => {
      const updated = [...prev];
      if (updated[fileIndex]) updated[fileIndex].uploadProgress = 90;
      return updated;
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? `Upload gagal (${res.status})`);
    }

    const { path } = await res.json();

    setEvidenceFiles((prev) => {
      const updated = [...prev];
      if (updated[fileIndex]) updated[fileIndex].uploadProgress = 100;
      return updated;
    });

    return path;
  };

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!title.trim()) return "Judul kasus wajib diisi.";
      if (!chronology.trim()) return "Kronologi kejadian wajib diisi.";
    }
    if (step === 1) {
      // At least one evidence is required
      if (evidenceFiles.length === 0)
        return "Sertakan minimal satu bukti gambar (screenshot, foto QRIS, dll).";
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
      // Upload all evidence files to Supabase Storage
      const evidenceUrls: string[] = [];
      
      for (let i = 0; i < evidenceFiles.length; i++) {
        const path = await uploadFile(evidenceFiles[i].file, i);
        evidenceUrls.push(path);
      }

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
    setEvidenceFiles([]);
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

              {/* Evidence Upload - Multiple Files */}
              <div className="glass bg-slate-900/30 p-6 rounded-2xl border border-white/8 space-y-4">
                <div>
                  <label htmlFor="evidence-upload" className="section-label block">
                    Bukti Gambar <span className="text-red-400">*</span>
                  </label>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload hingga {MAX_FILES} gambar (screenshot, foto QRIS, bukti chat, dll)
                  </p>
                </div>

                {/* Upload Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className={`flex flex-col items-center justify-center rounded-xl p-6 border-2 border-dashed transition-all relative cursor-pointer ${
                    isDragging
                      ? "border-blue-500/70 bg-blue-500/5"
                      : "border-white/10 hover:border-white/25 bg-slate-950/40"
                  }`}
                >
                  <input
                    id="evidence-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => addFiles(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={evidenceFiles.length >= MAX_FILES}
                    aria-label="Upload evidence images"
                  />
                  <div className="text-center space-y-2 pointer-events-none">
                    <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                    <div>
                      <p className="text-sm text-slate-300">
                        Klik atau drag & drop gambar
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        Maks. {MAX_FILES} file · 5MB/file · JPG, PNG, WEBP
                      </p>
                    </div>
                  </div>
                </div>

                {/* File List */}
                {evidenceFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400">
                      {evidenceFiles.length} / {MAX_FILES} file
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {evidenceFiles.map((item, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-lg overflow-hidden bg-slate-950/60 border border-white/10"
                        >
                          <img
                            src={item.preview}
                            alt={`Preview ${idx + 1}`}
                            className="w-full aspect-square object-cover"
                          />
                          {/* Upload Progress */}
                          {item.uploadProgress !== undefined && item.uploadProgress > 0 && item.uploadProgress < 100 && (
                            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                              <div className="text-xs text-white font-medium">
                                {item.uploadProgress}%
                              </div>
                            </div>
                          )}
                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            disabled={submitting}
                            className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Remove file ${idx + 1}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {/* File index badge */}
                          <div className="absolute bottom-1 left-1 bg-slate-900/80 text-slate-300 text-[10px] px-2 py-0.5 rounded">
                            #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                      dd: evidenceFiles.length > 0 
                        ? `${evidenceFiles.length} gambar`
                        : "Tidak ada",
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
