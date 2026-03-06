"use client";

const baseInputClass =
  "w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500";

export function Input({
  id,
  label,
  error,
  legible = false,
  className = "",
  wrapperClassName = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  legible?: boolean;
  wrapperClassName?: string;
}) {
  const inputClass = legible ? `${baseInputClass} input-legible` : baseInputClass;
  return (
    <div className={`mb-4 ${wrapperClassName}`.trim()}>
      {label != null && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`${inputClass} ${className}`.trim()}
        {...rest}
      />
      {error != null && error !== "" && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
