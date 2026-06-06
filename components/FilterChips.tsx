// components/FilterChips.tsx
import { ReactNode } from "react";

interface FilterChipsProps {
  options: { label: string; value: string; icon?: ReactNode }[];
  selected: string;
  onChange: (value: string) => void;
}

export default function FilterChips({ options, selected, onChange }: FilterChipsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={selected === opt.value}
          className={`
            inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold
            border transition-all duration-200 whitespace-nowrap
            ${
              selected === opt.value
                ? "bg-gradient-to-r from-blue-500/20 to-emerald-500/20 border-blue-500/50 text-white shadow-glow-sm-blue"
                : "border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5"
            }
          `}
        >
          {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
