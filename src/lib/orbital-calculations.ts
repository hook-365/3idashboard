/**
 * Orbital Calculations Library
 *
 * Pure calculation functions for orbital mechanics, trajectory integration,
 * and coordinate transformations. Extracted from solar-system-position API route.
 *
 * These functions handle:
 * - Coordinate transformations (equatorial to ecliptic)
 * - Kepler orbital mechanics for hyperbolic orbits
 * - Numerical integration for trajectory calculation
 * - Backward/forward orbital trail generation
 * - RA/DEC calculation from orbital elements
 */

import * as Astronomy from 'astronomy-engine';
import logger from '@/lib/logger';

/**
 * Convert equatorial coordinates to ecliptic coordinates
 * astronomy-engine returns J2000 equatorial, JPL returns ecliptic
 * Rotation angle = obliquity of ecliptic = 23.4392811 degrees (J2000)
 */
export function equatorialToEcliptic(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const obliquity = 23.4392811 * Math.PI / 180; // radians
  const cos_obl = Math.cos(obliquity);
  const sin_obl = Math.sin(obliquity);

  return {
    x: x,
    y: y * cos_obl + z * sin_obl,
    z: -y * sin_obl + z * cos_obl
  };
}

/**
 * Calculate position from orbital elements using proper Kepler mechanics
 * Handles hyperbolic orbits (e > 1) for interstellar objects
 */
export function calculatePositionFromElements(
  daysFromPerihelion: number,
  elements: {
    e: number;       // eccentricity
    q: number;       // perihelion distance (AU)
    i: number;       // inclination (degrees)
    omega: number;   // argument of periapsis (degrees)
    node: number;    // longitude of ascending node (degrees)
  }
): { x: number; y: number; z: number } {
  const { e, q, i, omega, node } = elements;

  // Convert angles to radians
  const i_rad = i * Math.PI / 180;
  const omega_rad = omega * Math.PI / 180;
  const node_rad = node * Math.PI / 180;

  // Standard gravitational parameter for Sun (AU^3/day^2)
  const mu = 2.9591220828559115e-04; // GM_sun in AU^3/day^2

  // Semi-major axis (negative for hyperbolic orbits)
  const a = q / (1 - e);

  // Mean motion
  const n = Math.sqrt(Math.abs(mu / (a * a * a)));

  // Mean anomaly
  const M = n * daysFromPerihelion;

  // Solve Kepler's equation for hyperbolic orbits: M = e*sinh(H) - H
  // Using Newton-Raphson iteration
  let H = M; // Initial guess for hyperbolic anomaly
  let converged = false;
  for (let iter = 0; iter < 20; iter++) {
    const f = e * Math.sinh(H) - H - M;
    const df = e * Math.cosh(H) - 1;
    H = H - f / df;
    if (Math.abs(f) < 1e-10) {
      converged = true;
      break;
    }
  }

  if (!converged && Math.abs(daysFromPerihelion) < 100) {
    logger.warn({ daysFromPerihelion: parseFloat(daysFromPerihelion.toFixed(1)), meanAnomaly: parseFloat(M.toFixed(4)), hyperbolicAnomaly: parseFloat(H.toFixed(4)) }, 'Kepler solver did not converge');
  }

  // True anomaly from hyperbolic anomaly
  // For hyperbolic orbits: tan(v/2) = sqrt((e+1)/(e-1)) * tanh(H/2)
  const tanHalfNu = Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2);
  const nu = 2 * Math.atan(tanHalfNu);

  // Distance from sun (for hyperbolic orbits, denominator can approach zero at asymptotes)
  const r = a * (1 - e * e) / (1 + e * Math.cos(nu));

  // Position in orbital plane
  const x_orb = r * Math.cos(nu);
  const y_orb = r * Math.sin(nu);

  // Debug key points
  if (Math.abs(daysFromPerihelion) < 1 || Math.abs(daysFromPerihelion - 30) < 1 || Math.abs(daysFromPerihelion + 30) < 1) {
    logger.info({ days: parseFloat(daysFromPerihelion.toFixed(1)), M: parseFloat(M.toFixed(4)), H: parseFloat(H.toFixed(4)), trueAnomaly_deg: parseFloat((nu * 180 / Math.PI).toFixed(2)), distance_au: parseFloat(r.toFixed(3)) }, 'Orbital key point');
  }

  // Rotation matrices to convert from orbital plane to ecliptic coordinates
  const cos_omega = Math.cos(omega_rad);
  const sin_omega = Math.sin(omega_rad);
  const cos_node = Math.cos(node_rad);
  const sin_node = Math.sin(node_rad);
  const cos_i = Math.cos(i_rad);
  const sin_i = Math.sin(i_rad);

  // Transform to ecliptic coordinates
  const x = (cos_node * cos_omega - sin_node * sin_omega * cos_i) * x_orb +
            (-cos_node * sin_omega - sin_node * cos_omega * cos_i) * y_orb;

  const y = (sin_node * cos_omega + cos_node * sin_omega * cos_i) * x_orb +
            (-sin_node * sin_omega + cos_node * cos_omega * cos_i) * y_orb;

  const z = (sin_omega * sin_i) * x_orb +
            (cos_omega * sin_i) * y_orb;

  return { x, y, z };
}

