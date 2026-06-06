// components/LoadingSpinner.tsx
export default function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-[1.5px]",
    lg: "w-12 h-12 border-2",
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`${sizes[size]} border-slate-600 border-t-blue-400 rounded-full animate-spin`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
}
