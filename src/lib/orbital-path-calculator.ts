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

  // Apply rotations: argument of periapsis → inclination → ascending node
  // Step 1: Rotate by argument of periapsis (w)
  const x1 = x_orb * cos_w - y_orb * sin_w;
  const y1 = x_orb * sin_w + y_orb * cos_w;
  const z1 = z_orb;

  // Step 2: Rotate by inclination (i)
  const x2 = x1;
  const y2 = y1 * cos_i - z1 * sin_i;
  const z2 = y1 * sin_i + z1 * cos_i;

  // Step 3: Rotate by ascending node (omega)
  const x3 = x2 * cos_omega - y2 * sin_omega;
  const y3 = x2 * sin_omega + y2 * cos_omega;
  const z3 = z2;

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
    console.warn('Perihelion date (T) required for position calculation');
    return null;
  }

  // Days from perihelion
  const daysFromPerihelion =
    (date.getTime() - T.getTime()) / (1000 * 60 * 60 * 24);

  // Semi-major axis (negative for hyperbolic)
  const a = q / (1 - e);

  // Mean motion (radians per day)
  const mu = 2.959122082855911e-4; // GM_sun in AU^3/day^2
  const n = Math.sqrt(Math.abs(mu / (a * a * a)));

  // Mean anomaly
  const M = n * daysFromPerihelion;

  // Solve Kepler's equation using Newton-Raphson
  let nu: number; // true anomaly

  if (e >= 1.0) {
    // Hyperbolic anomaly H
    let H = M;
    for (let iter = 0; iter < 20; iter++) {
      const f = e * Math.sinh(H) - H - M;
      const df = e * Math.cosh(H) - 1;
      H = H - f / df;
      if (Math.abs(f) < 1e-10) break;
    }

    // True anomaly from hyperbolic anomaly
    const tanHalfNu = Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2);
    nu = 2 * Math.atan(tanHalfNu);
  } else {
    // Eccentric anomaly E
    let E = M;
    for (let iter = 0; iter < 20; iter++) {
      const f = E - e * Math.sin(E) - M;
      const df = 1 - e * Math.cos(E);
      E = E - f / df;
      if (Math.abs(f) < 1e-10) break;
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
    console.log(`[calculateOrbitPointsWithDates] Skipped ${skippedPoints} points (beyond 50 AU or calculation failed) for ${T.toISOString().split('T')[0]} (e=${e.toFixed(4)}, q=${q.toFixed(2)})`);
  }
  console.log(`[calculateOrbitPointsWithDates] Generated ${points.length} orbit points using Kepler equation solver over ${dayRange * 2} day span`);

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
    e: 0.99936929,           // Eccentricity (near-parabolic)
    q: 0.50347198,           // Perihelion distance (AU)
    i: 4.47016709,           // Inclination (degrees)
    omega: 335.67455839,     // Longitude of ascending node Ω (degrees)
    w: 307.76903517,         // Argument of periapsis ω (degrees)
    T: new Date('2025-09-12T00:00:00Z'), // Perihelion Sep 12, 2025
  },
  LEMMON: {
    e: 0.99576389,           // Eccentricity (near-parabolic)
    q: 0.52918319,           // Perihelion distance (AU)
    i: 143.63261677,         // Inclination (degrees)
    omega: 108.09789996,     // Longitude of ascending node Ω (degrees)
    w: 132.99513300,         // Argument of periapsis ω (degrees)
    T: new Date('2025-11-08T00:00:00Z'), // Perihelion Nov 8, 2025
  },
  K1: {
    e: 1.00153256,           // Eccentricity (hyperbolic - will escape solar system)
    q: 0.33543043,           // Perihelion distance (AU)
    i: 147.90080333,         // Inclination (degrees)
    omega: 97.48797247,      // Longitude of ascending node Ω (degrees)
    w: 270.79200919,         // Argument of periapsis ω (degrees)
    T: new Date('2025-10-08T00:00:00Z'), // Perihelion Oct 8, 2025
  },
  WIERZCHOS: {
    e: 1.00004883,           // Eccentricity (hyperbolic - will escape solar system)
    q: 0.56584101,           // Perihelion distance (AU)
    i: 75.23838445,          // Inclination (degrees)
    omega: 108.08299210,     // Longitude of ascending node Ω (degrees)
    w: 243.63942205,         // Argument of periapsis ω (degrees)
    T: new Date('2026-01-20T00:00:00Z'), // Perihelion Jan 20, 2026
  },
};