/**
 * Calculate projection from JPL state vectors using numerical integration
 */
export function calculateAtlasProjectionFromStateVectors(
  projectionDays: number,
  startDate: Date,
  position: [number, number, number],
  velocity: [number, number, number]
): Array<{date: string; x: number; y: number; z: number; distance_from_sun: number;}> {
  const projection: Array<{date: string; x: number; y: number; z: number; distance_from_sun: number;}> = [];

  // Standard gravitational parameter for Sun (AU^3/day^2)
  const mu = 2.9591220828559115e-04;

  // Current state
  const pos = [...position];
  const vel = [...velocity];
  const sampleInterval = 2; // days
  const maxDistance = 100; // AU

  for (let day = 0; day <= projectionDays; day += sampleInterval) {
    const date = new Date(startDate.getTime() + (day * 24 * 60 * 60 * 1000));
    const distance_from_sun = Math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2);

    projection.push({
      date: date.toISOString(),
      x: pos[0],
      y: pos[1],
      z: pos[2],
      distance_from_sun
    });

    if (distance_from_sun > maxDistance) {
      logger.warn({ distance_au: parseFloat(distance_from_sun.toFixed(1)), maxDistance_au: maxDistance }, 'Projection stopped at max distance');
      break;
    }

    // Simple Euler integration for forward propagation
    const r = distance_from_sun;
    const acc = [-mu * pos[0] / (r**3), -mu * pos[1] / (r**3), -mu * pos[2] / (r**3)];

    // Update velocity and position (timestep = sampleInterval days)
    vel[0] += acc[0] * sampleInterval;
    vel[1] += acc[1] * sampleInterval;
    vel[2] += acc[2] * sampleInterval;

    pos[0] += vel[0] * sampleInterval;
    pos[1] += vel[1] * sampleInterval;
    pos[2] += vel[2] * sampleInterval;
  }

  logger.info({ pointCount: projection.length }, 'Calculated projection points from JPL state vectors');
  return projection;
}

/**
 * Calculate 3I/ATLAS orbital trail using backward numerical integration from current state
 */
export function calculateAtlasTrailFromOrbit(
  trailDays: number,
  currentPos: [number, number, number],
  currentVel: [number, number, number]
): Array<{
  date: string;
  x: number;
  y: number;
  z: number;
  distance_from_sun: number;
}> {
  const trail: Array<{date: string; x: number; y: number; z: number; distance_from_sun: number;}> = [];

  // Standard gravitational parameter for Sun (AU^3/day^2)
  const mu = 2.9591220828559115e-04;

  // Current state (we'll integrate backward)
  const pos = [...currentPos];
  const vel = [...currentVel];
  const currentDate = new Date();
  const sampleInterval = 2; // days

  // Discovery date: June 14, 2025 (earliest pre-discovery observations)
  const discoveryDate = new Date('2025-06-14T00:00:00Z');
  const daysSinceDiscovery = (currentDate.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60 * 24);

  // Limit trail to discovery date (don't extrapolate before we have data)
  const effectiveTrailDays = Math.min(trailDays, Math.floor(daysSinceDiscovery));
  const numSteps = Math.floor(effectiveTrailDays / sampleInterval);

  logger.info({ effectiveTrailDays, discoveryDate: '2025-06-14' }, 'Trail limited to days since discovery');

  // Integrate backward in time
  for (let step = 0; step <= numSteps; step++) {
    const date = new Date(currentDate.getTime() - (step * sampleInterval * 24 * 60 * 60 * 1000));
    const distance_from_sun = Math.sqrt(pos[0]**2 + pos[1]**2 + pos[2]**2);

    // Store position (we'll reverse the array later)
    trail.push({
      date: date.toISOString(),
      x: pos[0],
      y: pos[1],
      z: pos[2],
      distance_from_sun
    });

    // Don't integrate after the last point
    if (step < numSteps) {
      // Backward Euler integration
      const r = distance_from_sun;
      const acc = [-mu * pos[0] / (r**3), -mu * pos[1] / (r**3), -mu * pos[2] / (r**3)];

      // Update position using current velocity (before updating velocity)
      pos[0] -= vel[0] * sampleInterval;
      pos[1] -= vel[1] * sampleInterval;
      pos[2] -= vel[2] * sampleInterval;

      // Then update velocity (negative timestep for backward integration)
      vel[0] -= acc[0] * sampleInterval;
      vel[1] -= acc[1] * sampleInterval;
      vel[2] -= acc[2] * sampleInterval;
    }
  }

  // Reverse array so it goes from oldest to newest
  trail.reverse();

  logger.info({ pointCount: trail.length }, 'Calculated trail points using backward numerical integration');
  if (trail.length > 0) {
    logger.info({
      first: { x: parseFloat(trail[0].x.toFixed(3)), y: parseFloat(trail[0].y.toFixed(3)) },
      last: { x: parseFloat(trail[trail.length-1].x.toFixed(3)), y: parseFloat(trail[trail.length-1].y.toFixed(3)) }
    }, 'Trail endpoints');
  }
  logger.info({
    position: { x: parseFloat(currentPos[0].toFixed(3)), y: parseFloat(currentPos[1].toFixed(3)) }
  }, 'Input position for trail calculation');
  return trail;
}

