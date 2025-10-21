/**
 * Orbital Path Calculator
 *
 * Utility functions for calculating elliptical and parabolic orbital paths
 * from orbital elements. Used for visualizing comet trajectories in 3D.
 *
 * Supports:
 * - Near-parabolic orbits (e ≈ 0.999)
 * - Elliptical orbits (e < 1)
 * - Coordinate transformation to Three.js space
 */

import * as THREE from 'three';
import * as Astronomy from 'astronomy-engine';
import logger from '@/lib/logger';

export interface OrbitalElements {
  e: number;      // eccentricity (0 = circular, 0-1 = elliptical, ~1 = parabolic, >1 = hyperbolic)
  q: number;      // perihelion distance (AU)
  i: number;      // inclination (degrees)
  omega: number;  // longitude of ascending node (degrees)
  w: number;      // argument of periapsis (degrees)
  T?: Date;       // perihelion date (optional)
}

/**
 * Rotate a position from orbital plane to ecliptic coordinates
 *
 * @param x_orb - X position in orbital plane (AU)
 * @param y_orb - Y position in orbital plane (AU)
 * @param z_orb - Z position in orbital plane (AU, usually 0)
 * @param i - Inclination (degrees)
 * @param omega - Longitude of ascending node (degrees)
 * @param w - Argument of periapsis (degrees)
 * @returns Position in ecliptic coordinates
 */
function rotateToEcliptic(
  x_orb: number,
  y_orb: number,
  z_orb: number,
  i: number,
  omega: number,
  w: number
): { x: number; y: number; z: number } {
  // Convert angles to radians
  const i_rad = (i * Math.PI) / 180;
  const omega_rad = (omega * Math.PI) / 180;
  const w_rad = (w * Math.PI) / 180;

  // Rotation matrices
  const cos_w = Math.cos(w_rad);
  const sin_w = Math.sin(w_rad);
  const cos_i = Math.cos(i_rad);
  const sin_i = Math.sin(i_rad);
  const cos_omega = Math.cos(omega_rad);
  const sin_omega = Math.sin(omega_rad);

  // Proper orbital mechanics rotation: P = R_z(Ω) * R_x(i) * R_z(ω) * r_orb
  // Where r_orb = [x_orb, y_orb, 0] in the orbital plane

  // Combined rotation matrix elements (more accurate for high inclinations)
  const P11 = cos_omega * cos_w - sin_omega * cos_i * sin_w;
  const P12 = -cos_omega * sin_w - sin_omega * cos_i * cos_w;
  const P13 = sin_omega * sin_i;

  const P21 = sin_omega * cos_w + cos_omega * cos_i * sin_w;
  const P22 = -sin_omega * sin_w + cos_omega * cos_i * cos_w;
  const P23 = -cos_omega * sin_i;

  const P31 = sin_i * sin_w;
  const P32 = sin_i * cos_w;
  const P33 = cos_i;

  // Apply the combined transformation matrix
  const x3 = P11 * x_orb + P12 * y_orb + P13 * z_orb;
  const y3 = P21 * x_orb + P22 * y_orb + P23 * z_orb;
  const z3 = P31 * x_orb + P32 * y_orb + P33 * z_orb;

  return { x: x3, y: y3, z: z3 };
}

/**
 * Calculate orbital path points from orbital elements
 *
 * For near-parabolic orbits (e ≈ 0.999), limits the visible arc to avoid
 * rendering the infinite tail of the parabola. For elliptical orbits,
 * renders the complete orbit.
 *
 * @param elements - Orbital elements
 * @param numPoints - Number of points to calculate (default: 120)
 * @param scaleAU - Scale factor (1 AU = scaleAU units, default: 100)
 * @returns Array of Three.js Vector3 positions in visualization space
 */
