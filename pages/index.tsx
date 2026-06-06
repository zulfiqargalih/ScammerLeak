// pages/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "../components/LoadingSpinner";
import StatCard from "../components/StatCard";
import FilterChips from "../components/FilterChips";
import Head from "next/head";
import {
  ClipboardList,
  Heart,
  Wallet,
  Smartphone,
  FileText,
  Mail,
  CreditCard,
  Users,
  Shield,
  PenLine,
  Search,
  Inbox,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface Report {
  id: string;
  title: string;
  chronology: string;
  ewalletDetails?: string;
  evidenceUrls: string[];
  userName: string;
  createdAt: string;
}

interface Stats {
  totalReports: number;
  totalSubmissions: number;
  uniqueProviders: number;
  uniqueReporters: number;
}

const FILTER_OPTIONS = [
  { label: "Semua", value: "all", icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { label: "DANA", value: "DANA", icon: <Wallet className="w-3.5 h-3.5 text-blue-400" /> },
  { label: "OVO", value: "OVO", icon: <Wallet className="w-3.5 h-3.5 text-purple-400" /> },
  { label: "GoPay", value: "GOPAY", icon: <Wallet className="w-3.5 h-3.5 text-green-400" /> },
  { label: "LinkAja", value: "LINKAJA", icon: <Wallet className="w-3.5 h-3.5 text-red-400" /> },
  { label: "ShopeePay", value: "SHOPEEPAY", icon: <Wallet className="w-3.5 h-3.5 text-orange-400" /> },
  { label: "QRIS", value: "QRIS", icon: <Smartphone className="w-3.5 h-3.5" /> },
];

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    totalSubmissions: 0,
    uniqueProviders: 0,
    uniqueReporters: 0,
  });

  useEffect(() => {
    fetchApprovedReports();
    fetchStats();
  }, []);

  useEffect(() => {
    let result = reports;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((report) =>
        report.title.toLowerCase().includes(query) ||
        report.chronology.toLowerCase().includes(query) ||
        (report.ewalletDetails && report.ewalletDetails.toLowerCase().includes(query))
      );
    }

    // Apply chip filter
    if (activeFilter !== "all") {
      result = result.filter((report) => {
        if (activeFilter === "QRIS") {
          // Reports without ewallet details are QRIS-only
          return !report.ewalletDetails || report.ewalletDetails === "";
        }
        return report.ewalletDetails?.toUpperCase().includes(activeFilter);
      });
    }

    setFilteredReports(result);
  }, [searchQuery, reports, activeFilter]);

  const fetchApprovedReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Gagal mengambil data dari database.");
      const data = await res.json();
      setReports(data);
      setFilteredReports(data);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat laporan.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Silently fail — stats are supplementary
    }
  };

  return (
    <>
      <Head>
        <title>Database Pengaduan Scammer Terverifikasi | Laporkan QRIS &amp; E-Wallet Palsu</title>
        <meta
          name="description"
          content="Portal pengaduan online aman, transparan, dan terverifikasi untuk melacak scammer, QRIS palsu, dan akun e-wallet bodong di Indonesia."
        />
        <meta name="keywords" content="pengaduan scammer, QRIS palsu, e-wallet bodong, penipuan online, laporan scammer" />
        <meta property="og:title" content="Pengaduan Scammer — Database Terverifikasi" />
        <meta property="og:description" content="Laporkan dan lacak scammer QRIS & E-Wallet. Platform publik terverifikasi admin." />
      </Head>

      <div className="space-y-16 animate-fade-in">

        {/* ── Hero Section ── */}
        <section className="relative text-center max-w-4xl mx-auto pt-12 pb-4 space-y-8">
          {/* Dot grid decoration */}
          <div className="absolute inset-0 dot-pattern opacity-50 pointer-events-none rounded-3xl" aria-hidden="true" />

          {/* Badge */}
          <div className="relative">
            <span className="badge-emerald animate-glow-pulse px-4 py-1.5 text-[11px] inline-flex items-center gap-1.5">
              <Shield className="w-3 h-3" aria-hidden="true" />
              Platform Keamanan Siber Publik
            </span>
          </div>

          {/* Headline */}
          <div className="relative space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Laporkan &amp; Lacak <br className="hidden sm:inline" />
              <span className="gradient-text">
                Scammer QRIS &amp; E-Wallet
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
              Bantu sesama dengan melaporkan QRIS, e-wallet, dan postingan palsu buatan scammer.
              Laporan Anda ditinjau admin secara profesional sebelum dipublikasikan untuk menghindari fitnah.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 relative">
            <Link href="/report" className="btn-primary !px-7 !py-3.5">
              <PenLine className="w-4 h-4" aria-hidden="true" />
              <span>Buat Laporan Pengaduan</span>
            </Link>
            <a href="#database" className="btn-ghost !px-7 !py-3.5">
              <Search className="w-4 h-4" aria-hidden="true" />
              <span>Telusuri Database</span>
            </a>
          </div>

          {/* Live Stats */}
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-2xl mx-auto">
            <StatCard
              value={stats.totalReports > 0 ? `${stats.totalReports}+` : "—"}
              label="Laporan Terverifikasi"
              icon={<FileText className="w-5 h-5" />}
              accent="blue"
            />
            <StatCard
              value={stats.totalSubmissions > 0 ? `${stats.totalSubmissions}+` : "—"}
              label="Total Pengaduan"
              icon={<Mail className="w-5 h-5" />}
              accent="emerald"
            />
            <StatCard
              value={stats.uniqueProviders > 0 ? stats.uniqueProviders : "—"}
              label="E-Wallet Terlacak"
              icon={<CreditCard className="w-5 h-5" />}
              accent="amber"
            />
            <StatCard
              value={stats.uniqueReporters > 0 ? `${stats.uniqueReporters}+` : "—"}
              label="Pelapor Aktif"
              icon={<Users className="w-5 h-5" />}
              accent="blue"
            />
          </div>
        </section>

        {/* ── Database Section ── */}
        <section id="database" className="space-y-6 scroll-mt-20">

          {/* Section Header */}
          <div className="flex flex-col gap-5 border-b border-white/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h2 className="text-xl font-bold text-white">Database Pengaduan Terverifikasi</h2>
                  {filteredReports.length > 0 && (
                    <span className="badge-blue !text-[10px] !px-2 !py-0.5">
                      {filteredReports.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">Mencakup pelaku penipuan QRIS dan E-Wallet yang telah diverifikasi admin.</p>
              </div>

              {/* Search Input */}
              <div className="relative w-full md:max-w-xs">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5"
                  aria-hidden="true"
                />
                <label htmlFor="search-reports" className="sr-only">Cari laporan scammer</label>
                <input
                  id="search-reports"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kata kunci, nomor HP..."
                  className="input-base !pl-10 !text-xs"
                  aria-label="Cari laporan scammer"
                />
              </div>
            </div>

            {/* Filter Chips */}
            <FilterChips
              options={FILTER_OPTIONS}
              selected={activeFilter}
              onChange={setActiveFilter}
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="alert-error text-center flex items-center justify-center gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Content Area */}
          {loading ? (
            <div className="flex justify-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="glass bg-slate-900/20 p-16 text-center rounded-2xl border border-white/5 animate-fade-in">
              <div className="flex justify-center mb-4 animate-float">
                <Inbox className="w-12 h-12 text-slate-600" aria-hidden="true" />
              </div>
              <p className="text-slate-400 text-base font-medium">
                {searchQuery || activeFilter !== "all"
                  ? "Tidak ada laporan yang cocok dengan filter Anda."
                  : "Belum ada laporan terverifikasi. Jadilah yang pertama!"}
              </p>
              {(searchQuery || activeFilter !== "all") && (
                <button
                  onClick={() => { setSearchQuery(""); setActiveFilter("all"); }}
                  className="mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
                >
                  Hapus semua filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
              {filteredReports.map((report, index) => {
                const dateFormatted = new Date(report.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });

                return (
                  <article
                    key={report.id}
                    className="glass bg-slate-900/30 rounded-2xl border border-white/8 flex flex-col
                               hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Left accent border */}
                    <div className="h-0.5 w-full bg-gradient-to-r from-blue-500/60 via-emerald-500/60 to-transparent" aria-hidden="true" />

                    <div className="p-5 flex flex-col flex-1 space-y-4">
                      {/* Meta row */}
                      <div className="flex items-center justify-between">
                        <span className="badge-emerald !text-[9px] !px-2 !py-0.5 inline-flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" aria-hidden="true" />
                          Terverifikasi
                        </span>
                        <time className="text-[10px] text-slate-500" dateTime={report.createdAt}>
                          {dateFormatted}
                        </time>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">
                        {report.title}
                      </h3>

                      {/* Snippet */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed flex-1">
                        {report.chronology}
                      </p>

                      {/* E-Wallet badge */}
                      {report.ewalletDetails && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold
                                        bg-emerald-950/20 border border-emerald-500/15 rounded-lg px-3 py-2">
                          <CreditCard className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="line-clamp-1">{report.ewalletDetails}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-4 border-t border-white/5 pt-3.5 flex items-center justify-between text-xs text-slate-500">
                      <span>Pelapor: <span className="text-slate-400">{report.userName}</span></span>
                      <Link
                        href={`/report/${report.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-400
                                   hover:text-blue-300 transition-colors group"
                        aria-label={`Lihat detail laporan: ${report.title}`}
                      >
                        <span>Lihat Detail</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