/**
 * Calculate RA/DEC from 3I/ATLAS orbital elements
 * Uses our known orbital elements to compute observer-centric sky position
 *
 * @param date - Date to calculate position for (defaults to now)
 * @returns Object with RA (degrees), DEC (degrees), and last_updated timestamp
 */
export function calculateAtlasRADEC(date: Date = new Date()): { ra: number; dec: number; last_updated: string } {
  // 3I/ATLAS orbital elements from Minor Planet Center MPEC 2025-N12 (Official)
  // IMPORTANT: Must match values in /src/lib/jsorrery/scenario/scenarios/bodies/atlas3i.js
  // Source: https://minorplanetcenter.net/mpec/K25/K25N12.html
  const q = 1.3745928;  // Perihelion distance (AU) - official MPC value
  const e = 6.2769203;  // Eccentricity (highly hyperbolic - fastest interstellar object known)
  const _a = q / (1 - e); // Semi-major axis: a = q/(1-e) = -0.26044 AU (negative for hyperbolic)

  const elements = {
    e: e,             // Eccentricity (hyperbolic)
    q: q,             // Perihelion distance (AU)
    i: 175.11669,     // Inclination (degrees) - retrograde, ~5° from ecliptic plane
    omega: 127.79317, // Argument of periapsis (degrees)
    node: 322.27219,  // Longitude of ascending node (degrees)
  };

  // Perihelion date: October 29, 2025 05:03:46 UTC (2025 Oct. 29.21095 TT from MPC)
  const perihelion = new Date('2025-10-29T05:03:46.000Z');
  const daysFromPerihelion = (date.getTime() - perihelion.getTime()) / (1000 * 60 * 60 * 24);

  // Calculate comet's heliocentric ecliptic position
  const cometPos = calculatePositionFromElements(daysFromPerihelion, elements);

  // Get Earth's heliocentric equatorial position
  const earthVec = Astronomy.HelioVector(Astronomy.Body.Earth, date);

  // Convert comet position from ecliptic to equatorial
  const obliquity = 23.4392811 * Math.PI / 180; // J2000 obliquity
  const cos_obl = Math.cos(obliquity);
  const sin_obl = Math.sin(obliquity);

  const comet_eq = {
    x: cometPos.x,
    y: cometPos.y * cos_obl - cometPos.z * sin_obl,
    z: cometPos.y * sin_obl + cometPos.z * cos_obl
  };

  // Calculate geocentric position (comet - Earth)
  const geo_x = comet_eq.x - earthVec.x;
  const geo_y = comet_eq.y - earthVec.y;
  const geo_z = comet_eq.z - earthVec.z;

  // Convert geocentric XYZ to RA/DEC
  const distance = Math.sqrt(geo_x * geo_x + geo_y * geo_y + geo_z * geo_z);

  // RA = atan2(y, x) converted to degrees
  let ra = Math.atan2(geo_y, geo_x) * 180 / Math.PI;
  if (ra < 0) ra += 360; // Normalize to 0-360

  // DEC = asin(z / distance) converted to degrees
  const dec = Math.asin(geo_z / distance) * 180 / Math.PI;

  return {
    ra,
    dec,
    last_updated: date.toISOString()
  };
}

/**
 * Calculate angular separation between two celestial coordinates
 * Uses the spherical law of cosines for accurate separation calculation
 *
 * @param ra1 Right Ascension 1 (degrees)
 * @param dec1 Declination 1 (degrees)
 * @param ra2 Right Ascension 2 (degrees)
 * @param dec2 Declination 2 (degrees)
 * @returns Angular separation in arcseconds
 */
