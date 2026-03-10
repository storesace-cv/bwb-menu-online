"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** z-index for BottomSheet overlay and panel (above FAB 900, below reservation modal 1000). */
const BOTTOM_SHEET_Z = 901;

export type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional for a11y; defaults to title. */
  ariaLabel?: string;
};

/**
 * Reusable bottom sheet: portal, overlay (click to close), slide-up panel with safe-area.
 * Respects prefers-reduced-motion for animations.
 */
export function BottomSheet({ open, onClose, title, children, ariaLabel }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!open) {
      setMounted(false);
      return;
    }
    setMounted(false);
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 flex flex-col justify-end md:items-end"
      style={{ zIndex: BOTTOM_SHEET_Z }}
      aria-modal="true"
      aria-label={ariaLabel ?? title}
      role="dialog"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 cursor-default"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className="w-full md:w-[25vw] md:max-w-[25vw]"
      >
        <div
          ref={panelRef}
          className={`relative bg-white rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col overflow-hidden w-full ${
            prefersReducedMotion ? "" : "transition-transform duration-200 ease-out"
          }`}
          style={{
            paddingBottom: "env(safe-area-inset-bottom, 0)",
            transform: prefersReducedMotion ? undefined : mounted ? "translateY(0)" : "translateY(100%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 m-0">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            aria-label="Fechar"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 overscroll-contain">{children}</div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
