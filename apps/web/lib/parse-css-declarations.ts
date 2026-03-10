/**
 * Parse a block of CSS declarations (e.g. "background: red; color: white") into a React style object.
 * Used for hero, footer and section backgrounds when the user provides custom CSS.
 */

export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/gi, (_, c) => (c as string).toUpperCase());
}

export function parseCssDeclarations(css: string): Record<string, string> {
  const style: Record<string, string> = {};
  const segments = css.split(";").map((s) => s.trim()).filter(Boolean);
  for (const segment of segments) {
    const colonIndex = segment.indexOf(":");
    if (colonIndex === -1) continue;
    const prop = segment.slice(0, colonIndex).trim();
    const value = segment.slice(colonIndex + 1).trim();
    if (!prop || value === undefined) continue;
    const camel = kebabToCamel(prop);
    style[camel] = value;
  }
  return style;
}

/**
 * Build style object for a container with optional background_color and/or background_css.
 * If background_css is set, parse and use it; else if background_color is set use backgroundColor; else return fallback or {}.
 */
export function buildBackgroundStyle(
  backgroundColor: string | null | undefined,
  backgroundCss: string | null | undefined,
  fallback: Record<string, string> = {}
): Record<string, string> {
  const rawCss = backgroundCss?.trim();
  const rawColor = backgroundColor?.trim();
  if (rawCss) {
    const parsed = parseCssDeclarations(rawCss);
    if (Object.keys(parsed).length === 0) return { ...fallback, background: rawCss };
    return { ...fallback, ...parsed };
  }
  if (rawColor && (/^#[0-9A-Fa-f]{6}$/.test(rawColor) || rawColor.startsWith("rgb"))) {
    return { ...fallback, backgroundColor: rawColor };
  }
  return fallback;
}
