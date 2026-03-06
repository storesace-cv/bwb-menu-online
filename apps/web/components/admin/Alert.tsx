"use client";

type AlertVariant = "error" | "success";

const variantClasses: Record<AlertVariant, string> = {
  error: "bg-red-950/40 border border-red-900 text-red-400",
  success: "bg-emerald-950/40 border border-emerald-800 text-emerald-400",
};

export function Alert({
  variant = "error",
  children,
  className = "",
}: {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`rounded-lg p-4 ${variantClasses[variant]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
