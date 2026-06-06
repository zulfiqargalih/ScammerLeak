// pages/_app.tsx
import type { AppProps } from "next/app";
import "../styles/globals.css";
import Navbar from "../components/Navbar";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main role="main" className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        <Component {...pageProps} />
      </main>
      <footer className="py-6 text-center text-xs text-slate-600 border-t border-white/5">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="gradient-text font-semibold">Pengaduan Scammer</span>
          {" "}— Secure &amp; Confidential reporting system.
        </p>
      </footer>
    </div>
  );
}
