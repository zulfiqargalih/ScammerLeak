// pages/report/[id].tsx
import { GetServerSideProps } from "next";
import { adminFirestore } from "../../firebase/admin";
import { extractObjectPath } from "../../utils/storage";
import Link from "next/link";
import Head from "next/head";
import { useState } from "react";
import { ZoomIn } from "lucide-react";

/**
 * Component to display evidence images via report-specific proxy endpoint.
 * Uses /api/report/[reportId]/image/[index] which:
 * 1. Authenticates the user
 * 2. Verifies report is approved
 * 3. Fetches and proxies the image (Supabase URL never exposed to client)
 */
function EvidenceImageDisplay({ 
  reportId, 
  imageIndex, 
  objectPath 
}: { 
  reportId: string; 
  imageIndex: number; 
  objectPath: string;
}) {
  const [showModal, setShowModal] = useState(false);
  
  // Construct URL that won't expose Supabase details or token
  // User will see: /api/report/[reportId]/image/[index]
  const imageUrl = `/api/report/${reportId}/image/${imageIndex}`;

  return (
    <>
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors block bg-slate-950/40 p-3 group cursor-pointer"
        onClick={(e) => {
          // Allow modal preview on same page
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            setShowModal(true);
          }
        }}
      >
        <img
          src={imageUrl}
          alt={`Bukti Scammer ${imageIndex + 1}`}
          className="max-h-[260px] w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
        />
        <p className="text-[10px] text-slate-500 text-center block mt-3 hover:text-white transition-colors flex items-center justify-center gap-1">
          <ZoomIn className="w-3 h-3" /> Klik untuk lihat full atau buka di tab baru
        </p>
      </a>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <img
            src={imageUrl}
            alt={`Bukti Scammer ${imageIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}

interface ReportProps {
  report: {
    id: string;
    title: string;
    chronology: string;
    ewalletDetails?: string;
    evidenceUrls: string[]; // storage object paths (NOT signed URLs)
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
                {report.evidenceUrls.map((objectPath, idx) => (
                  <EvidenceImageDisplay 
                    key={idx} 
                    reportId={report.id}
                    imageIndex={idx}
                    objectPath={objectPath} 
                  />
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

    // evidenceUrls may be stored as storage paths (private) or full signed URLs from old records.
    // Extract object paths and pass to component, which will use /api/image/ endpoint
    const rawEvidence = (data.evidenceUrls || []) as (string | null)[];
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "report-images";
    console.log("[Report SSP] Raw evidence from DB:", rawEvidence);
    
    const evidenceUrls = rawEvidence
      .filter((p): p is string => typeof p === "string" && p !== null)
      .map((p) => {
        console.log("[Report SSP] Processing evidence item:", p);
        
        // Extract object path from whatever is stored (handles both full URLs and paths)
        const objectPath = extractObjectPath(p, bucketName);
        console.log("[Report SSP] Extracted object path:", objectPath);
        
        return objectPath;
      });
    
    console.log("[Report SSP] Final object paths:", evidenceUrls);

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
