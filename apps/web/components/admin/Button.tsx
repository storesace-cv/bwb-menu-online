"use client";

type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "warning" | "outline";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg",
  secondary:
    "bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-slate-500 disabled:opacity-60 disabled:cursor-not-allowed",
  success:
    "bg-emerald-700 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed",
  danger:
    "bg-red-700 hover:bg-red-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed",
  warning:
    "bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed",
  outline:
    "bg-[#079669] border border-[#079669] text-white hover:bg-emerald-600 hover:border-emerald-600 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed",
};

export function Button({
  variant = "primary",
  type = "button",
  disabled,
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`px-4 py-2 ${variantClasses[variant]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
