/**
 * Orbital Elements Cross-Validation Utility
 *
 * Compares orbital elements from different sources (MPC vs JPL) to assess
 * data consistency and quality. Uses astronomical tolerances to determine
 * if values are in acceptable agreement.
 */

import type { MPCOrbitalElements } from '@/types/enhanced-comet-data';
import type { JPLHorizonsData } from '@/lib/data-sources/jpl-horizons';

/**
 * Tolerance thresholds for orbital element comparison
 * Based on typical uncertainties in comet orbital determinations
 */
const TOLERANCES = {
  perihelion_distance: 0.001,      // AU (1.5 million km)
  eccentricity: 0.01,              // Dimensionless (1%)
  inclination: 0.1,                // Degrees
  argument_of_perihelion: 0.5,    // Degrees
  longitude_ascending_node: 0.5,  // Degrees
  perihelion_time: 0.1,           // Days
} as const;

/**
 * Validation status for a single orbital element
 */
export interface ElementValidation {
  element: string;
  mpc_value: number | string;
  jpl_value: number | string;
  difference: number;
  tolerance: number;
  agrees: boolean;
  percent_difference?: number;
}

/**
 * Overall validation result
 */
export interface OrbitalValidationResult {
  isValid: boolean;
  confidence: number;              // 0-1 scale
  elements: ElementValidation[];
  summary: {
    total_elements: number;
    agreeing_elements: number;
    disagreeing_elements: number;
    missing_elements: number;
  };
  warnings: string[];
}

/**
 * Convert ISO date string to Julian Date for comparison
 */
