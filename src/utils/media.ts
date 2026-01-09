/**
 * Media aspect ratio utilities
 *
 * Instagram-style constraints:
 * - Min: 4:5 (portrait) = 0.8
 * - Max: 1.91:1 (landscape) = 1.91
 */

export const ASPECT_RATIO_MIN = 4 / 5; // 0.8 - tallest allowed (portrait)
export const ASPECT_RATIO_MAX = 1.91; // widest allowed (landscape)

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(width: number, height: number): number {
  if (height === 0) return 1;
  return width / height;
}

/**
 * Clamp an aspect ratio to the allowed range
 */
export function clampAspectRatio(ratio: number): number {
  return Math.max(ASPECT_RATIO_MIN, Math.min(ASPECT_RATIO_MAX, ratio));
}

/**
 * Check if an aspect ratio is within the allowed range
 */
export function isAspectRatioValid(ratio: number): boolean {
  return ratio >= ASPECT_RATIO_MIN && ratio <= ASPECT_RATIO_MAX;
}

/**
 * Get the display aspect ratio for a set of media items.
 * Uses the first image's aspect ratio, clamped to allowed range.
 */
export function getDisplayAspectRatio(media: { width: number; height: number }[]): number {
  if (media.length === 0) return 1;

  const firstMedia = media[0];
  const ratio = calculateAspectRatio(firstMedia.width, firstMedia.height);

  return clampAspectRatio(ratio);
}