export function calculateOrbitPoints(
  elements: OrbitalElements,
  numPoints = 120,
  scaleAU = 100
): THREE.Vector3[] {
  const { e, q, i, omega, w } = elements;
  const points: THREE.Vector3[] = [];

  // Determine true anomaly range based on eccentricity
  let maxAnomaly: number;

  if (e >= 1.0) {
    // Hyperbolic/parabolic - limit to visible arc near perihelion
    maxAnomaly = Math.PI * 0.75; // ±135 degrees from perihelion
  } else {
    // Elliptical - render complete orbit (full ±180 degrees)
    // For near-parabolic (e > 0.95), the aphelion will be very far but we'll
    // clip distant points with the distance check below
    maxAnomaly = Math.PI; // Full ellipse
  }

  // Calculate positions along the orbit
  for (let j = 0; j <= numPoints; j++) {
    const nu = -maxAnomaly + (2 * maxAnomaly * j) / numPoints;

    // Calculate distance from sun using orbital equation
    // r = a(1-e²)/(1+e*cos(nu)) for ellipse
    // r = q(1+e)/(1+e*cos(nu)) for any conic section
    const r = (q * (1 + e)) / (1 + e * Math.cos(nu));

    // Skip if distance is too large for visualization
    // For near-parabolic ellipses (e~0.999), most of orbit is FAR away
    // Only render the inner portion that fits in the view
    if (r > 50) continue; // Skip points beyond 50 AU to keep solar system in view

    // Position in orbital plane
    const x_orb = r * Math.cos(nu);
    const y_orb = r * Math.sin(nu);
    const z_orb = 0;

    // Rotate to ecliptic coordinates
    const pos = rotateToEcliptic(x_orb, y_orb, z_orb, i, omega, w);

    // Convert to Three.js coordinates and scale
    // JPL ecliptic: +X = vernal equinox, +Y = 90° ecliptic east, +Z = north ecliptic pole
    // Three.js: +X = right, +Y = up, +Z = toward viewer
    // Transform: (x, y, z) → (x, z, -y)
    points.push(
      new THREE.Vector3(
        pos.x * scaleAU,
        pos.z * scaleAU,
        -pos.y * scaleAU
      )
    );
  }

  return points;
}

/**
 * Calculate position in ecliptic coordinates from orbital elements
 *
 * @param elements - Orbital elements (must include perihelion date T)
 * @param date - Date to calculate position for
 * @returns Position in JPL ecliptic coordinates (AU) or null if T is missing
 */
export function calculateEclipticPosition(
  elements: OrbitalElements,
  date: Date
): { x: number; y: number; z: number } | null {
  const { e, q, i, omega, w, T } = elements;

  if (!T) {
    logger.warn({}, 'Perihelion date required for position calculation');
    return null;
  }

  // Days from perihelion (use precise time calculation)
  const daysFromPerihelion =
    (date.getTime() - T.getTime()) / (1000 * 60 * 60 * 24);

  // Semi-major axis (negative for hyperbolic)
  const a = q / (1 - e);

  // Gaussian gravitational constant for solar system
  // k = 0.01720209895 radians/day (IAU standard)
  // GM_sun = k^2 AU^3/day^2
  const k = 0.01720209895;
  const mu = k * k; // = 2.9591220828559115e-4 AU^3/day^2

  // Mean motion (radians per day)
  const n = e >= 1.0 ?
    Math.sqrt(mu / Math.abs(a * a * a)) : // Hyperbolic
    Math.sqrt(mu / (a * a * a));          // Elliptical

  // Mean anomaly
  const M = n * daysFromPerihelion;

  // Solve Kepler's equation using Newton-Raphson with improved convergence
  let nu: number; // true anomaly

  if (e >= 1.0) {
    // Hyperbolic orbit
    // Initial guess for hyperbolic anomaly
    let H = M;
    if (M !== 0) {
      // Better initial guess for hyperbolic case
      H = Math.log(2 * Math.abs(M) / e + 1.8);
      if (M < 0) H = -H;
    }

    // Newton-Raphson iteration
    for (let iter = 0; iter < 30; iter++) {
      const sinhH = Math.sinh(H);
      const coshH = Math.cosh(H);
      const f = e * sinhH - H - M;
      const df = e * coshH - 1;
      const dH = -f / df;
      H += dH;
      if (Math.abs(dH) < 1e-12) break;
    }

    // True anomaly from hyperbolic anomaly
    const tanHalfNu = Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2);
    nu = 2 * Math.atan(tanHalfNu);
  } else {
    // Elliptical orbit
    // Improved initial guess for eccentric anomaly
    let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));

    // Newton-Raphson iteration with better convergence
    for (let iter = 0; iter < 30; iter++) {
      const sinE = Math.sin(E);
      const cosE = Math.cos(E);
      const f = E - e * sinE - M;
      const df = 1 - e * cosE;
      const dE = -f / df;
      E += dE;
      if (Math.abs(dE) < 1e-12) break;
    }

    // True anomaly from eccentric anomaly
    const tanHalfNu = Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2);
    nu = 2 * Math.atan(tanHalfNu);
  }

  // Distance from sun
  const r = (q * (1 + e)) / (1 + e * Math.cos(nu));

  // Position in orbital plane
  const x_orb = r * Math.cos(nu);
  const y_orb = r * Math.sin(nu);
  const z_orb = 0;

  // Rotate to ecliptic coordinates (no Three.js transformation)
  return rotateToEcliptic(x_orb, y_orb, z_orb, i, omega, w);
}

