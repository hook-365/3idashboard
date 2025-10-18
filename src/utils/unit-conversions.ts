/**
 * Unit conversion utilities for astronomical measurements
 *
 * Provides consistent formatting for distances, speeds, and other units
 * throughout the 3I/ATLAS dashboard.
 */

/**
 * Format astronomical distance with conversions from AU to miles and kilometers
 * @param au Distance in Astronomical Units
 * @param precision Number of decimal places for AU (default: 2)
 * @returns Formatted string with AU, miles, and km
 */
export function formatDistance(au: number, precision: number = 2): string {
  const AU_TO_MILES = 92955807; // 1 AU in miles
  const AU_TO_KM = 149597871;   // 1 AU in km

  const miles = au * AU_TO_MILES;
  const km = au * AU_TO_KM;

  return `${au.toFixed(precision)} AU (~${formatLargeNumber(miles)} miles • ${formatLargeNumber(km)} km)`;
}

/**
 * Format large numbers with appropriate units (million, billion)
 * @param num Number to format
 * @returns Formatted string with units
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)} billion`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(0)} million`;
  }
  if (num >= 1_000) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return num.toFixed(0);
}

/**
 * Convert AU to miles only
 * @param au Distance in Astronomical Units
 * @returns Distance in miles
 */
export function auToMiles(au: number): number {
  return au * 92955807;
}

/**
 * Convert AU to kilometers only
 * @param au Distance in Astronomical Units
 * @returns Distance in kilometers
 */
export function auToKm(au: number): number {
  return au * 149597871;
}

/**
 * Format velocity in km/s with mph conversion
 * @param kmPerSec Velocity in kilometers per second
 * @returns Formatted string with km/s and mph
 */
export function formatVelocity(kmPerSec: number): string {
  const KM_S_TO_MPH = 2236.94; // Conversion factor
  const mph = kmPerSec * KM_S_TO_MPH;

  return `${kmPerSec.toFixed(2)} km/s (~${formatLargeNumber(mph)} mph)`;
}

/**
 * Format angular measurement (degrees/arcminutes)
 * @param degrees Angle in degrees
 * @param unit Unit to display ('degrees' or 'arcminutes')
 * @returns Formatted string
 */
export function formatAngle(degrees: number, unit: 'degrees' | 'arcminutes' = 'degrees'): string {
  if (unit === 'arcminutes') {
    return `${degrees.toFixed(2)}'`;
  }
  return `${degrees.toFixed(2)}°`;
}

/**
 * Common astronomical filter explanations
 */
export const FILTER_DEFINITIONS: Record<string, string> = {
  'V': 'Johnson V-band (visual magnitude) - standard yellow-green filter matching human eye sensitivity',
  'Visual': 'Naked eye or unfiltered telescope observation',
  'R': 'Red filter - isolates red wavelengths for color analysis',
  'B': 'Blue filter - isolates blue wavelengths for color analysis',
  'Clear': 'Unfiltered CCD observation - captures all visible light',
  'CCD': 'Digital CCD camera observation without filter',
  'z': 'Sloan z-band filter - near-infrared wavelengths',
  'I': 'Infrared filter - captures infrared light',
  'U': 'Ultraviolet filter - captures UV wavelengths',
  'M': 'Miscellaneous or mixed filter configuration',
  'Uncertain': 'Filter type not clearly specified in observation'
};

/**
 * Quality rating explanations
 */
export const QUALITY_DEFINITIONS: Record<string, string> = {
  'excellent': 'High precision measurement with uncertainty <0.1 magnitude',
  'good': 'Standard precision measurement with uncertainty 0.1-0.3 magnitude',
  'fair': 'Moderate precision measurement with uncertainty 0.3-0.5 magnitude',
  'poor': 'Low precision measurement with uncertainty >0.5 magnitude'
};
