/**
 * Validação e constantes para upload do logotipo da loja (menu público).
 * Raster: máx. 50px altura, 1322px largura. SVG: máx. 1 MB.
 */

export const MAX_LOGO_HEIGHT_PX = 50;
export const MAX_LOGO_WIDTH_PX = 1322;
export const SVG_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
export const RASTER_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB (evitar abusos)

export const ALLOWED_LOGO_MIMES = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AllowedLogoMime = (typeof ALLOWED_LOGO_MIMES)[number];

export function isAllowedLogoMime(mime: string): mime is AllowedLogoMime {
  return (ALLOWED_LOGO_MIMES as readonly string[]).includes(mime);
}

const MIME_TO_EXT: Record<AllowedLogoMime, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function logoMimeToExt(mime: string): string {
  if (isAllowedLogoMime(mime)) return MIME_TO_EXT[mime];
  return "png";
}

/** Logo do rodapé: pequeno (altura máx. 36 px), ficheiro máx. 2 MB. */
export const FOOTER_LOGO_MAX_HEIGHT_PX = 36;
export const FOOTER_LOGO_MAX_WIDTH_PX = 400;
export const FOOTER_LOGO_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
