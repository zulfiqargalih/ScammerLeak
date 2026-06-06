// pages/admin/posts.tsx
// Admin UI for managing (view, edit, delete) existing reports.
// Uses the newly created API endpoints in /api/admin/posts.

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebase/client";
import Head from "next/head";
import Link from "next/link";
import LoadingSpinner from "../../components/LoadingSpinner";
import { XCircle, CheckCircle, RefreshCw, AlertTriangle, X } from "lucide-react";

interface Report {
  id: string;
  title: string;
  status: string;
  evidenceUrls?: string[];
  createdAt?: string;
  // other fields are ignored for this simple view
}

export default function AdminPosts() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // ---------------------------------------------------------------------
  // Authentication & admin check (same logic as pages/admin.tsx)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) fetchAllReports();
      else setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/posts");
      if (res.status === 401 || res.status === 403) {
        setIsAdmin(false);
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to load reports");
      }
      const data = await res.json();
      setReports(data);
      setIsAdmin(true);
    } catch (e: any) {
      setError(e.message || "Error loading reports");
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus laporan ini?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Delete failed");
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message || "Error deleting report");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>;

  if (!user) {
    return (
      <>
        <Head><title>Admin — Login Required</title></Head>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-slate-400">Silakan masuk sebagai admin untuk mengakses halaman ini.</p>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Head><title>Akses Ditolak</title></Head>
        <div className="min-h-[60vh] flex items-center justify-center">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <p className="ml-4 text-slate-400">Anda tidak memiliki hak admin.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Manajemen Laporan — Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Manajemen Laporan</h1>
          <button onClick={fetchAllReports} disabled={loading}
            className="btn-ghost !text-xs !px-4 !py-2 inline-flex items-center gap-2">
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Segarkan
          </button>
        </div>

        {error && (
          <div className="alert-error mb-4 flex items-center gap-2" role="alert">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading && !reports.length ? (
          <div className="flex justify-center py-20"><LoadingSpinner size="md" /></div>
        ) : (
          <ul className="space-y-4">
            {reports.map((r) => (
              <li key={r.id} className="glass bg-slate-900/30 p-4 rounded-xl border border-white/8 flex justify-between items-center">
                <div>
                  <p className="font-medium text-white">{r.title}</p>
                  <p className="text-xs text-slate-400">Status: {r.status}</p>
                </div>
                <button onClick={() => handleDelete(r.id)} disabled={loading}
                  className="px-3 py-1 text-xs text-white bg-red-600/70 hover:bg-red-600 rounded">
                  <X className="inline w-3 h-3 mr-1" /> Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
