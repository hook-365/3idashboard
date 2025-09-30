/**
 * Observation filter color schemes and point styles
 * Used for consistent visual representation of photometric filters across charts
 */

/**
 * Standard photometric filter color mappings
 * Colors chosen to roughly match the wavelength of each filter band
 */
export const FILTER_COLORS: Record<string, string> = {
  'U': 'rgb(138, 43, 226)',      // Ultraviolet - violet
  'B': 'rgb(65, 105, 225)',       // Blue
  'V': 'rgb(34, 139, 34)',        // Visual - green
  'R': 'rgb(220, 20, 60)',        // Red
  'I': 'rgb(139, 0, 0)',          // Infrared - dark red
  'g': 'rgb(0, 255, 127)',        // Green (SDSS)
  'r': 'rgb(255, 69, 0)',         // Red (SDSS)
  'i': 'rgb(178, 34, 34)',        // Infrared (SDSS)
  'C': 'rgb(255, 215, 0)',        // Clear/unfiltered - gold
  'o': 'rgb(255, 140, 0)',        // Orange
  'TG': 'rgb(50, 205, 50)',       // Tri-color Green
  'CV': 'rgb(173, 216, 230)',     // CCD Visual - light blue
};

/**
 * Chart.js point style mappings for each filter
 * Different shapes help distinguish filters when colors are similar
 */
export const FILTER_POINT_STYLES: Record<string, string> = {
  'U': 'circle',
  'B': 'triangle',
  'V': 'rect',
  'R': 'rectRot',
  'I': 'star',
  'g': 'circle',
  'r': 'triangle',
  'i': 'rect',
  'C': 'cross',
  'o': 'crossRot',
  'CV': 'rectRounded',
};

/**
 * Get the color for a specific filter type with optional alpha transparency
 *
 * @param filterType The filter code (e.g., 'V', 'R', 'B')
 * @param alpha Transparency value from 0 to 1 (default: 1)
 * @returns RGB or RGBA color string
 */
export function getFilterColor(filterType: string, alpha: number = 1): string {
  const baseColor = FILTER_COLORS[filterType];

  if (!baseColor) {
    return alpha === 1 ? 'rgb(107, 114, 128)' : `rgba(107, 114, 128, ${alpha})`;
  }

  if (alpha === 1) {
    return baseColor;
  }

  // Convert rgb(...) to rgba(..., alpha)
  return baseColor.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
}

/**
 * Get the Chart.js point style for a specific filter type
 *
 * @param filterType The filter code (e.g., 'V', 'R', 'B')
 * @returns Chart.js point style name
 */
export function getFilterPointStyle(filterType: string): string {
  return FILTER_POINT_STYLES[filterType] || 'circle';
}