/**
 * Calculate Earth's position in ecliptic coordinates using JPL ephemeris
 *
 * @param date - Date to calculate Earth's position
 * @returns Position in ecliptic coordinates (AU)
 */
export function calculateEarthPosition(date: Date): { x: number; y: number; z: number } {
  // Get Earth's heliocentric position from astronomy-engine (JPL ephemeris)
  // This returns J2000 equatorial coordinates
  const position = Astronomy.HelioVector(Astronomy.Body.Earth, date);

  // Obliquity of ecliptic at J2000.0 epoch (23.43929111 degrees)
  const epsilon = 23.43929111 * Math.PI / 180;
  const cos_eps = Math.cos(epsilon);
  const sin_eps = Math.sin(epsilon);

  // Convert from J2000 equatorial to ecliptic coordinates
  // Rotation around X-axis by obliquity angle
  const x_ecl = position.x;
  const y_ecl = position.y * cos_eps + position.z * sin_eps;
  const z_ecl = -position.y * sin_eps + position.z * cos_eps;

  return { x: x_ecl, y: y_ecl, z: z_ecl };
}

/**
 * Convert heliocentric ecliptic to geocentric equatorial coordinates (RA/Dec)
 *
 * @param heliocentric - Position in heliocentric ecliptic coordinates (AU)
 * @param date - Date for Earth position calculation
 * @returns Right Ascension (degrees) and Declination (degrees) as seen from Earth
 */
export function heliocentricToRADec(heliocentric: { x: number; y: number; z: number }, date: Date): { ra: number; dec: number } {
  // Get Earth's position
  const earth = calculateEarthPosition(date);

  // Convert to geocentric coordinates
  const geo_x = heliocentric.x - earth.x;
  const geo_y = heliocentric.y - earth.y;
  const geo_z = heliocentric.z - earth.z;

  // Obliquity of the ecliptic for J2000.0 epoch (23.43929 degrees)
  const epsilon = 23.43929 * Math.PI / 180;
  const cos_eps = Math.cos(epsilon);
  const sin_eps = Math.sin(epsilon);

  // Transform from ecliptic to equatorial
  const x_eq = geo_x;
  const y_eq = geo_y * cos_eps - geo_z * sin_eps;
  const z_eq = geo_y * sin_eps + geo_z * cos_eps;

  // Calculate RA and Dec
  const r = Math.sqrt(x_eq * x_eq + y_eq * y_eq);

  // Right Ascension (0 to 360 degrees)
  let ra = Math.atan2(y_eq, x_eq) * 180 / Math.PI;
  if (ra < 0) ra += 360;

  // Declination (-90 to +90 degrees)
  const dec = Math.atan2(z_eq, r) * 180 / Math.PI;

  return { ra, dec };
}

/**
 * Calculate Earth distance from heliocentric position
 *
 * @param heliocentric - Position in heliocentric ecliptic coordinates (AU)
 * @param date - Date for Earth position calculation
 * @returns Distance from Earth in AU
 */
