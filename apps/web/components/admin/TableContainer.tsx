"use client";

export function TableContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`table-container ${className}`.trim()}>
      {children}
    </div>
  );
}