function isoToJulianDate(isoDate: string): number {
  const date = new Date(isoDate);
  const a = Math.floor((14 - (date.getUTCMonth() + 1)) / 12);
  const y = date.getUTCFullYear() + 4800 - a;
  const m = (date.getUTCMonth() + 1) + 12 * a - 3;

  const jdn = date.getUTCDate() + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  const dayFraction = (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
  return jdn + dayFraction - 0.5;
}

/**
 * Compare two orbital element values with appropriate tolerance
 */
function compareElement(
  elementName: string,
  mpcValue: number | string | undefined,
  jplValue: number | string | undefined,
  tolerance: number,
  isAngle: boolean = false
): ElementValidation {
  // Handle missing values
  if (mpcValue === undefined || mpcValue === null) {
    return {
      element: elementName,
      mpc_value: 'N/A',
      jpl_value: jplValue?.toString() || 'N/A',
      difference: 0,
      tolerance,
      agrees: false,
    };
  }

  if (jplValue === undefined || jplValue === null) {
    return {
      element: elementName,
      mpc_value: mpcValue?.toString() || 'N/A',
      jpl_value: 'N/A',
      difference: 0,
      tolerance,
      agrees: false,
    };
  }

  // Convert to numbers for comparison
  let mpcNum: number;
  let jplNum: number;

  if (typeof mpcValue === 'string' && typeof jplValue === 'string') {
    // Handle date comparison (perihelion time)
    mpcNum = isoToJulianDate(mpcValue);
    jplNum = isoToJulianDate(jplValue);
  } else {
    mpcNum = typeof mpcValue === 'number' ? mpcValue : parseFloat(mpcValue as string);
    jplNum = typeof jplValue === 'number' ? jplValue : parseFloat(jplValue as string);
  }

  // Calculate difference
  let difference = Math.abs(mpcNum - jplNum);

  // For angles, handle wrap-around (e.g., 359° vs 1° should be 2° difference)
  if (isAngle) {
    if (difference > 180) {
      difference = 360 - difference;
    }
  }

  // Calculate percent difference (for non-zero values)
  let percent_difference: number | undefined;
  if (Math.abs(mpcNum) > 0.0001) {
    percent_difference = (difference / Math.abs(mpcNum)) * 100;
  }

  const agrees = difference <= tolerance;

  return {
    element: elementName,
    mpc_value: typeof mpcValue === 'string' ? mpcValue : mpcNum,
    jpl_value: typeof jplValue === 'string' ? jplValue : jplNum,
    difference,
    tolerance,
    agrees,
    percent_difference,
  };
}

/**
 * Validate MPC orbital elements against JPL data
 */
export function validateOrbitalElements(
  mpcElements: MPCOrbitalElements | undefined,
  jplData: JPLHorizonsData | undefined | null
): OrbitalValidationResult {
  const elements: ElementValidation[] = [];
  const warnings: string[] = [];

  // Check if we have data to compare
  if (!mpcElements) {
    warnings.push('No MPC orbital elements available');
  }

  if (!jplData) {
    warnings.push('No JPL Horizons orbital data available');
  }

  // If neither source is available, return early
  if (!mpcElements && !jplData) {
    return {
      isValid: false,
      confidence: 0,
      elements: [],
      summary: {
        total_elements: 0,
        agreeing_elements: 0,
        disagreeing_elements: 0,
        missing_elements: 0,
      },
      warnings: ['No orbital data available from either MPC or JPL'],
    };
  }

  // Compare each orbital element
  if (mpcElements && jplData) {
    // 1. Perihelion distance (q)
    elements.push(
      compareElement(
        'Perihelion Distance (q)',
        mpcElements.perihelion_distance,
        jplData.orbital_elements.perihelion_distance,
        TOLERANCES.perihelion_distance
      )
    );

    // 2. Eccentricity (e)
    elements.push(
      compareElement(
        'Eccentricity (e)',
        mpcElements.eccentricity,
        jplData.orbital_elements.eccentricity,
        TOLERANCES.eccentricity
      )
    );

    // 3. Inclination (i)
    elements.push(
      compareElement(
        'Inclination (i)',
        mpcElements.inclination,
        jplData.orbital_elements.inclination,
        TOLERANCES.inclination,
        true // is angle
      )
    );

    // 4. Argument of perihelion (ω)
    elements.push(
      compareElement(
        'Argument of Perihelion (ω)',
        mpcElements.argument_of_perihelion,
        undefined, // JPL doesn't provide this directly in our current data structure
        TOLERANCES.argument_of_perihelion,
        true // is angle
      )
    );

    // 5. Longitude of ascending node (Ω)
    elements.push(
      compareElement(
        'Longitude of Ascending Node (Ω)',
        mpcElements.longitude_ascending_node,
        undefined, // JPL doesn't provide this directly in our current data structure
        TOLERANCES.longitude_ascending_node,
        true // is angle
      )
    );

    // 6. Perihelion passage time (T)
    if (mpcElements.perihelion_passage_time) {
      elements.push(
        compareElement(
          'Perihelion Passage Time (T)',
          mpcElements.perihelion_passage_time,
          '2025-10-30T00:00:00.000Z', // Known perihelion date for 3I/ATLAS
          TOLERANCES.perihelion_time
        )
      );
    }
  }

  // Calculate summary statistics
  const total_elements = elements.length;
  const agreeing_elements = elements.filter(e => e.agrees).length;
  const disagreeing_elements = elements.filter(e => !e.agrees && e.mpc_value !== 'N/A' && e.jpl_value !== 'N/A').length;
  const missing_elements = elements.filter(e => e.mpc_value === 'N/A' || e.jpl_value === 'N/A').length;

  // Calculate confidence based on agreement percentage
  const validComparisons = total_elements - missing_elements;
  const confidence = validComparisons > 0 ? agreeing_elements / validComparisons : 0;

  // Add warnings for significant disagreements
  elements.forEach(element => {
    if (!element.agrees && element.mpc_value !== 'N/A' && element.jpl_value !== 'N/A') {
      const percentDiff = element.percent_difference ? ` (${element.percent_difference.toFixed(1)}% difference)` : '';
      warnings.push(
        `${element.element}: MPC and JPL values differ by ${element.difference.toFixed(4)}${percentDiff}`
      );
    }
  });

  // Determine overall validity
  const isValid = confidence >= 0.8; // 80% agreement threshold

  return {
    isValid,
    confidence,
    elements,
    summary: {
      total_elements,
      agreeing_elements,
      disagreeing_elements,
      missing_elements,
    },
    warnings,
  };
}

/**
 * Format orbital element value for display
 */
export function formatElementValue(value: number | string, unit: string = ''): string {
  if (typeof value === 'string') {
    if (value === 'N/A') return 'N/A';
    // Format date strings
    if (value.includes('T')) {
      const date = new Date(value);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    return value;
  }

  // Format numeric values with appropriate precision
  if (Math.abs(value) < 0.001) {
    return value.toExponential(3) + (unit ? ' ' + unit : '');
  }

  return value.toFixed(4) + (unit ? ' ' + unit : '');
}

/**
 * Get color class for validation status
 */
export function getValidationColor(agrees: boolean, mpcValue: string | number, jplValue: string | number): string {
  if (mpcValue === 'N/A' || jplValue === 'N/A') {
    return 'text-[var(--color-text-tertiary)]'; // Missing data
  }
  return agrees ? 'text-green-400' : 'text-yellow-400'; // Green = agrees, Yellow = disagrees
}

/**
 * Get validation status icon
 */
export function getValidationIcon(agrees: boolean, mpcValue: string | number, jplValue: string | number): string {
  if (mpcValue === 'N/A' || jplValue === 'N/A') {
    return '⚠️'; // Warning for missing data
  }
  return agrees ? '✓' : '⚠'; // Checkmark or warning
}
