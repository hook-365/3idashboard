/**
 * Coordinate formatting utilities for celestial coordinates
 * Converts decimal degrees to astronomical formats (HMS/DMS)
 * Includes solar elongation calculations for observability
 *
 * IMPORTANT: RA/DEC COORDINATE SYSTEM EXPLANATION
 * ===============================================
 *
 * Right Ascension (RA) and Declination (DEC) are GEOCENTRIC coordinates:
 * - They represent the position of an object as seen from Earth's CENTER
 * - They are the SAME for all observers on Earth at any given moment
 * - Think of them as GPS coordinates for the sky - universal and consistent
 *
 * This is DIFFERENT from Altitude/Azimuth coordinates:
 * - Altitude/Azimuth are OBSERVER-SPECIFIC (depend on your location and time)
 * - They require observer's latitude/longitude and local sidereal time
 * - They answer "How high in MY sky?" and "Which compass direction?"
 *
 * Why RA/DEC don't need observer location:
 * - RA/DEC are based on Earth's rotation axis and celestial equator
 * - They're independent of where you stand on Earth
 * - Only your LOCAL TIME affects which RA is overhead (due to Earth's rotation)
 *
 * How we calculate RA/DEC for 3I/ATLAS:
 * 1. Get comet's heliocentric position (X,Y,Z relative to Sun) from JPL Horizons
 * 2. Get Earth's heliocentric position from astronomy-engine
 * 3. Calculate geocentric position: comet_pos - earth_pos
 * 4. Convert to equatorial coordinates (RA/DEC) using celestial reference frame
 * 5. Result is valid for ALL Earth observers at that instant
 *
 * To get observer-specific directions (Alt/Az), you would need to:
 * 1. Get observer's latitude/longitude
 * 2. Calculate Local Sidereal Time (LST) from observer's longitude and current time
 * 3. Convert RA/DEC to Alt/Az using spherical trigonometry and LST
 * 4. Alt/Az tells you: "Look X degrees above horizon toward Y compass direction"
 *
 * Current implementation: We provide RA/DEC (universal) and general guidance
 * based on hemisphere and time, NOT observer-specific Alt/Az.
 */

import * as Astronomy from 'astronomy-engine';

/**
 * Convert Right Ascension from decimal degrees to Hours:Minutes:Seconds format
 *
 * @param ra - Right Ascension in decimal degrees (0-360)
 * @returns Formatted string in "HHh MMm SS.Ss" format
 *
 * @example
 * raToHMS(214.267) // Returns "14h 17m 04.1s"
 * raToHMS(0) // Returns "0h 00m 00.0s"
 * raToHMS(359.99) // Returns "23h 59m 59.8s"
 */
export function raToHMS(ra: number): string {
  // Normalize RA to 0-360 range
  const normalizedRA = ((ra % 360) + 360) % 360;

  // Convert degrees to hours (24 hours = 360 degrees)
  const totalHours = normalizedRA / 15;

  const hours = Math.floor(totalHours);
  const minutesDecimal = (totalHours - hours) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = (minutesDecimal - minutes) * 60;

  return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toFixed(1).padStart(4, '0')}s`;
}

/**
 * Convert Declination from decimal degrees to Degrees:Arcminutes:Arcseconds format
 *
 * @param dec - Declination in decimal degrees (-90 to +90)
 * @returns Formatted string in "±DD° MM' SS.S\"" format
 *
 * @example
 * decToDMS(-10.381) // Returns "-10° 22' 52.9\""
 * decToDMS(45.5) // Returns "+45° 30' 00.0\""
 * decToDMS(0) // Returns "+0° 00' 00.0\""
 */
export function decToDMS(dec: number): string {
  // Clamp declination to valid range
  const clampedDec = Math.max(-90, Math.min(90, dec));

  const sign = clampedDec >= 0 ? '+' : '-';
  const absDec = Math.abs(clampedDec);

  const degrees = Math.floor(absDec);
  const arcminutesDecimal = (absDec - degrees) * 60;
  const arcminutes = Math.floor(arcminutesDecimal);
  const arcseconds = (arcminutesDecimal - arcminutes) * 60;

  return `${sign}${degrees}° ${arcminutes.toString().padStart(2, '0')}' ${arcseconds.toFixed(1).padStart(4, '0')}"`;
}

/**
 * Format both RA and DEC coordinates for display
 *
 * @param ra - Right Ascension in decimal degrees
 * @param dec - Declination in decimal degrees
 * @returns Object with formatted RA and DEC strings
 *
 * @example
 * formatSkyPosition(214.267, -10.381)
 * // Returns { ra: "14h 17m 04.1s", dec: "-10° 22' 52.9\"" }
 */
