/**
 * Photo item with crop/pan data
 */
export interface PhotoItem {
  uri: string;
  isNew?: boolean;
  // Original image dimensions (needed for crop calculations)
  width?: number;
  height?: number;
  // Crop/pan settings
  scale: number; // 0.5-2, default 1
  x: number; // 0-1, default 0.5 (centered)
  y: number; // 0-1, default 0.5 (centered)
}

export const DEFAULT_SCALE = 1;
export const DEFAULT_X = 0.5;
export const DEFAULT_Y = 0.5;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2;

/**
 * Create a new photo item with default crop settings
 */
export function createPhotoItem(uri: string, width?: number, height?: number, isNew?: boolean): PhotoItem {
  return {
    uri,
    width,
    height,
    isNew,
    scale: DEFAULT_SCALE,
    x: DEFAULT_X,
    y: DEFAULT_Y,
  };
}

