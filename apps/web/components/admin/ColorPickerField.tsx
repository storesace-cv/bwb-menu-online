"use client";

import { useState, useMemo } from "react";

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

/** Parse simple rgb(r,g,b) to hex for display in picker; returns undefined if not matched. */
function rgbToHex(rgb: string): string | undefined {
  const m = rgb.trim().match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (!m) return undefined;
  const r = Math.max(0, Math.min(255, parseInt(m[1], 10)));
  const g = Math.max(0, Math.min(255, parseInt(m[2], 10)));
  const b = Math.max(0, Math.min(255, parseInt(m[3], 10)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function parseInitialValue(defaultValue?: string, defaultHex?: string): string {
  const v = (defaultValue ?? "").trim();
  if (HEX_REGEX.test(v)) return v;
  const fromRgb = rgbToHex(v);
  if (fromRgb) return fromRgb;
  return defaultHex ?? "#F2F2F2";
}

export function ColorPickerField({
  name,
  id,
  label,
  defaultValue = "",
  defaultHex = "#F2F2F2",
  placeholder = "#F2F2F2",
  allowEmpty = false,
}: {
  name: string;
  id: string;
  label: string;
  defaultValue?: string;
  defaultHex?: string;
  placeholder?: string;
  /** When true, value can be empty (submit ""); picker displays defaultHex when empty. */
  allowEmpty?: boolean;
}) {
  const initial = useMemo(
    () => (allowEmpty && (defaultValue ?? "").trim() === "" ? "" : parseInitialValue(defaultValue, defaultHex)),
    []
  );
  const [value, setValue] = useState(initial);
  const displayValue = value || defaultHex;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      <div className="flex items-center gap-3 flex-wrap">
        <input type="hidden" name={name} id={id} value={value} />
        <input
          type="color"
          aria-label={label}
          value={displayValue}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-slate-600 bg-slate-800"
        />
        <input
          type="text"
          aria-label={`${label} em hex`}
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (allowEmpty && v === "") {
              setValue("");
              return;
            }
            if (v === "" || /^#[0-9A-Fa-f]{0,6}$/.test(v) || /^[0-9A-Fa-f]{0,6}$/.test(v)) {
              const hex = v.startsWith("#") ? v : v ? `#${v}` : (allowEmpty ? "" : defaultHex);
              setValue(hex.length >= 7 ? hex.slice(0, 7) : hex || (allowEmpty ? "" : defaultHex));
            }
          }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (allowEmpty && v === "") {
              setValue("");
              return;
            }
            const hex = v.startsWith("#") ? v : v ? `#${v}` : "";
            if (HEX_REGEX.test(hex)) setValue(hex);
            else if (!v) setValue(allowEmpty ? "" : defaultHex);
          }}
          className="w-full max-w-[8rem] rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
