"use client";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-900/70 border border-slate-700 rounded-2xl shadow-xl backdrop-blur-sm p-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
