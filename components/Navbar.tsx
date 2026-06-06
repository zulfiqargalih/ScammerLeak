// components/Navbar.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase/client";
import { logout } from "../utils/auth";
import { useRouter } from "next/router";
import MobileMenu from "./MobileMenu";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        // Quick admin probe — if /api/admin/review returns 200, user is admin
        try {
          const res = await fetch("/api/admin/review", { method: "GET" });
          setIsAdmin(res.ok);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsAdmin(false);
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const navLinks = [
    { href: "/", label: "Beranda" },
    { href: "/report", label: "Laporkan" },
    ...(isAdmin ? [{ href: "/admin", label: "Panel Admin" }] : []),
  ];

  return (
    <>
      <nav
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
          scrolled
            ? "bg-slate-950/90 backdrop-blur-2xl border-white/8 shadow-lg shadow-black/20"
            : "bg-slate-950/50 backdrop-blur-xl border-white/5"
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">

          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="Pengaduan Scammer — Beranda"
          >
            {/* Shield Icon */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-blue-500/25 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight gradient-text hidden sm:block">
              Pengaduan Scammer
            </span>
            <span className="text-base font-bold tracking-tight gradient-text sm:hidden">
              PgdScammer
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = router.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "text-white bg-white/8"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-gradient-to-r from-blue-400 to-emerald-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3 border-l border-white/8 pl-5">
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white leading-none">{user.displayName || "User"}</p>
                  <p className="text-[10px] text-slate-500 leading-none mt-0.5">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-lg border border-white/10 text-xs font-medium
                             text-slate-300 hover:text-white hover:bg-white/8 transition-all"
                  aria-label="Keluar dari akun"
                >
                  Keluar
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="btn-primary !px-4 !py-2 !text-xs !rounded-lg"
              >
                Masuk
              </Link>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg
                       text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            aria-label="Buka menu navigasi"
            aria-expanded={mobileOpen}
          >
            <span className="w-5 h-0.5 bg-current rounded-full transition-all" />
            <span className="w-4 h-0.5 bg-current rounded-full transition-all" />
            <span className="w-5 h-0.5 bg-current rounded-full transition-all" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <MobileMenu
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isAdmin={isAdmin}
        user={user}
        onLogout={handleLogout}
      />
    </>
  );
}
