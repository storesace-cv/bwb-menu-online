"use client";

/** Selectable in portal-admin for article types. */
export const ARTICLE_TYPE_ICON_CODES = ["fish", "meat", "seafood", "veggie", "hot-spice"] as const;
export type ArticleTypeIconCode = (typeof ARTICLE_TYPE_ICON_CODES)[number];

/** Reserved by app for take-away and promotion badges; not selectable as article type. */
export const RESERVED_APP_ICONS = ["take-away", "on-promo"] as const;

const iconPaths: Record<string, string> = {
  fish: "/icons/fish.svg",
  meat: "/icons/meat.svg",
  seafood: "/icons/seafood.svg",
  veggie: "/icons/veggie.svg",
  "hot-spice": "/icons/hot-spice.svg",
  "take-away": "/icons/take-away.svg",
  "on-promo": "/icons/on-promo.svg",
};

type MenuIconProps = {
  code: string;
  className?: string;
  size?: number;
  "aria-hidden"?: boolean;
};

/** Renders a menu symbol by code (article types: fish, meat, seafood, veggie, hot-spice; app reserved: take-away, on-promo). */
export function MenuIcon({ code, className, size = 24, "aria-hidden": ariaHidden }: MenuIconProps) {
  const src = iconPaths[code];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden={ariaHidden ?? true}
    />
  );
}

/** For use where Next Image is not desired (e.g. inline SVG or external). Returns the path. */
export function getMenuIconPath(code: string): string | null {
  return iconPaths[code] ?? null;
}
