"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

/** z-index for FAB overlay and speed dial (below reservation modal 1000). */
const FAB_Z = 900;

const DEFAULT_LABELS = {
  sections: "Menus",
  filters: "Filtros",
  search: "Pesquisar",
  language: "Idioma",
  reserve: "Reservar mesa",
  openMenu: "Abrir menu de ações",
  closeMenu: "Fechar menu",
} as const;

export type FabSpeedDialLabels = Partial<Record<keyof typeof DEFAULT_LABELS, string>>;

export type FabSpeedDialProps = {
  onOpenSections: () => void;
  onToggleCategories: () => void;
  onOpenSearch: () => void;
  onOpenLanguage: () => void;
  onReserveTable: () => void;
  isCategoriesOpen?: boolean;
  isSearchOpen?: boolean;
  languageDisabled?: boolean;
  reserveDisabled?: boolean;
  placement?: "bottom-right";
  offsetBottom?: number;
  offsetRight?: number;
  labels?: FabSpeedDialLabels;
};

/**
 * FAB with Speed Dial: fixed bottom-right, safe-area aware, 5 actions.
 * Overlay and actions rendered via portal. Esc closes; focus first action on open.
 * Props: onOpenSections, onToggleCategories, onOpenSearch, onOpenLanguage, onReserveTable;
 * isCategoriesOpen, isSearchOpen (optional); placement, offsetBottom, offsetRight; labels for i18n.
 */
const actionBtnBase =
  "min-w-[44px] min-h-[44px] flex items-center justify-center gap-2 rounded-full shadow-lg text-white text-sm font-medium px-4 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50";
const actionBtnActive = "hover:opacity-90 active:opacity-80";
const actionBtnDisabled = "opacity-60 cursor-not-allowed";

export function FabSpeedDial({
  onOpenSections,
  onToggleCategories,
  onOpenSearch,
  onOpenLanguage,
  onReserveTable,
  isCategoriesOpen = false,
  isSearchOpen = false,
  languageDisabled = true,
  reserveDisabled = true,
  placement = "bottom-right",
  offsetBottom = 16,
  offsetRight = 16,
  labels: labelsProp,
}: FabSpeedDialProps) {
  const [open, setOpen] = useState(false);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        fabRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => {
        firstActionRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  const handleAction = (fn: () => void) => {
    fn();
    close();
  };

  const positionStyles: React.CSSProperties =
    placement === "bottom-right"
      ? {
          bottom: `calc(${offsetBottom}px + env(safe-area-inset-bottom, 0px))`,
          right: `calc(${offsetRight}px + env(safe-area-inset-right, 0px))`,
        }
      : {};
  /** Dial stack sits above the FAB (FAB is 48px min, use 56px for spacing). */
  const dialPositionStyles: React.CSSProperties =
    placement === "bottom-right"
      ? {
          bottom: `calc(${offsetBottom}px + 56px + env(safe-area-inset-bottom, 0px))`,
          right: `calc(${offsetRight}px + env(safe-area-inset-right, 0px))`,
        }
      : {};

  const overlayAndDial =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0"
            style={{ zIndex: FAB_Z }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/30 cursor-default"
              aria-label={labels.closeMenu}
              aria-hidden="true"
              onClick={close}
            />
            {/* Order in DOM: Reservar, Idioma, Pesquisar, Filtros, Menus → with flex-col-reverse visual order is 1 Menus 2 Filtros 3 Pesquisar 4 Idioma 5 Reservar */}
            <div
              className="absolute flex flex-col-reverse gap-2 items-end"
              style={{
                ...dialPositionStyles,
                transition: prefersReducedMotion ? "none" : "opacity 0.2s ease, transform 0.2s ease",
              }}
              role="menu"
              aria-label={labels.openMenu}
            >
              <button
                type="button"
                role="menuitem"
                aria-label={labels.reserve}
                aria-disabled={reserveDisabled}
                onClick={() => handleAction(onReserveTable)}
                className={`${actionBtnBase} ${reserveDisabled ? actionBtnDisabled : actionBtnActive}`}
                style={{ backgroundColor: "var(--menu-primary, #8b6914)" }}
              >
                <ReserveIcon className="w-5 h-5 shrink-0" />
                <span>{labels.reserve}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                aria-label={labels.language}
                aria-disabled={languageDisabled}
                onClick={() => handleAction(onOpenLanguage)}
                className={`${actionBtnBase} ${languageDisabled ? actionBtnDisabled : actionBtnActive}`}
                style={{ backgroundColor: "var(--menu-primary, #8b6914)" }}
              >
                <LanguageIcon className="w-5 h-5 shrink-0" />
                <span>{labels.language}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                aria-label={labels.search}
                onClick={() => handleAction(onOpenSearch)}
                className={`${actionBtnBase} ${actionBtnActive}`}
                style={{ backgroundColor: "var(--menu-primary, #8b6914)" }}
              >
                <SearchIcon className="w-5 h-5 shrink-0" />
                <span>{labels.search}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                aria-label={labels.filters}
                onClick={() => handleAction(onToggleCategories)}
                className={`${actionBtnBase} ${actionBtnActive}`}
                style={{ backgroundColor: "var(--menu-primary, #8b6914)" }}
              >
                <FiltersIcon className="w-5 h-5 shrink-0" />
                <span>{labels.filters}</span>
              </button>
              <button
                ref={firstActionRef}
                type="button"
                role="menuitem"
                aria-label={labels.sections}
                onClick={() => handleAction(onOpenSections)}
                className={`${actionBtnBase} ${actionBtnActive}`}
                style={{ backgroundColor: "var(--menu-primary, #8b6914)" }}
              >
                <SectionsIcon className="w-5 h-5 shrink-0" />
                <span>{labels.sections}</span>
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="min-w-[48px] min-h-[48px] w-14 h-14 rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
        style={{
          ...positionStyles,
          position: "fixed",
          backgroundColor: "var(--menu-primary, #8b6914)",
          color: "var(--menu-primary-foreground, #fff)",
        }}
        aria-label={open ? labels.closeMenu : labels.openMenu}
        aria-expanded={open}
      >
        {open ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
      </button>
      {overlayAndDial}
    </>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SectionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function FiltersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  );
}

function ReserveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