export function formatSkyPosition(ra: number, dec: number): {
  ra: string;
  dec: string;
} {
  return {
    ra: raToHMS(ra),
    dec: decToDMS(dec),
  };
}

/**
 * Parse RA in HMS format back to decimal degrees (for validation/testing)
 *
 * @param hms - HMS string like "14h 17m 04.1s"
 * @returns RA in decimal degrees
 */
export function parseHMSToRA(hms: string): number | null {
  const match = hms.match(/(\d+)h\s*(\d+)m\s*([\d.]+)s/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseFloat(match[3]);

  return (hours + minutes / 60 + seconds / 3600) * 15;
}

/**
 * Parse DEC in DMS format back to decimal degrees (for validation/testing)
 *
 * @param dms - DMS string like "-10° 22' 52.9\""
 * @returns DEC in decimal degrees
 */
export function parseDMSToDec(dms: string): number | null {
  const match = dms.match(/([+-]?)(\d+)°\s*(\d+)'\s*([\d.]+)"/);
  if (!match) return null;

  const sign = match[1] === '-' ? -1 : 1;
  const degrees = parseInt(match[2], 10);
  const arcminutes = parseInt(match[3], 10);
  const arcseconds = parseFloat(match[4]);

  return sign * (degrees + arcminutes / 60 + arcseconds / 3600);
}

/**
 * Observability status based on solar elongation
 */
export interface ObservabilityStatus {
  visible: boolean;
  solarElongation: number; // degrees
  status: 'not-visible' | 'difficult' | 'observable';
  statusText: string;
  reason: string;
  bestViewingTime?: string;
}

/**
 * General direction guidance based on RA/DEC (without observer location)
 */
export interface DirectionGuidance {
  primaryDirection: string; // N, S, E, W, NE, NW, SE, SW
  hemisphere: 'northern' | 'southern' | 'equatorial';
  timeGuidance: string; // When it's best visible
  elevationGuidance: string; // How high in the sky
  compass: string; // Detailed compass direction
}

/**
 * Provide general cardinal direction guidance without observer location
 *
 * Uses RA and DEC to give approximate directions based on:
 * - RA determines east-west direction (related to time of night)
 * - DEC determines north-south visibility and elevation
 *
 * NOTE: This is GENERAL guidance. For precise Alt/Az directions,
 * observer location and local sidereal time are required.
 *
 * @param ra - Right Ascension in decimal degrees (0-360)
 * @param dec - Declination in decimal degrees (-90 to +90)
 * @param date - Current date/time (for determining best viewing time)
 * @returns General direction guidance
 */
export function getDirectionGuidance(
  ra: number,
  dec: number,
  date: Date = new Date()
): DirectionGuidance {
  // Get Sun's RA to determine time-based directions
  const sunPosition = Astronomy.SunPosition(date);
  const sunEquatorial = Astronomy.EquatorFromVector(sunPosition.vec);
  const sunRA = sunEquatorial.ra * 15; // Convert hours to degrees

  // Calculate hour angle: how far the object is from the meridian (overhead)
  // Positive = west of meridian, Negative = east of meridian
  const hourAngleDeg = ((ra - sunRA + 540) % 360) - 180; // Normalize to -180 to +180

  // Determine hemisphere visibility based on DEC
  let hemisphere: 'northern' | 'southern' | 'equatorial';
  if (dec > 25) hemisphere = 'northern';
  else if (dec < -25) hemisphere = 'southern';
  else hemisphere = 'equatorial';

  // Determine primary direction based on hour angle and declination
  let primaryDirection: string;
  let compass: string;
  let timeGuidance: string;
  let elevationGuidance: string;

  // Time-based direction (assumes midnight local time when comet is on meridian)
  if (hourAngleDeg > 120 || hourAngleDeg < -120) {
    // Roughly opposite the Sun - visible at midnight
    if (dec > 0) {
      primaryDirection = 'N';
      compass = 'Northern sky';
    } else if (dec < 0) {
      primaryDirection = 'S';
      compass = 'Southern sky';
    } else {
      primaryDirection = 'N/S';
      compass = 'Near celestial equator';
    }
    timeGuidance = 'Best around midnight';
  } else if (hourAngleDeg > 0) {
    // West of Sun - evening sky
    if (dec > 20) {
      primaryDirection = 'NW';
      compass = 'Northwest';
    } else if (dec < -20) {
      primaryDirection = 'SW';
      compass = 'Southwest';
    } else {
      primaryDirection = 'W';
      compass = 'Western sky';
    }
    timeGuidance = 'Evening sky after sunset';
  } else {
    // East of Sun - morning sky
    if (dec > 20) {
      primaryDirection = 'NE';
      compass = 'Northeast';
    } else if (dec < -20) {
      primaryDirection = 'SE';
      compass = 'Southeast';
    } else {
      primaryDirection = 'E';
      compass = 'Eastern sky';
    }
    timeGuidance = 'Morning sky before sunrise';
  }

  // Elevation guidance based on declination
  if (hemisphere === 'northern') {
    if (dec > 60) {
      elevationGuidance = 'High in the sky from northern latitudes';
    } else if (dec > 30) {
      elevationGuidance = 'Medium elevation from northern latitudes';
    } else {
      elevationGuidance = 'Low on the horizon from northern latitudes';
    }
  } else if (hemisphere === 'southern') {
    if (dec < -60) {
      elevationGuidance = 'High in the sky from southern latitudes';
    } else if (dec < -30) {
      elevationGuidance = 'Medium elevation from southern latitudes';
    } else {
      elevationGuidance = 'Low on the horizon from southern latitudes';
    }
  } else {
    elevationGuidance = 'Visible from both hemispheres near the horizon';
  }

  return {
    primaryDirection,
    hemisphere,
    timeGuidance,
    elevationGuidance,
    compass
  };
}

/**
 * Calculate solar elongation and observability status
 *
 * Solar elongation is the angular separation between the comet and the Sun
 * as seen from Earth. Objects too close to the Sun cannot be observed.
 *
 * @param cometRA - Comet Right Ascension in decimal degrees
 * @param cometDEC - Comet Declination in decimal degrees
 * @param date - Date for calculation (defaults to now)
 * @returns Observability status with solar elongation and recommendations
 *
 * @example
 * const status = calculateObservability(245.27, 47.90)
 * // Returns { visible: false, solarElongation: 15.3, status: 'not-visible', ... }
 */
export function calculateObservability(
  cometRA: number,
  cometDEC: number,
  date: Date = new Date()
): ObservabilityStatus {
  // Get Sun's position using astronomy-engine
  // SunPosition returns geocentric ecliptic coordinates
  const sunPosition = Astronomy.SunPosition(date);

  // Convert to equatorial coordinates (RA/DEC)
  const sunEquatorial = Astronomy.EquatorFromVector(sunPosition.vec);

  // Convert Sun's RA from hours to degrees
  const sunRA = sunEquatorial.ra * 15; // RA is in hours, convert to degrees
  const sunDEC = sunEquatorial.dec;

  // Calculate angular separation using spherical trigonometry
  // cos(separation) = sin(dec1) * sin(dec2) + cos(dec1) * cos(dec2) * cos(ra1 - ra2)
  const cometRArad = cometRA * Math.PI / 180;
  const cometDECrad = cometDEC * Math.PI / 180;
  const sunRArad = sunRA * Math.PI / 180;
  const sunDECrad = sunDEC * Math.PI / 180;

  const cosElongation =
    Math.sin(cometDECrad) * Math.sin(sunDECrad) +
    Math.cos(cometDECrad) * Math.cos(sunDECrad) * Math.cos(cometRArad - sunRArad);

  // Clamp to [-1, 1] to avoid floating point errors in acos
  const clampedCos = Math.max(-1, Math.min(1, cosElongation));
  const elongation = Math.acos(clampedCos) * 180 / Math.PI;

  // Determine observability status
  if (elongation < 30) {
    return {
      visible: false,
      solarElongation: elongation,
      status: 'not-visible',
      statusText: 'NOT CURRENTLY VISIBLE',
      reason: 'Too close to the Sun - unobservable in twilight sky',
      bestViewingTime: undefined
    };
  } else if (elongation < 45) {
    return {
      visible: false,
      solarElongation: elongation,
      status: 'difficult',
      statusText: 'VERY DIFFICULT',
      reason: 'Very low on horizon during twilight - requires dark sky and clear horizon',
      bestViewingTime: 'Early dawn or late dusk with excellent viewing conditions'
    };
  } else {
    // Determine best viewing time based on RA relative to Sun
    let bestTime = 'Visible in dark night sky';
    const raDiff = ((cometRA - sunRA + 540) % 360) - 180; // Normalize to -180 to 180

    if (raDiff > 90 && raDiff < 180) {
      bestTime = 'Best viewed in evening sky after sunset';
    } else if (raDiff < -90 && raDiff > -180) {
      bestTime = 'Best viewed in morning sky before sunrise';
    } else if (Math.abs(raDiff) < 90) {
      bestTime = 'Best viewed around midnight';
    }

    return {
      visible: true,
      solarElongation: elongation,
      status: 'observable',
      statusText: 'OBSERVABLE',
      reason: 'Good angular separation from Sun',
      bestViewingTime: bestTime
    };
  }
}
