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
 */

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
    console.warn(`Warning: Kepler solver did not converge for days=${daysFromPerihelion.toFixed(1)}, M=${M.toFixed(4)}, H=${H.toFixed(4)}`);
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
    console.log(`days=${daysFromPerihelion.toFixed(1)}, M=${M.toFixed(4)}, H=${H.toFixed(4)}, v=${(nu * 180 / Math.PI).toFixed(2)} deg, r=${r.toFixed(3)} AU`);
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
      console.log(`Warning: Projection stopped at ${distance_from_sun.toFixed(1)} AU`);
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

  console.log(`Calculated ${projection.length} projection points from JPL state vectors`);
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

  console.log(`Trail limited to ${effectiveTrailDays} days (since discovery on June 14, 2025)`);

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

  console.log(`Calculated ${trail.length} trail points using backward numerical integration from JPL state vectors`);
  if (trail.length > 0) {
    console.log(`Trail endpoints: first=(${trail[0].x.toFixed(3)}, ${trail[0].y.toFixed(3)}), last=(${trail[trail.length-1].x.toFixed(3)}, ${trail[trail.length-1].y.toFixed(3)})`);
  }
  console.log(`Input position: (${currentPos[0].toFixed(3)}, ${currentPos[1].toFixed(3)})`);
  return trail;
}