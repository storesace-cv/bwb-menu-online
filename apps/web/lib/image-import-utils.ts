/**
 * Extract article code from filename for image import.
 * Token before first '_', '-' or ' ' (no extension).
 * Examples: "12345.jpg" -> "12345", "12345_prato.png" -> "12345", "ABC123.webp" -> "ABC123"
 */
export function extractItemCodeFromFilename(filename: string): string {
  if (filename == null || typeof filename !== "string") return "";
  const base = filename.replace(/\.[^.]+$/i, "").trim();
  if (!base) return "";
  const match = base.match(/^([^_-\s]+)/);
  return match ? match[1] : base;
}

export const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.includes(mime as (typeof ALLOWED_IMAGE_MIMES)[number]);
}
