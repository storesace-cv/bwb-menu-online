/**
 * Scrolls the page so that the element with the given id is in view.
 * Respects prefers-reduced-motion (uses 'auto' instead of 'smooth' when reduced).
 * Optional offsetY compensates for fixed headers (applied via scrollMarginTop on the element).
 */

export type ScrollToSectionOptions = {
  /** Vertical offset in px (e.g. for fixed header). Applied as scrollMarginTop on the element. */
  offsetY?: number;
  /** Scroll behavior; default derived from prefers-reduced-motion. */
  behavior?: ScrollBehavior;
};

const DEFAULT_OFFSET = 0;

export function scrollToSection(
  elementId: string,
  options: ScrollToSectionOptions = {}
): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(elementId);
  if (!el) return;

  const { offsetY = DEFAULT_OFFSET, behavior } = options;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = behavior ?? (prefersReducedMotion ? "auto" : "smooth");

  if (offsetY !== 0) {
    el.style.scrollMarginTop = `${offsetY}px`;
  }
  el.scrollIntoView({ behavior: scrollBehavior, block: "start" });
}
