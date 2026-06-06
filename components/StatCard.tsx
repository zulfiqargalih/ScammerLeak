// components/StatCard.tsx
import { ReactNode } from "react";

interface StatCardProps {
  value: string | number;
  label: string;
  icon: ReactNode;
  accent?: "blue" | "emerald" | "amber";
}

export default function StatCard({ value, label, icon, accent = "blue" }: StatCardProps) {
  const accentClasses = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400",
  };

  return (
    <div
      className={`relative rounded-2xl border bg-gradient-to-br p-5 text-center transition-all duration-300 hover:-translate-y-1 ${accentClasses[accent]}`}
    >
      <div className="flex justify-center mb-2" aria-hidden="true">{icon}</div>
      <div className="text-2xl font-extrabold text-white tabular-nums">{value}</div>
      <div className="text-xs text-slate-400 mt-1 font-medium">{label}</div>
    </div>
  );
}
