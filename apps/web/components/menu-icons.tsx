"use client";

export const MENU_ICON_CODES = ["fish", "beef", "lobster", "plant"] as const;
export type MenuIconCode = (typeof MENU_ICON_CODES)[number];

const iconPaths: Record<string, string> = {
  fish: "/icons/fish.svg",
  beef: "/icons/beef.svg",
  lobster: "/icons/lobster.svg",
  plant: "/icons/plant.svg",
  vehicle: "/icons/vehicle.svg",
  percent: "/icons/percent.svg",
};

type MenuIconProps = {
  code: string;
  className?: string;
  size?: number;
  "aria-hidden"?: boolean;
};

/** Renders a menu symbol by code (article type: fish, beef, lobster, plant; app: vehicle, percent). */
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
