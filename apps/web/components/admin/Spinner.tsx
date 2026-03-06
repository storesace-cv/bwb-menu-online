"use client";

export function Spinner({ className = "" }: { className?: string }) {
  return <div className={`spinner ${className}`.trim()} aria-hidden />;
}