export function calculateEarthDistance(heliocentric: { x: number; y: number; z: number }, date: Date): number {
  const earth = calculateEarthPosition(date);
  const dx = heliocentric.x - earth.x;
  const dy = heliocentric.y - earth.y;
  const dz = heliocentric.z - earth.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Convert ecliptic coordinates to equatorial coordinates (RA/Dec)
 * @deprecated Use heliocentricToRADec for accurate geocentric coordinates
 *
 * @param ecliptic - Position in ecliptic coordinates (AU)
 * @returns Right Ascension (degrees) and Declination (degrees)
 */
export function eclipticToEquatorial(ecliptic: { x: number; y: number; z: number }): { ra: number; dec: number } {
  // Obliquity of the ecliptic for J2000.0 epoch (23.43929 degrees)
  const epsilon = 23.43929 * Math.PI / 180;
  const cos_eps = Math.cos(epsilon);
  const sin_eps = Math.sin(epsilon);

  // Transform from ecliptic to equatorial
  const x_eq = ecliptic.x;
  const y_eq = ecliptic.y * cos_eps - ecliptic.z * sin_eps;
  const z_eq = ecliptic.y * sin_eps + ecliptic.z * cos_eps;

  // Calculate RA and Dec
  const r = Math.sqrt(x_eq * x_eq + y_eq * y_eq);

  // Right Ascension (0 to 360 degrees)
  let ra = Math.atan2(y_eq, x_eq) * 180 / Math.PI;
  if (ra < 0) ra += 360;

  // Declination (-90 to +90 degrees)
  const dec = Math.atan2(z_eq, r) * 180 / Math.PI;

  return { ra, dec };
}

/**
 * Calculate current position from orbital elements and date
 *
 * Uses simplified Kepler equation solving for approximate position.
 * For production use, prefer astronomy-engine for accurate calculations.
 *
 * @param elements - Orbital elements (must include perihelion date T)
 * @param date - Date to calculate position for
 * @param scaleAU - Scale factor (1 AU = scaleAU units, default: 100)
 * @returns Three.js Vector3 position in visualization space
 */
export function calculatePositionAtDate(
  elements: OrbitalElements,
  date: Date,
  scaleAU = 100
): THREE.Vector3 | null {
  // Use the ecliptic position calculator
  const pos = calculateEclipticPosition(elements, date);

  if (!pos) {
    return null;
  }

  // Convert ecliptic to Three.js coordinates
  return new THREE.Vector3(
    pos.x * scaleAU,
    pos.z * scaleAU,
    -pos.y * scaleAU
  );
}

/**
 * Calculate orbital path points with date information using proper time calculation
 * Returns points with their corresponding dates for trajectory splitting
 */
export function calculateOrbitPointsWithDates(
  elements: OrbitalElements,
  numPoints = 120,
  scaleAU = 100,
  dayRange?: number // Days before and after perihelion (auto-calculated if not provided)
): Array<{ position: THREE.Vector3; date: Date }> {
  const { e, q, T } = elements;
  const points: Array<{ position: THREE.Vector3; date: Date }> = [];

  if (!T) {
    // If no perihelion date, fall back to basic calculation
    const basicPoints = calculateOrbitPoints(elements, numPoints, scaleAU);
    return basicPoints.map(p => ({ position: p, date: new Date() }));
  }

  // Auto-calculate dayRange based on eccentricity if not provided
  if (!dayRange) {
    if (e >= 1.0) {
      // Hyperbolic: show 1-2 years around perihelion
      dayRange = 365;
    } else if (e > 0.995) {
      // Near-parabolic elliptical: show 2 years to capture approach/departure
      dayRange = 730;
    } else if (e > 0.99) {
      // High-eccentricity elliptical: show 1.5 years
      dayRange = 548;
    } else {
      // Normal elliptical: show 1 year
      dayRange = 365;
    }
  }

  // Calculate time range around perihelion
  const startDate = new Date(T.getTime() - dayRange * 24 * 60 * 60 * 1000);
  const endDate = new Date(T.getTime() + dayRange * 24 * 60 * 60 * 1000);
  const timeSpan = endDate.getTime() - startDate.getTime();

  let skippedPoints = 0;

  // For each time point, calculate the actual position using Kepler's equation
  for (let i = 0; i <= numPoints; i++) {
    const fraction = i / numPoints;
    const date = new Date(startDate.getTime() + fraction * timeSpan);

    // Use the proper position calculation that solves Kepler's equation
    const ecliptic = calculateEclipticPosition(elements, date);

    if (!ecliptic) {
      skippedPoints++;
      continue;
    }

    // Calculate distance from Sun
    const r = Math.sqrt(ecliptic.x * ecliptic.x + ecliptic.y * ecliptic.y + ecliptic.z * ecliptic.z);

    // Skip distant points for visualization
    if (r > 50) {
      skippedPoints++;
      continue;
    }

    // Convert to Three.js space (swap y and z, negate new z)
    const position = new THREE.Vector3(
      ecliptic.x * scaleAU,
      ecliptic.z * scaleAU,
      -ecliptic.y * scaleAU
    );

    points.push({ position, date });
  }

  if (skippedPoints > 0) {
    logger.info({ skippedPoints, date: T.toISOString().split('T')[0], eccentricity: parseFloat(e.toFixed(4)), perihelionDistance: parseFloat(q.toFixed(2)) }, 'Skipped orbit points beyond 50 AU or calculation failed');
  }
  logger.info({ pointCount: points.length, daySpan: dayRange * 2 }, 'Generated orbit points using Kepler equation solver');

  return points;
}

/**
 * Known orbital elements for comparison comets
 * Source: JPL Small-Body Database via TheSkyLive.com
 *
 * Note: These use JPL convention where:
 * - omega (ω) = argument of periapsis
 * - w (Ω) = longitude of ascending node (RAAN)
 * However, our rotateToEcliptic function expects:
 * - w = argument of periapsis
 * - omega = longitude of ascending node
 */
export const COMET_ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  SWAN: {
    e: 0.9993612,            // Eccentricity (near-parabolic) - MPC corrected
    q: 0.5034634,            // Perihelion distance (AU) - MPC corrected
    i: 4.4706,               // Inclination (degrees) - low inclination, prograde
    omega: 335.6732,         // Longitude of ascending node Ω (degrees)
    w: 307.7653,             // Argument of periapsis ω (degrees)
    T: new Date('2025-09-12T00:00:00Z'), // Perihelion Sep 12, 2025
  },
  LEMMON: {
    e: 0.9957568,            // Eccentricity (near-parabolic) - MPC corrected
    q: 0.5291772,            // Perihelion distance (AU) - MPC corrected
    i: 143.6313,             // Inclination (degrees) - retrograde orbit
    omega: 108.0991,         // Longitude of ascending node Ω (degrees)
    w: 132.9936,             // Argument of periapsis ω (degrees)
    T: new Date('2025-11-08T00:00:00Z'), // Perihelion Nov 8, 2025
  },
  K1: {
    e: 1.0013922,            // Eccentricity (hyperbolic) - MPC corrected
    q: 0.3354431,            // Perihelion distance (AU) - MPC corrected
    i: 147.89890,            // Inclination (degrees) - retrograde orbit
    omega: 97.49385,         // Longitude of ascending node Ω (degrees) - MPC
    w: 270.78989,            // Argument of periapsis ω (degrees) - MPC
    T: new Date('2025-10-08T00:00:00Z'), // Perihelion Oct 8, 2025
  },
  WIERZCHOS: {
    e: 1.00004883,           // Eccentricity (marginally hyperbolic)
    q: 0.56584101,           // Perihelion distance (AU)
    i: 75.23838,             // Inclination (degrees) - high but not retrograde
    omega: 108.08299,        // Longitude of ascending node Ω (degrees)
    w: 243.63942,            // Argument of periapsis ω (degrees)
    T: new Date('2026-01-20T00:00:00Z'), // Perihelion Jan 20, 2026
  },
};
