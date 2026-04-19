import { getLibraryConfig } from '../config/libraryConfig';

/**
 * Gets a singular, capitalized label for an item category (e.g., 'Book', 'Toy', 'Tool').
 * Falls back to 'Item' if category is unknown.
 */
export function getItemLabel(category: string = 'book'): string {
  if (!category || category === 'book') return 'Book';
  
  const config = getLibraryConfig(category);
  const label = config?.shortLabel || config?.itemLabel;
  
  if (!label) return 'Item';
  
  // Capitalize first letter
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

/**
 * Gets a singular, lowercase label for an item category (e.g., 'book', 'toy', 'tool').
 */
export function getItemLabelLower(category: string = 'book'): string {
  return getItemLabel(category).toLowerCase();
}
