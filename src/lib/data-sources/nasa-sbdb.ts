/**
 * NASA Small-Body Database (SBDB) API
 *
 * Provides orbital elements and physical parameters for asteroids and comets
 * Used as fallback when JPL Horizons is unavailable
 *
 * API Documentation: https://ssd-api.jpl.nasa.gov/doc/sbdb.html
 */

export interface SBDBOrbitalElements {
  epoch: number;           // Julian Date of epoch
  e: number;               // Eccentricity
  a?: number;              // Semi-major axis (AU) - undefined for hyperbolic orbits
  q: number;               // Perihelion distance (AU)
  i: number;               // Inclination (degrees)
  om: number;              // Longitude of ascending node (degrees)
  w: number;               // Argument of perihelion (degrees)
  tp: number;              // Time of perihelion passage (Julian Date)
  ma?: number;             // Mean anomaly (degrees)
  n?: number;              // Mean motion (degrees/day)
}

export interface SBDBResponse {
  object: {
    fullname: string;
    shortname: string;
    des: string;
    orbit_class?: {
      name: string;
      code: string;
    };
  };
  orbit: SBDBOrbitalElements;
  signature?: {
    source: string;
    version: string;
  };
}

/**
 * Fetch orbital elements from NASA Small-Body Database
 * Returns orbital elements that can be used to calculate positions
 */
export async function fetchSBDBData(designation: string = '3I'): Promise<SBDBResponse | null> {
  try {
    const url = `https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(designation)}&full-prec=true`;
    console.log(`Fetching SBDB data for ${designation}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': '3I-ATLAS-Dashboard/1.0'
      }
    });

    if (!response.ok) {
      console.error(`SBDB API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.orbit) {
      console.warn('SBDB response missing orbital elements');
      return null;
    }

    console.log(`✓ Successfully fetched SBDB data for ${data.object?.fullname || designation}`);
    return data;
  } catch (error) {
    console.error('Error fetching SBDB data:', error);
    return null;
  }
}

/**
 * Calculate position from orbital elements using Kepler's equations
 * This is a simplified calculation - for precise positions use JPL Horizons
 */
export function calculatePositionFromElements(
  elements: SBDBOrbitalElements,
  jd: number
): [number, number, number] | null {
  try {
    const { e, q, i, om, w, tp } = elements;

    // Convert angles to radians
    const i_rad = (i * Math.PI) / 180;
    const om_rad = (om * Math.PI) / 180;
    const w_rad = (w * Math.PI) / 180;

    // Calculate time since perihelion (days)
    const dt = jd - tp;

    // For hyperbolic orbits (e > 1), use hyperbolic anomaly
    if (e > 1) {
      // Mean motion for hyperbolic orbit
      const mu = 0.01720209895; // Gaussian gravitational constant (AU^3/2 / day)
      const a_hyp = q / (e - 1); // Semi-major axis for hyperbola (negative)
      const n = mu / Math.sqrt(Math.abs(a_hyp) ** 3);

      // Mean anomaly
      const M = n * dt;

      // Solve Kepler's equation for hyperbolic orbit (Newton-Raphson)
      let H = M; // Initial guess for hyperbolic anomaly
      for (let iter = 0; iter < 20; iter++) {
        const f = e * Math.sinh(H) - H - M;
        const fp = e * Math.cosh(H) - 1;
        const dH = -f / fp;
        H += dH;
        if (Math.abs(dH) < 1e-10) break;
      }

      // True anomaly from hyperbolic anomaly
      const nu = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(H / 2));

      // Distance from sun
      const r = q * (1 + e) / (1 + e * Math.cos(nu));

      // Position in orbital plane
      const x_orb = r * Math.cos(nu);
      const y_orb = r * Math.sin(nu);

      // Rotate to ecliptic coordinates
      const cos_w = Math.cos(w_rad);
      const sin_w = Math.sin(w_rad);
      const cos_om = Math.cos(om_rad);
      const sin_om = Math.sin(om_rad);
      const cos_i = Math.cos(i_rad);
      const sin_i = Math.sin(i_rad);

      // Transformation matrix components
      const x = (cos_w * cos_om - sin_w * sin_om * cos_i) * x_orb +
                (-sin_w * cos_om - cos_w * sin_om * cos_i) * y_orb;
      const y = (cos_w * sin_om + sin_w * cos_om * cos_i) * x_orb +
                (-sin_w * sin_om + cos_w * cos_om * cos_i) * y_orb;
      const z = (sin_w * sin_i) * x_orb + (cos_w * sin_i) * y_orb;

      return [x, y, z];
    }

    // For elliptical orbits (not expected for 3I/ATLAS)
    console.warn('Elliptical orbit calculation not fully implemented');
    return null;
  } catch (error) {
    console.error('Error calculating position from orbital elements:', error);
    return null;
  }
}

/**
 * Convert Gregorian date to Julian Date
 */
export function dateToJulian(date: Date): number {
  const a = Math.floor((14 - (date.getMonth() + 1)) / 12);
  const y = date.getFullYear() + 4800 - a;
  const m = (date.getMonth() + 1) + 12 * a - 3;

  const jd = date.getDate() + Math.floor((153 * m + 2) / 5) + 365 * y +
           Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Add time of day
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();

  const dayFraction = (hours + minutes / 60 + seconds / 3600 + milliseconds / 3600000) / 24;

  return jd + dayFraction - 0.5;
}

/**
 * Get 3I/ATLAS position using SBDB orbital elements
 * This is a fallback when JPL Horizons is unavailable
 */
export async function getSBDBPosition(date: Date = new Date()): Promise<{
  position: [number, number, number];
  source: string;
  quality: 'approximate';
} | null> {
  const sbdbData = await fetchSBDBData('3I');

  if (!sbdbData || !sbdbData.orbit) {
    return null;
  }

  const jd = dateToJulian(date);
  const position = calculatePositionFromElements(sbdbData.orbit, jd);

  if (!position) {
    return null;
  }

  return {
    position,
    source: 'NASA_SBDB',
    quality: 'approximate'
  };
}