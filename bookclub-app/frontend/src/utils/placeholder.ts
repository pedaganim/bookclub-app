import { getLibraryConfig } from '../config/libraryConfig';

/**
 * Generates a category-aware SVG placeholder data URI.
 * @param category The category of the item (e.g., 'toy', 'tool', 'book')
 * @returns A data URI string for the SVG image
 */
export function getPlaceholderSvg(category: string = 'book'): string {
  const config = getLibraryConfig(category);
  const label = config?.shortLabel || config?.itemLabel || 'Item';
  const emoji = config?.emoji || '📦';
  const accentColor = '%23374151'; // gray-700
  const bgColor = '%23F3F4F6'; // gray-100

  // Create an SVG with the emoji and label
  const svg = `<svg width='200' height='266' viewBox='0 0 200 266' xmlns='http://www.w3.org/2000/svg'>
    <rect width='200' height='266' fill='${bgColor}'/>
    <text x='50%' y='45%' font-family='system-ui, sans-serif' font-size='48' text-anchor='middle' dy='.3em'>${emoji}</text>
    <text x='50%' y='65%' font-family='system-ui, sans-serif' font-size='16' font-weight='600' fill='${accentColor}' text-anchor='middle' dy='.3em'>${label}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
