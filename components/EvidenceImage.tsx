import { useEffect, useState } from "react";

interface EvidenceImageProps {
  path: string; // storage path returned from API
  index: number;
}

/**
 * Fetches a signed URL for a private Supabase Storage object and renders the image.
 * The signed URL is requested via the /api/image endpoint which validates the user.
 */
export default function EvidenceImage({ path, index }: EvidenceImageProps) {
  const [error, setError] = useState<string | null>(null);

  // The backend endpoint `/api/image/[...path]` will perform authentication,
  // generate a signed URL and issue a 302 redirect. We can use the endpoint
  // directly as the image source. No extra fetch is required.
  const url = `/api/image/${encodeURIComponent(path)}`;

  if (error) {
    return (
      <div className="text-red-500 text-sm">Error loading image</div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-slate-500">Loading…</span>
      </div>
    );
  }

  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Thumbnail */}
      <div
        onClick={() => setShowModal(true)}
        className="border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors block bg-slate-950/40 p-3 group cursor-pointer"
      >
        <img
          src={url}
          alt={`Bukti Scammer ${index + 1}`}
          className="max-h-[260px] w-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
        />
        <span className="text-[10px] text-slate-500 text-center block mt-3 hover:text-white transition-colors">
          🔍 Klik untuk memperbesar bukti
        </span>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <img
            src={url}
            alt={`Bukti Scammer ${index + 1}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}
