// pages/report/[id].tsx
import { GetServerSideProps } from "next";
import { adminFirestore } from "../../firebase/admin";
import Link from "next/link";
import Head from "next/head";

interface ReportProps {
  report: {
    id: string;
    title: string;
    chronology: string;
    ewalletDetails?: string;
    evidenceUrls: string[];
    userName: string;
    createdAt: string;
  };
}

export default function ReportDetail({ report }: ReportProps) {
  const dateFormatted = new Date(report.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <Head>
        <title>{report.title} | Pengaduan Scammer</title>
        <meta name="description" content={`Detail kasus penipuan: ${report.title}. Diadukan secara aman.`} />
      </Head>

      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center space-x-1.5"
          >
            <span>← Kembali ke Beranda</span>
          </Link>
        </div>

        <div className="glass bg-slate-900/30 p-8 border border-white/10 rounded-2xl space-y-6">
          {/* Header */}
          <div className="border-b border-white/5 pb-6">
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-2 py-0.5 inline-block uppercase tracking-wider mb-3">
              Terverifikasi Admin
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {report.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs text-slate-400">
              <p>Oleh pelapor: <span className="text-white font-medium">{report.userName}</span></p>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <p>{dateFormatted} WIB</p>
            </div>
          </div>

          {/* Chronology */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Kronologi Kejadian
            </h3>
            <p className="text-sm sm:text-base text-slate-300 whitespace-pre-line leading-relaxed">
              {report.chronology}
            </p>
          </div>

          {/* E-Wallet Details */}
          {report.ewalletDetails && (
            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Kategori E‑Wallet & Nomor / ID Merchant
              </h3>
              <p className="text-sm font-semibold text-emerald-400">
                {(() => {
                  // Expected format: "E-Wallet: PROVIDER - ACCOUNT"
                  const match = report.ewalletDetails?.match(/E-Wallet:\s*([^-]+)-\s*(.*)/i);
                  if (match) {
                    const provider = match[1].trim();
                    const account = match[2].trim();
                    return `${provider}: ${account}`;
                  }
                  // Fallback to raw string if format differs
                  return report.ewalletDetails;
                })()}
              </p>
            </div>
          )}

          {/* Evidence Gallery */}
          {report.evidenceUrls && report.evidenceUrls.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Barang Bukti Transaksi / Chat
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {report.evidenceUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors block bg-slate-950/40 p-3 group"
                  >
                    <img
                      src={url}
                      alt={`Bukti Scammer ${idx + 1}`}
                      className="max-h-[260px] w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <span className="text-[10px] text-slate-500 text-center block mt-3 hover:text-white transition-colors">
                      🔍 Klik untuk memperbesar bukti
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params || {};
  if (!id || typeof id !== "string") {
    return { notFound: true };
  }

  try {
    const docRef = adminFirestore.collection("reports").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { notFound: true };
    }

    const data = docSnap.data();
    if (!data || data.status !== "approved") {
      // Make sure pending/rejected reports are secure and private
      return { notFound: true };
    }

    // evidenceUrls sudah berupa URL publik (Supabase Storage atau Cloudinary)
    // Tidak perlu generate signed URL lagi
    const evidenceUrls = (data.evidenceUrls || []) as string[];

    return {
      props: {
        report: {
          id: docSnap.id,
          title: data.title,
          chronology: data.chronology,
          ewalletDetails: data.ewalletDetails || "",
          evidenceUrls: evidenceUrls.filter(Boolean),
          userName: data.userName,
          createdAt: data.createdAt,
        },
      },
    };
  } catch (err) {
    console.error("Error in getServerSideProps:", err);
    return { notFound: true };
  }
};
