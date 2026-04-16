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

  // Simple minimalist SVG matching the previous style
  const svg = `<svg width='100' height='100' xmlns='http://www.w3.org/2000/svg'>
    <rect width='100' height='100' fill='${bgColor}'/>
    <text x='50%' y='50%' font-family='system-ui, sans-serif' font-size='14' fill='${accentColor}' text-anchor='middle' dy='.3em'>${label}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
