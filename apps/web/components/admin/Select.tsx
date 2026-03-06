"use client";

const baseSelectClass =
  "w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white focus:border-emerald-500";

export function Select({
  id,
  label,
  error,
  legible = false,
  children,
  className = "",
  wrapperClassName = "",
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  legible?: boolean;
  wrapperClassName?: string;
}) {
  const selectClass = legible ? `${baseSelectClass} input-legible` : baseSelectClass;
  return (
    <div className={`mb-4 ${wrapperClassName}`.trim()}>
      {label != null && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`${selectClass} ${className}`.trim()}
        {...rest}
      >
        {children}
      </select>
      {error != null && error !== "" && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
