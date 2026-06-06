import { useEffect, useState } from "react";
import EvidenceImage from "../../components/EvidenceImage";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebase/client";
import Link from "next/link";
import LoadingSpinner from "../../components/LoadingSpinner";
import Head from "next/head";
import { Lock, XCircle, CheckCircle, Clock, AlertTriangle, RefreshCw, ZoomIn, X } from "lucide-react";

// Define action types for review
type ActionType = "approve" | "reject";

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; action: ActionType } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) fetchPendingReports();
      else setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchPendingReports = async () => {
    setLoadingReports(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/review");
      if (res.status === 403 || res.status === 401) {
        setIsAdmin(false);
      } else if (res.ok) {
        setReports(await res.json());
        setIsAdmin(true);
      } else {
        const d = await res.json();
        throw new Error(d.error || "Gagal memuat daftar antrean.");
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat laporan.");
    } finally {
      setLoadingReports(false);
      setAuthLoading(false);
    }
  };

  const handleReview = async (reportId: string, action: ActionType) => {
    setConfirm(null);
    setActionLoading(reportId);
    setError(null);
    try {
      const res = await fetch("/api/admin/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Gagal memproses tindakan.");
      }
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan.");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  if (!user) return (
    <>
      <Head><title>Admin — Pengaduan Scammer</title></Head>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md glass bg-slate-900/50 p-10 rounded-2xl border border-white/10 text-center animate-slide-up">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 bg-slate-800/80 border border-white/10 rounded-full flex items-center justify-center">
              <Lock className="w-7 h-7 text-slate-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Akses Terbatas</h2>
          <p className="text-slate-400 mb-7 text-sm">Area khusus admin. Silakan masuk terlebih dahulu.</p>
          <Link href="/login" className="btn-primary">Masuk dengan Google</Link>
        </div>
      </div>
    </>
  );

  if (!isAdmin) return (
    <>
      <Head><title>Akses Ditolak — Pengaduan Scammer</title></Head>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md glass bg-slate-900/50 p-10 rounded-2xl border border-red-500/20 text-center animate-slide-up">
          <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h2>
          <p className="text-slate-400 mb-7 text-sm">Akun <span className="text-white font-medium">{user?.email}</span> tidak terdaftar dalam whitelist admin.</p>
          <Link href="/" className="btn-ghost !text-xs !py-2.5">Kembali ke Beranda</Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Head>
        <title>Moderasi Pengaduan — Panel Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {/* Confirmation Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
          <div className="glass bg-slate-900/90 p-7 rounded-2xl border border-white/12 max-w-sm w-full text-center animate-slide-up">
            <div className={`flex justify-center mb-4 ${confirm.action === "approve" ? "text-emerald-400" : "text-red-400"}`}>
              {confirm.action === "approve" ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {confirm.action === "approve" ? "Setujui Laporan?" : "Tolak Laporan?"}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {confirm.action === "approve"
                ? "Laporan ini akan dipublikasikan dan dapat dilihat publik."
                : "Laporan ini akan dihapus secara permanen dan tidak dapat dipulihkan."}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirm(null)} className="btn-ghost !text-xs !py-2">Batal</button>
              <button onClick={() => handleReview(confirm.id, confirm.action)}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all ${confirm.action === "approve" ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90" : "bg-red-500/80 hover:bg-red-500"}`}
              >
                Ya, {confirm.action === "approve" ? "Setujui" : "Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold gradient-text mb-1">Moderasi Pengaduan</h1>
            <p className="text-sm text-slate-400">Tinjau bukti QRIS, screenshot, dan kronologi sebelum dipublikasikan.</p>
          </div>
          <div className="flex items-center gap-3">
            {reports.length > 0 && (<span className="badge-amber">{reports.length} Menunggu</span>)}
            <button onClick={fetchPendingReports} disabled={loadingReports}
              className="btn-ghost !text-xs !px-4 !py-2 disabled:opacity-50 inline-flex items-center gap-2">
              {loadingReports ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Segarkan</span>
            </button>
            <Link href="/admin/posts" className="btn-ghost !text-xs !px-4 !py-2 inline-flex items-center gap-2">Kelola Semua Posting</Link>
          </div>
        </div>

        {error && (
          <div className="alert-error mb-6 text-center flex items-center justify-center gap-2" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loadingReports ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="md" /></div>
        ) : reports.length === 0 ? (
          <div className="glass bg-slate-900/20 p-16 text-center rounded-2xl border border-white/5">
            <div className="flex justify-center mb-4 animate-float">
              <CheckCircle className="w-12 h-12 text-emerald-500/60" />
            </div>
            <p className="text-slate-400 text-sm">Semua bersih! Tidak ada laporan yang menunggu peninjauan.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {reports.map((report) => (
              <div key={report.id} className="glass bg-slate-900/30 rounded-2xl border border-white/8 overflow-hidden hover:border-white/12 transition-all duration-300">
                <div className="h-0.5 w-full bg-gradient-to-r from-amber-500/70 via-amber-400/40 to-transparent" aria-hidden="true" />
                <div className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <span className="badge-amber inline-flex items-center gap-1.5"><Clock className="w-3 h-3" /> Menunggu Peninjauan</span>
                      <h3 className="text-base font-bold text-white">{report.title}</h3>
                    </div>
                    <div className="text-right shrink-0 text-xs text-slate-400">
                      <p>Pelapor: <span className="text-white font-medium">{report.userName}</span></p>
                      <p className="text-[10px] text-slate-500">{report.userEmail}</p>
                      <p className="text-[10px] text-slate-600 mt-1">{new Date(report.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                  {/* Chronology */}
                  <div className="space-y-1.5"><h4 className="section-label">Kronologi Kejadian</h4><p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">{report.chronology}</p></div>
                  {/* E-Wallet Details */}
                  {report.ewalletDetails && (
                    <div className="bg-slate-950/40 border border-emerald-500/15 rounded-xl p-4"><h4 className="section-label mb-1.5">Detail Akun E-Wallet</h4><p className="text-sm text-emerald-400 font-semibold">{report.ewalletDetails}</p></div>
                  )}
                  {/* Evidence Images */}
                  {report.evidenceUrls?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="section-label">Bukti Fisik / Screenshot</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {report.evidenceUrls.map((url: string, idx: number) => (
                          // Existing reports may still contain full Supabase signed URLs.
                          // If the URL starts with "http", render it directly.
                          // Otherwise treat it as a storage path and use the secure EvidenceImage component.
                          url.startsWith("http") ? (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/40 transition-colors block bg-slate-950/40 p-2 group">
                              <img src={url} alt={`Bukti ${idx + 1}`} className="max-h-[180px] w-full object-contain rounded-lg" />
                              <p className="text-[10px] text-slate-600 group-hover:text-white text-center mt-2 flex items-center justify-center gap-1"><ZoomIn className="w-3 h-3" /> Klik untuk memperbesar</p>
                            </a>
                          ) : (
                            <EvidenceImage key={idx} path={url} index={idx} />
                          )
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="flex justify-end items-center gap-3 border-t border-white/5 pt-4">
                    <button disabled={actionLoading !== null} onClick={() => setConfirm({ id: report.id, action: "reject" })} className="px-5 py-2 text-xs font-bold text-red-400 border border-red-400/25 hover:border-red-400/50 hover:bg-red-400/8 rounded-xl transition-all disabled:opacity-40 inline-flex items-center gap-1.5" aria-label={`Tolak laporan: ${report.title}`}>
                      {actionLoading === report.id ? <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <><X className="w-3.5 h-3.5" /> Tolak</>}
                    </button>
                    <button disabled={actionLoading !== null} onClick={() => setConfirm({ id: report.id, action: "approve" })} className="px-5 py-2 text-xs font-bold text-slate-900 bg-gradient-to-r from-emerald-400 to-teal-400 hover:opacity-90 rounded-xl transition-all disabled:opacity-40 shadow-md shadow-emerald-500/15 inline-flex items-center gap-1.5" aria-label={`Setujui laporan: ${report.title}`}>
                      {actionLoading === report.id ? <div className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Setujui &amp; Publish</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