export function calculateAngularSeparation(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number
): number {
  // Convert degrees to radians
  const ra1_rad = ra1 * Math.PI / 180;
  const dec1_rad = dec1 * Math.PI / 180;
  const ra2_rad = ra2 * Math.PI / 180;
  const dec2_rad = dec2 * Math.PI / 180;

  // Spherical law of cosines:
  // cos(angle) = sin(dec1)*sin(dec2) + cos(dec1)*cos(dec2)*cos(ra1-ra2)
  const cos_angle = Math.sin(dec1_rad) * Math.sin(dec2_rad) +
                    Math.cos(dec1_rad) * Math.cos(dec2_rad) * Math.cos(ra1_rad - ra2_rad);

  // Clamp to [-1, 1] to avoid numerical errors with acos
  const clamped = Math.max(-1, Math.min(1, cos_angle));

  // Angular separation in radians
  const angle_rad = Math.acos(clamped);

  // Convert to arcseconds (1 radian = 206265 arcseconds)
  const angle_arcsec = angle_rad * 206264.806247;

  return angle_arcsec;
}

/**
 * Convert angular separation to linear distance
 *
 * @param angularSeparation Angular separation in arcseconds
 * @param distance Distance to object in AU
 * @returns Linear distance in AU
 */
export function angularToLinearDistance(
  angularSeparation: number,
  distance: number
): number {
  // Convert arcseconds to radians
  const angle_rad = angularSeparation / 206264.806247;

  // For small angles, linear distance ≈ distance × angle (in radians)
  // This is the small-angle approximation
  const linear_distance_au = distance * angle_rad;

  return linear_distance_au;
}

/**
 * Convert RA/Dec (equatorial coordinates) + distance to heliocentric XYZ
 *
 * This function converts sky coordinates (what observers see) into 3D heliocentric
 * coordinates (position relative to the Sun in solar system space).
 *
 * Steps:
 * 1. Convert RA/Dec to geocentric unit vector (from Earth to comet)
 * 2. Scale by geocentric distance to get geocentric position
 * 3. Get Earth's heliocentric position from astronomy-engine
 * 4. Add geocentric vector to Earth's position to get heliocentric comet position
 * 5. Convert from equatorial to ecliptic coordinates (for consistency with JPL data)
 *
 * @param ra - Right Ascension in degrees (0-360)
 * @param dec - Declination in degrees (-90 to +90)
 * @param geocentricDistance - Distance from Earth in AU
 * @param date - Date for Earth position calculation (defaults to now)
 * @returns Heliocentric position in ecliptic coordinates (x, y, z) in AU
 */
export function raDecToHeliocentric(
  ra: number,
  dec: number,
  geocentricDistance: number,
  date: Date = new Date()
): { x: number; y: number; z: number; distance_from_sun: number } {
  // Convert RA/Dec from degrees to radians
  const ra_rad = ra * Math.PI / 180;
  const dec_rad = dec * Math.PI / 180;

  // Convert RA/Dec to geocentric equatorial unit vector
  // RA is measured eastward from vernal equinox (x-axis)
  // Dec is measured north from celestial equator
  const geocentric_equatorial = {
    x: Math.cos(dec_rad) * Math.cos(ra_rad),
    y: Math.cos(dec_rad) * Math.sin(ra_rad),
    z: Math.sin(dec_rad)
  };

  // Scale by geocentric distance to get position relative to Earth
  const geocentric_pos = {
    x: geocentric_equatorial.x * geocentricDistance,
    y: geocentric_equatorial.y * geocentricDistance,
    z: geocentric_equatorial.z * geocentricDistance
  };

  // Get Earth's heliocentric position in equatorial coordinates
  const earthVec = Astronomy.HelioVector(Astronomy.Body.Earth, date);

  // Add geocentric position to Earth's position to get heliocentric position
  const heliocentric_equatorial = {
    x: earthVec.x + geocentric_pos.x,
    y: earthVec.y + geocentric_pos.y,
    z: earthVec.z + geocentric_pos.z
  };

  // Convert from equatorial to ecliptic coordinates for consistency with JPL data
  // (astronomy-engine returns equatorial, JPL uses ecliptic)
  const heliocentric_ecliptic = equatorialToEcliptic(
    heliocentric_equatorial.x,
    heliocentric_equatorial.y,
    heliocentric_equatorial.z
  );

  // Calculate heliocentric distance
  const distance_from_sun = Math.sqrt(
    heliocentric_ecliptic.x ** 2 +
    heliocentric_ecliptic.y ** 2 +
    heliocentric_ecliptic.z ** 2
  );

  return {
    ...heliocentric_ecliptic,
    distance_from_sun
  };
}