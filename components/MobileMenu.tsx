// components/MobileMenu.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Home, PenLine, Shield } from "lucide-react";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  user: { displayName?: string | null; email?: string | null } | null;
  onLogout: () => void;
}

export default function MobileMenu({ isOpen, onClose, isAdmin, user, onLogout }: MobileMenuProps) {
  const router = useRouter();

  // Close menu on route change
  useEffect(() => {
    router.events.on("routeChangeStart", onClose);
    return () => router.events.off("routeChangeStart", onClose);
  }, [router, onClose]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const navLinks = [
    { href: "/", label: "Beranda", Icon: Home },
    { href: "/report", label: "Laporkan Scammer", Icon: PenLine },
    ...(isAdmin ? [{ href: "/admin", label: "Panel Admin", Icon: Shield }] : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Slide-in drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 flex flex-col
                    bg-slate-950/95 border-l border-white/8 backdrop-blur-xl
                    transform transition-transform duration-300 ease-out
                    ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <span className="text-sm font-bold gradient-text">Menu</span>
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400
                       hover:text-white hover:bg-white/8 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navLinks.map((link) => {
            const isActive = router.pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500/15 to-emerald-500/15 border border-blue-500/20 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <link.Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="px-4 pb-6 pt-4 border-t border-white/8">
          {user ? (
            <div className="space-y-3">
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/8">
                <p className="text-xs font-semibold text-white truncate">{user.displayName || "User"}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
              </div>
              <button onClick={onLogout} className="w-full btn-ghost text-xs py-2.5">
                Keluar
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary w-full text-xs py-2.5">
              Masuk dengan Google
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
