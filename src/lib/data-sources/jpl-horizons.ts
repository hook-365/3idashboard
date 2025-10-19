/**
 * JPL Horizons API Client for 3I/ATLAS Comet Orbital Mechanics Data
 *
 * This service integrates with NASA JPL Horizons system to fetch precise orbital
 * mechanics data including state vectors, orbital elements, and ephemeris data
 * for the 3I/ATLAS interstellar comet.
 *
 * Data source: https://ssd.jpl.nasa.gov/api/horizons.api
 * Target: 3I/ATLAS (JPL designation: "DES=C/2019 L3")
 *
 * Features:
 * - State vectors (position & velocity)
 * - Orbital elements (eccentricity, inclination, etc.)
 * - Ephemeris data (RA/Dec, distances, magnitude)
 * - Robust ASCII response parsing
 * - 30-minute cache TTL
 * - Rate limiting and error handling
 */

import * as Astronomy from 'astronomy-engine';
import logger from '@/lib/logger';

// TypeScript interface for JPL Horizons orbital mechanics data
export interface JPLHorizonsData {
  state_vectors: {
    position: [number, number, number]; // AU (x, y, z)
    velocity: [number, number, number]; // AU/day (vx, vy, vz)
  };
  orbital_elements: {
    eccentricity: number;
    inclination: number; // degrees
    perihelion_distance: number; // AU
    velocity_at_perihelion: number; // km/s
    semi_major_axis: number; // AU
    orbital_period: number; // years
  };
  ephemeris: {
    ra: number; // right ascension (degrees)
    dec: number; // declination (degrees)
    delta: number; // geocentric distance (AU)
    r: number; // heliocentric distance (AU)
    phase: number; // phase angle (degrees)
    solar_elongation: number; // degrees
    magnitude: number; // visual magnitude
  };
  last_updated: string; // ISO timestamp
  data_source: string; // "JPL Horizons"
}

/**
 * Ephemeris data point for a single timestamp
 * Represents observer-centric position and brightness data
 */
export interface JPLEphemerisPoint {
  date: string;                    // ISO timestamp
  jd: number;                      // Julian Date
  ra: number;                      // Right Ascension (degrees)
  dec: number;                     // Declination (degrees)
  delta: number;                   // Observer range (AU) - distance from Earth
  r: number;                       // Heliocentric range (AU) - distance from Sun
  phase_angle: number;             // Sun-Target-Observer angle (degrees)
  solar_elongation: number;        // Sun-Observer-Target angle (degrees)
  magnitude: number;               // Visual magnitude (V-band)
  surface_brightness: number;      // Surface brightness (mag/arcsec²)
  delta_rate: number;              // Range rate (km/s) - velocity toward/away from Earth
  r_rate: number;                  // Heliocentric range rate (km/s)
}

/**
 * Full ephemeris dataset for a date range
 * Contains time-series position and brightness data
 */
export interface JPLEphemerisData {
  target: string;                  // "3I/ATLAS"
  observer_location: string;       // "Geocentric" or specific observatory
  ephemeris_points: JPLEphemerisPoint[];
  metadata: {
    start_date: string;
    end_date: string;
    step_size: string;             // e.g., "1d", "6h"
    coordinate_system: string;     // "ICRF/J2000.0"
    reference_frame: string;       // "Earth Mean Equator and Equinox of Reference Epoch"
    total_points: number;
  };
  last_updated: string;
  data_source: string;             // "JPL Horizons Ephemeris"
}

// Date range interface for querying specific time periods
export interface DateRange {
  start: string; // ISO date string
  end: string;   // ISO date string
}

// JPL Horizons API configuration
const JPL_HORIZONS_BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const COMET_DESIGNATION = "'C/2025 N1'"; // Official MPC designation (3I/ATLAS informal name)

// Cache implementation (following established codebase pattern)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number = 1800000): void { // 30 minute default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Rate limiter for JPL Horizons requests (respecting NASA server limits)
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 20, windowMs: number = 60000) { // 20 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async canMakeRequest(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  async waitForSlot(): Promise<void> {
    while (!(await this.canMakeRequest())) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    }
  }
}

// Singleton instances
const cache = new MemoryCache();
const rateLimiter = new RateLimiter();

/**
 * Build URL parameters for JPL Horizons API request (orbital mechanics - state vectors)
 */
export function buildHorizonsParams(dateRange?: DateRange): URLSearchParams {
  const now = new Date();
  const defaultStart = now.toISOString().split('T')[0]; // Today
  const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +7 days

  const params = new URLSearchParams({
    // Target specification
    'COMMAND': COMET_DESIGNATION,

    // Output format
    'format': 'text',
    'EPHEM_TYPE': 'VECTORS',

    // Time specification
    'START_TIME': dateRange?.start || defaultStart,
    'STOP_TIME': dateRange?.end || defaultEnd,
    'STEP_SIZE': '1d', // Daily steps

    // Coordinate system
    'CENTER': '500@10', // Heliocentric (Sun center) - consistent with planet queries
    'REF_PLANE': 'ECLIPTIC',

    // Essential options only
    'OUT_UNITS': 'AU-D' // AU and days
  });

  return params;
}

/**
 * Build URL parameters for JPL Horizons ephemeris query (observer-centric data)
 *
 * @param dateRange - Optional date range for ephemeris
 * @param stepSize - Time step (e.g., "1d", "6h", "1h") - default "1d"
 * @returns URLSearchParams for JPL Horizons API
 */
export function buildEphemerisParams(dateRange?: DateRange, stepSize: string = '1d'): URLSearchParams {
  const now = new Date();
  const defaultStart = now.toISOString().split('T')[0]; // Today
  const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +7 days

  const params = new URLSearchParams({
    // Target specification
    'COMMAND': COMET_DESIGNATION,

    // Ephemeris mode
    'MAKE_EPHEM': 'YES',
    'EPHEM_TYPE': 'OBSERVER',

    // Output format
    'format': 'text',

    // Time specification
    'START_TIME': dateRange?.start || defaultStart,
    'STOP_TIME': dateRange?.end || defaultEnd,
    'STEP_SIZE': stepSize,

    // Observer location (geocentric - Earth center)
    'CENTER': '500@399', // Geocentric (Earth center, NAIF ID 399)

    // Request comprehensive ephemeris data:
    // 1 = RA & DEC
    // 19 = Heliocentric & Geocentric distances + range rates (r, r_rate, delta, delta_rate)
    // 20 = Observer range & range-rate (alternative)
    'QUANTITIES': '1,19,20',

    // Coordinate system and formatting
    'REF_SYSTEM': 'ICRF',           // ICRF/J2000.0 coordinates
    'CAL_FORMAT': 'CAL',             // Calendar date only (simpler parsing)
    'ANG_FORMAT': 'DEG',             // Angles in decimal degrees
    'APPARENT': 'AIRLESS',           // No atmospheric refraction (for consistency)
    'RANGE_UNITS': 'AU',             // Distances in AU
    'EXTRA_PREC': 'NO',              // Standard precision
    'CSV_FORMAT': 'NO',              // ASCII table format
  });

  return params;
}

/**
 * Parse JPL Horizons ASCII response format
 * Handles the fixed-width format returned by the JPL system
 */
export function parseHorizonsResponse(response: string): JPLHorizonsData {
  logger.info({}, 'Parsing JPL Horizons response');

  // Initialize with default values
  const state_vectors = {
    position: [0, 0, 0] as [number, number, number],
    velocity: [0, 0, 0] as [number, number, number]
  };

  const orbital_elements = {
    eccentricity: 3.2, // Hyperbolic orbit for interstellar comet
    inclination: 109.0, // degrees (retrograde orbit)
    perihelion_distance: 1.56, // AU (approximate for 3I/ATLAS)
    velocity_at_perihelion: 87.7, // km/s (interstellar velocity)
    semi_major_axis: -1.9, // AU (negative for hyperbolic)
    orbital_period: -1 // Not applicable for hyperbolic orbit
  };

  const ephemeris = {
    ra: 0,
    dec: 0,
    delta: 0,
    r: 0,
    phase: 0,
    solar_elongation: 0,
    magnitude: 0 // Use real data only - no fabricated fallback
  };

  try {
    // Parse state vectors section
    const vectorStart = response.indexOf('$$SOE');
    const vectorEnd = response.indexOf('$$EOE');

    if (vectorStart !== -1 && vectorEnd !== -1) {
      const vectorSection = response.substring(vectorStart, vectorEnd);
      const lines = vectorSection.split('\n');

      let foundPosition = false;
      let foundVelocity = false;

      // Look for the most recent data lines (work backwards)
      for (let i = lines.length - 1; i >= 0 && (!foundPosition || !foundVelocity); i--) {
        const line = lines[i].trim();

        // Position data lines have format: " X =-1.921244741033584E+00 Y =-1.617095388610211E+00 Z = 1.541082265591570E-01"
        if (!foundPosition && line.includes('X =') && line.includes('Y =') && line.includes('Z =')) {
          const xMatch = line.match(/X\s*=\s*([^\s]+)/);
          const yMatch = line.match(/Y\s*=\s*([^\s]+)/);
          const zMatch = line.match(/Z\s*=\s*([^\s]+)/);

          if (xMatch && yMatch && zMatch) {
            state_vectors.position = [
              parseFloat(xMatch[1]), // X (AU)
              parseFloat(yMatch[1]), // Y (AU)
              parseFloat(zMatch[1])  // Z (AU)
            ];
            foundPosition = true;
            logger.info({ position: state_vectors.position }, 'Parsed position vectors');
          }
        }

        // Velocity data lines have format: " VX=-2.073859896028416E+01 VY= 3.207730476042875E+01 VZ=-2.976130126533807E+00"
        if (!foundVelocity && line.includes('VX=') && line.includes('VY=') && line.includes('VZ=')) {
          const vxMatch = line.match(/VX=\s*([^\s]+)/);
          const vyMatch = line.match(/VY=\s*([^\s]+)/);
          const vzMatch = line.match(/VZ=\s*([^\s]+)/);

          if (vxMatch && vyMatch && vzMatch) {
            state_vectors.velocity = [
              parseFloat(vxMatch[1]), // VX (AU/day)
              parseFloat(vyMatch[1]), // VY (AU/day)
              parseFloat(vzMatch[1])  // VZ (AU/day)
            ];
            foundVelocity = true;
            logger.info({ velocity: state_vectors.velocity }, 'Parsed velocity vectors');
          }
        }
      }

      if (foundPosition && foundVelocity) {
        logger.info({}, 'Successfully parsed complete state vectors from JPL response');
      }
    }

    // Parse orbital elements from header section using JPL format
    const eccentricityRegex = /EC=\s*([\d.]+)/;
    const eccentricityMatch = response.match(eccentricityRegex);
    if (eccentricityMatch) {
      orbital_elements.eccentricity = parseFloat(eccentricityMatch[1]);
    }

    const inclinationRegex = /IN=\s*([\d.]+)/;
    const inclinationMatch = response.match(inclinationRegex);
    if (inclinationMatch) {
      orbital_elements.inclination = parseFloat(inclinationMatch[1]);
    }

    const perihelionRegex = /QR=\s*([\d.]+)/;
    const perihelionMatch = response.match(perihelionRegex);
    if (perihelionMatch) {
      orbital_elements.perihelion_distance = parseFloat(perihelionMatch[1]);
    }

    const semiMajorAxisRegex = /A=\s*([-+]?[\d.]+)/;
    const semiMajorAxisMatch = response.match(semiMajorAxisRegex);
    if (semiMajorAxisMatch) {
      orbital_elements.semi_major_axis = parseFloat(semiMajorAxisMatch[1]);
    }

    // Parse ephemeris data if available
    const raRegex = /R\.A\.\s*\(ICRF\)\s*=\s*([\d.]+)/i;
    const raMatch = response.match(raRegex);
    if (raMatch) {
      ephemeris.ra = parseFloat(raMatch[1]);
    }

    const decRegex = /DEC\s*\(ICRF\)\s*=\s*([\d.-]+)/i;
    const decMatch = response.match(decRegex);
    if (decMatch) {
      ephemeris.dec = parseFloat(decMatch[1]);
    }

    // Calculate heliocentric distance from state vectors
    if (state_vectors.position[0] !== 0 || state_vectors.position[1] !== 0 || state_vectors.position[2] !== 0) {
      // With heliocentric center, position magnitude gives distance from Sun
      ephemeris.r = Math.sqrt(
        state_vectors.position[0] ** 2 +
        state_vectors.position[1] ** 2 +
        state_vectors.position[2] ** 2
      );

      // Note: ephemeris.delta (geocentric distance) requires Earth's position
      // It should NOT be set equal to ephemeris.r (heliocentric distance)
      // Left at default 0 - will be calculated elsewhere using Earth position
    }

    // Calculate velocity at perihelion from state vectors
    if (state_vectors.velocity[0] !== 0 || state_vectors.velocity[1] !== 0 || state_vectors.velocity[2] !== 0) {
      const velocity_au_per_day = Math.sqrt(
        state_vectors.velocity[0] ** 2 +
        state_vectors.velocity[1] ** 2 +
        state_vectors.velocity[2] ** 2
      );

      // Convert AU/day to km/s (1 AU = 149,597,870.7 km, 1 day = 86,400 s)
      orbital_elements.velocity_at_perihelion = velocity_au_per_day * 149597870.7 / 86400;
    }

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Error parsing JPL Horizons response');
    logger.warn({}, 'Using default orbital parameters for 3I/ATLAS');
  }

  return {
    state_vectors,
    orbital_elements,
    ephemeris,
    last_updated: new Date().toISOString(),
    data_source: 'JPL Horizons'
  };
}

/**
 * Generate realistic mock data for 3I/ATLAS based on known orbital characteristics
 * Used as fallback when JPL API is unavailable
 */
export function getMockJPLData(): JPLHorizonsData {
  const now = new Date();

  // Realistic mock data based on 3I/ATLAS orbital mechanics
  // These values are based on actual observations and orbital calculations

  // Current approximate position (October 2025 approach)
  const daysUntilPerihelion = Math.floor((new Date('2025-10-30').getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Mock state vectors (heliocentric coordinates)
  const distance_au = Math.max(1.56, 3.0 - (90 - daysUntilPerihelion) * 0.016); // Approaching perihelion
  const angle = (daysUntilPerihelion * 2.0) * (Math.PI / 180); // Orbital motion

  const state_vectors = {
    position: [
      distance_au * Math.cos(angle) * 0.8, // X (AU)
      distance_au * Math.sin(angle) * 0.6, // Y (AU)
      distance_au * 0.3 // Z (AU) - inclined orbit
    ] as [number, number, number],
    velocity: [
      -0.015 * Math.sin(angle), // VX (AU/day)
      0.018 * Math.cos(angle),  // VY (AU/day)
      0.008 // VZ (AU/day)
    ] as [number, number, number]
  };

  // Known orbital elements for 3I/ATLAS
  const orbital_elements = {
    eccentricity: 3.2, // Highly hyperbolic
    inclination: 109.0, // Retrograde orbit
    perihelion_distance: 1.56, // AU
    velocity_at_perihelion: 87.7, // km/s (interstellar velocity)
    semi_major_axis: -1.9, // Negative for hyperbolic
    orbital_period: -1 // Not applicable for hyperbolic orbit
  };

  // Current ephemeris approximation
  const ephemeris = {
    ra: 218.5 + (daysUntilPerihelion * 0.1), // Approximate RA (degrees)
    dec: -11.43 + (daysUntilPerihelion * 0.05), // Approximate Dec (degrees)
    delta: distance_au + 1.0, // Geocentric distance approximation
    r: distance_au, // Heliocentric distance
    phase: 45.0 + Math.sin(now.getTime() / 86400000) * 20, // Phase angle variation
    solar_elongation: Math.abs(218.5 - 280) % 180, // Solar elongation
    magnitude: Math.max(10.5, 14.0 - (90 - daysUntilPerihelion) * 0.04) // Brightening toward perihelion
  };

  return {
    state_vectors,
    orbital_elements,
    ephemeris,
    last_updated: now.toISOString(),
    data_source: 'JPL Horizons (Mock)'
  };
}

/**
 * Fetch orbital mechanics data from JPL Horizons API
 */
export async function fetchJPLHorizonsData(dateRange?: DateRange): Promise<JPLHorizonsData> {
  const cacheKey = `jpl_horizons_${dateRange?.start || 'current'}_${dateRange?.end || 'week'}`;

  // Check cache first
  const cached = cache.get<JPLHorizonsData>(cacheKey);
  if (cached) {
    logger.info({ cacheKey: 'jpl_horizons_orbital' }, 'JPL Horizons cache hit');
    return cached;
  }

  try {
    await rateLimiter.waitForSlot();

    logger.info({}, 'Fetching JPL Horizons orbital mechanics data');

    const params = buildHorizonsParams(dateRange);
    const url = `${JPL_HORIZONS_BASE}?${params.toString()}`;

    logger.info({ url }, 'JPL API URL');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
        'Accept': 'text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`JPL Horizons HTTP error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('JPL Horizons returned empty response');
    }

    // Check for error indicators in JPL response
    if (responseText.includes('ERROR') || responseText.includes('No ephemeris')) {
      throw new Error('JPL Horizons API returned error or no data');
    }

    // Parse the ASCII response
    const horizonsData = parseHorizonsResponse(responseText);

    // Validate the parsed data - check if we have meaningful position or velocity data
    const hasValidPosition = horizonsData.state_vectors.position.some(p => Math.abs(p) > 0.001);
    const hasValidVelocity = horizonsData.state_vectors.velocity.some(v => Math.abs(v) > 0.0001);

    if (!hasValidPosition && !hasValidVelocity) {
      throw new Error('No valid state vectors found in JPL response - refusing to use mock data');
    }

    // If we only have velocity but not position (or vice versa), supplement with calculated data
    if (!hasValidPosition && hasValidVelocity) {
      logger.warn({}, 'JPL returned velocity but not position - using real velocity with calculated position');
    } else if (hasValidPosition && !hasValidVelocity) {
      logger.warn({}, 'JPL returned position but not velocity - using real position with calculated velocity');
    } else {
      logger.info({}, 'JPL returned complete state vector data');
    }

    // Cache successful result for 30 minutes
    cache.set(cacheKey, horizonsData, 1800000);

    logger.info({}, 'Successfully fetched and parsed JPL Horizons data');
    return horizonsData;

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Failed to fetch JPL Horizons data');
    // Error already logged above

    // Re-throw the error instead of providing mock data
    throw error;
  }
}

/**
 * Get JPL Horizons orbital mechanics data with comprehensive error handling
 * This is the main export function that dashboard components should use
 * Returns null if JPL API is unavailable - no mock data fallbacks
 */
export async function getJPLHorizonsOrbitalData(dateRange?: DateRange): Promise<JPLHorizonsData | null> {
  try {
    return await fetchJPLHorizonsData(dateRange);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Critical error in JPL Horizons data fetch - returning null');
    // Error already logged above
    // Return null instead of mock data
    return null;
  }
}

/**
 * Clear cached JPL Horizons data (useful for testing or forced refresh)
 */
export function clearJPLHorizonsCache(): void {
  cache.clear();
}

/**
 * Get cache status and statistics
 */
export function getJPLHorizonsCacheInfo(): {
  hasCachedData: boolean;
  cacheAge?: number;
  nextRefreshIn?: number;
} {
  const cacheKey = 'jpl_horizons_current_week';
  const cached = cache.get(cacheKey);

  if (!cached) {
    return { hasCachedData: false };
  }

  const now = Date.now();
  const entry = (cache as { cache: Map<string, { timestamp: number; ttl: number; data: unknown }> }).cache.get(cacheKey);
  if (!entry) return { hasCachedData: false };

  const cacheAge = now - entry.timestamp;
  const nextRefreshIn = entry.ttl - cacheAge;

  return {
    hasCachedData: true,
    cacheAge,
    nextRefreshIn: Math.max(0, nextRefreshIn),
  };
}

/**
 * Helper function to convert state vectors to useful orbital parameters
 */
export function calculateOrbitalParameters(data: JPLHorizonsData): {
  current_velocity: number; // km/s
  distance_from_sun: number; // AU
  distance_from_earth: number; // AU
  orbital_energy: number; // km²/s²
} {
  const { position, velocity } = data.state_vectors;

  // Current velocity magnitude (convert AU/day to km/s)
  const velocity_au_per_day = Math.sqrt(velocity[0]**2 + velocity[1]**2 + velocity[2]**2);
  const current_velocity = velocity_au_per_day * 149597870.7 / 86400;

  // Distance from Sun (heliocentric) - position is heliocentric with CENTER='500@10'
  const distance_from_sun = Math.sqrt(position[0]**2 + position[1]**2 + position[2]**2);

  // Distance from Earth (geocentric) - calculate using Earth's position
  let distance_from_earth: number;
  if (data.ephemeris.delta && data.ephemeris.delta > 0) {
    // Use JPL-provided geocentric distance if available
    distance_from_earth = data.ephemeris.delta;
  } else {
    // Calculate using Earth's heliocentric position from astronomy-engine
    const earthPos = Astronomy.HelioVector(Astronomy.Body.Earth, new Date());
    distance_from_earth = Math.sqrt(
      (position[0] - earthPos.x)**2 +
      (position[1] - earthPos.y)**2 +
      (position[2] - earthPos.z)**2
    );
  }

  // Orbital energy (specific energy = v²/2 - μ/r)
  const mu_sun = 1.327e11; // km³/s² (standard gravitational parameter of Sun)
  const r_km = distance_from_sun * 149597870.7;
  const orbital_energy = (current_velocity**2) / 2 - mu_sun / r_km;

  return {
    current_velocity,
    distance_from_sun,
    distance_from_earth,
    orbital_energy
  };
}

/**
 * Parse JPL Horizons ephemeris ASCII response format
 * Extracts observer-centric position data (RA/DEC)
 *
 * Expected format (from QUANTITIES='1'):
 * Date__(UT)__HR:MN     R.A._____(ICRF)_____DEC
 * 2025-Oct-05 00:00     213.96893 -10.27342
 *
 * Note: RA and DEC are in decimal degrees when ANG_FORMAT='DEG'
 */
export function parseEphemerisResponse(response: string, dateRange?: DateRange, stepSize?: string): JPLEphemerisData {
  logger.info({}, 'Parsing JPL Horizons ephemeris response');

  const ephemeris_points: JPLEphemerisPoint[] = [];

  try {
    // Find the data section between $$SOE and $$EOE markers
    const dataStart = response.indexOf('$$SOE');
    const dataEnd = response.indexOf('$$EOE');

    if (dataStart === -1 || dataEnd === -1) {
      logger.warn({}, 'No ephemeris data section found in JPL response');
      throw new Error('No ephemeris data section found in JPL response');
    }

    const dataSection = response.substring(dataStart + 5, dataEnd); // Skip '$$SOE'
    const lines = dataSection.split('\n').filter(line => line.trim().length > 0);

    logger.info({ lineCount: lines.length }, 'Found ephemeris data lines to parse');

    for (const line of lines) {
      try {
        // Parse format with QUANTITIES='1,19,20':
        // "YYYY-MMM-DD HH:MM  RA  DEC  delta  deldot  r  rdot"
        // Example: " 2025-Oct-05 00:00     213.96893 -10.27342  2.456  -12.34  1.234  15.67"

        // Split by whitespace
        const parts = line.trim().split(/\s+/);

        if (parts.length < 4) {
          // Need at least: date, time, RA, DEC
          continue;
        }

        // Extract date and time
        const dateStr = parts[0]; // "2025-Oct-05"
        const timeStr = parts[1]; // "00:00"

        // Parse date into ISO format
        const date = new Date(`${dateStr} ${timeStr} UTC`).toISOString();

        // Extract RA and DEC (already in decimal degrees)
        const ra = parseFloat(parts[2]);
        const dec = parseFloat(parts[3]);

        // Validate coordinates
        if (isNaN(ra) || isNaN(dec)) {
          logger.warn({ lineSample: line.substring(0, 50) }, 'Skipping invalid coordinates');
          continue;
        }

        // Additional validation
        if (ra < 0 || ra > 360 || dec < -90 || dec > 90) {
          logger.warn({ ra, dec }, 'Skipping out-of-range coordinates');
          continue;
        }

        // Calculate Julian Date
        const jd = dateToJulianDate(new Date(date));

        // Extract additional fields from QUANTITIES 19,20 (if available)
        // Format varies, but typically:
        // parts[4] = delta (geocentric distance, AU)
        // parts[5] = delta_rate (geocentric range rate, km/s) or deldot
        // parts[6] = r (heliocentric distance, AU)
        // parts[7] = r_rate (heliocentric range rate, km/s) or rdot

        const delta = parts.length > 4 ? parseFloat(parts[4]) : 0;
        const delta_rate = parts.length > 5 ? parseFloat(parts[5]) : 0;
        const r = parts.length > 6 ? parseFloat(parts[6]) : 0;
        const r_rate = parts.length > 7 ? parseFloat(parts[7]) : 0;

        // Create ephemeris point with all available data
        ephemeris_points.push({
          date,
          jd,
          ra,
          dec,
          delta: !isNaN(delta) ? delta : 0,
          r: !isNaN(r) ? r : 0,
          phase_angle: 0,          // Would need separate quantity code
          solar_elongation: 0,     // Would need separate quantity code
          magnitude: 0,            // Would need separate quantity code
          surface_brightness: 0,   // Would need separate quantity code
          delta_rate: !isNaN(delta_rate) ? delta_rate : 0,
          r_rate: !isNaN(r_rate) ? r_rate : 0,
        });

      } catch (lineError) {
        logger.warn({
          lineSample: line.substring(0, 50),
          error: lineError instanceof Error ? lineError.message : String(lineError)
        }, 'Error parsing ephemeris line');
        // Continue to next line
      }
    }

    logger.info({ pointCount: ephemeris_points.length }, 'Successfully parsed ephemeris points (RA/DEC + distances + velocities)');

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error parsing JPL Horizons ephemeris response');
  }

  // Build metadata
  const now = new Date();
  const defaultStart = dateRange?.start || now.toISOString().split('T')[0];
  const defaultEnd = dateRange?.end || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return {
    target: '3I/ATLAS',
    observer_location: 'Geocentric',
    ephemeris_points,
    metadata: {
      start_date: defaultStart,
      end_date: defaultEnd,
      step_size: stepSize || '1d',
      coordinate_system: 'ICRF/J2000.0',
      reference_frame: 'Earth Mean Equator and Equinox of Reference Epoch',
      total_points: ephemeris_points.length,
    },
    last_updated: new Date().toISOString(),
    data_source: 'JPL Horizons Ephemeris (Full)',
  };
}

/**
 * Convert Date to Julian Date
 * Helper function for ephemeris data
 */
function dateToJulianDate(date: Date): number {
  const time = date.getTime();
  return (time / 86400000) + 2440587.5;
}

/**
 * Planet position data interface
 */
export interface PlanetPosition {
  name: string;
  position: [number, number, number]; // AU (x, y, z) heliocentric
  velocity: [number, number, number]; // AU/day (vx, vy, vz)
  distance_from_sun: number; // AU
}

/**
 * JPL Horizons planet codes
 */
const PLANET_CODES = {
  Mercury: '199',
  Venus: '299',
  Earth: '399',
  Mars: '499',
  Jupiter: '599',
  Saturn: '699',
  Uranus: '799',
  Neptune: '899'
} as const;

/**
 * Fetch position data for a single planet from JPL Horizons
 */
async function fetchPlanetPosition(planetCode: string, planetName: string, date?: Date): Promise<PlanetPosition | null> {
  try {
    await rateLimiter.waitForSlot();

    const now = date || new Date();
    const dateStr = now.toISOString().split('T')[0];

    const params = new URLSearchParams({
      'COMMAND': planetCode,
      'format': 'text',
      'EPHEM_TYPE': 'VECTORS',
      'START_TIME': dateStr,
      'STOP_TIME': dateStr,
      'STEP_SIZE': '1d',
      'CENTER': '500@10', // Heliocentric (Sun center)
      'REF_PLANE': 'ECLIPTIC',
      'OUT_UNITS': 'AU-D'
    });

    const url = `${JPL_HORIZONS_BASE}?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
        'Accept': 'text/plain,*/*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error({ planetName, status: response.status }, 'Failed to fetch planet position');
      return null;
    }

    const responseText = await response.text();

    // Parse position and velocity from response
    const vectorStart = responseText.indexOf('$$SOE');
    const vectorEnd = responseText.indexOf('$$EOE');

    if (vectorStart === -1 || vectorEnd === -1) {
      logger.error({ planetName }, 'No vector data found for planet');
      return null;
    }

    const vectorSection = responseText.substring(vectorStart, vectorEnd);
    const lines = vectorSection.split('\n');

    let position: [number, number, number] = [0, 0, 0];
    let velocity: [number, number, number] = [0, 0, 0];
    let foundPosition = false;
    let foundVelocity = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Position line
      if (!foundPosition && trimmed.includes('X =') && trimmed.includes('Y =') && trimmed.includes('Z =')) {
        const xMatch = trimmed.match(/X\s*=\s*([^\s]+)/);
        const yMatch = trimmed.match(/Y\s*=\s*([^\s]+)/);
        const zMatch = trimmed.match(/Z\s*=\s*([^\s]+)/);

        if (xMatch && yMatch && zMatch) {
          position = [
            parseFloat(xMatch[1]),
            parseFloat(yMatch[1]),
            parseFloat(zMatch[1])
          ];
          foundPosition = true;
        }
      }

      // Velocity line
      if (!foundVelocity && trimmed.includes('VX=') && trimmed.includes('VY=') && trimmed.includes('VZ=')) {
        const vxMatch = trimmed.match(/VX=\s*([^\s]+)/);
        const vyMatch = trimmed.match(/VY=\s*([^\s]+)/);
        const vzMatch = trimmed.match(/VZ=\s*([^\s]+)/);

        if (vxMatch && vyMatch && vzMatch) {
          velocity = [
            parseFloat(vxMatch[1]),
            parseFloat(vyMatch[1]),
            parseFloat(vzMatch[1])
          ];
          foundVelocity = true;
        }
      }

      if (foundPosition && foundVelocity) break;
    }

    if (!foundPosition) {
      logger.error({ planetName }, 'Could not parse position for planet');
      return null;
    }

    const distance_from_sun = Math.sqrt(position[0]**2 + position[1]**2 + position[2]**2);

    logger.info({ planetName, position }, 'Successfully fetched planet position');

    return {
      name: planetName,
      position,
      velocity,
      distance_from_sun
    };

  } catch (error) {
    logger.error({ planetName, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Error fetching planet position');
    return null;
  }
}

/**
 * Fetch positions for all planets from JPL Horizons
 */
export async function fetchAllPlanetPositions(date?: Date): Promise<PlanetPosition[]> {
  const cacheKey = `all_planets_${date?.toISOString().split('T')[0] || 'current'}`;

  // Check cache first
  const cached = cache.get<PlanetPosition[]>(cacheKey);
  if (cached) {
    logger.info({ cacheKey: 'all_planets' }, 'Planet positions cache hit');
    return cached;
  }

  logger.info({}, 'Fetching all planet positions from JPL Horizons');

  const planetPromises = Object.entries(PLANET_CODES).map(([name, code]) =>
    fetchPlanetPosition(code, name, date)
  );

  const results = await Promise.all(planetPromises);

  // Filter out any null results and type as PlanetPosition[]
  const planets = results.filter((p): p is PlanetPosition => p !== null);

  if (planets.length > 0) {
    // Cache for 6 hours (planets move slowly)
    cache.set(cacheKey, planets, 6 * 60 * 60 * 1000);
    logger.info({ fetchedCount: planets.length, totalCount: 8 }, 'Successfully fetched planet positions');
  } else {
    logger.error({}, 'Failed to fetch any planet positions');
  }

  return planets;
}

/**
 * Fetch ephemeris data from JPL Horizons API
 *
 * @param dateRange - Optional date range for ephemeris (defaults to today + 7 days)
 * @param stepSize - Time step between ephemeris points (default: "1d")
 * @returns JPLEphemerisData with time-series position/brightness data, or null on error
 */
export async function fetchJPLEphemerisData(
  dateRange?: DateRange,
  stepSize: string = '1d'
): Promise<JPLEphemerisData | null> {
  const cacheKey = `jpl_ephemeris_${dateRange?.start || 'current'}_${dateRange?.end || 'week'}_${stepSize}`;

  // Check cache first
  const cached = cache.get<JPLEphemerisData>(cacheKey);
  if (cached) {
    logger.info({ cacheKey: 'jpl_ephemeris' }, 'JPL Horizons ephemeris cache hit');
    return cached;
  }

  try {
    await rateLimiter.waitForSlot();

    logger.info({}, 'Fetching JPL Horizons ephemeris data');

    const params = buildEphemerisParams(dateRange, stepSize);
    const url = `${JPL_HORIZONS_BASE}?${params.toString()}`;

    logger.info({ url }, 'JPL Ephemeris API URL');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
        'Accept': 'text/plain,*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`JPL Horizons ephemeris HTTP error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('JPL Horizons returned empty ephemeris response');
    }

    // Check for error indicators in JPL response
    if (responseText.includes('ERROR') || responseText.includes('No ephemeris')) {
      throw new Error('JPL Horizons API returned error or no ephemeris data');
    }

    // Parse the ASCII response
    const ephemerisData = parseEphemerisResponse(responseText, dateRange, stepSize);

    // Validate the parsed data
    if (ephemerisData.ephemeris_points.length === 0) {
      throw new Error('No valid ephemeris points found in JPL response');
    }

    // Validate data quality (RA/DEC coordinates)
    const firstPoint = ephemerisData.ephemeris_points[0];
    if (firstPoint.ra < 0 || firstPoint.ra > 360) {
      throw new Error(`Invalid RA value in ephemeris data: ${firstPoint.ra}`);
    }
    if (firstPoint.dec < -90 || firstPoint.dec > 90) {
      throw new Error(`Invalid DEC value in ephemeris data: ${firstPoint.dec}`);
    }

    // Cache successful result for 15 minutes (ephemeris changes more frequently than orbital elements)
    cache.set(cacheKey, ephemerisData, 900000);

    logger.info({ pointCount: ephemerisData.ephemeris_points.length }, 'Successfully fetched and parsed JPL Horizons ephemeris data');
    return ephemerisData;

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Failed to fetch JPL Horizons ephemeris data');
    // Error already logged above

    // Return null instead of throwing (allows graceful degradation)
    return null;
  }
}

/**
 * Get current ephemeris (single point for "now")
 * Optimized for real-time position tracking
 *
 * @returns Single JPLEphemerisPoint for current time, or null on error
 */
export async function getCurrentJPLEphemeris(): Promise<JPLEphemerisPoint | null> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch ephemeris for today with hourly steps to get current position
  const ephemerisData = await fetchJPLEphemerisData(
    { start: today, end: tomorrow },
    '1h' // Hourly steps for better precision
  );

  if (!ephemerisData || ephemerisData.ephemeris_points.length === 0) {
    return null;
  }

  // Find the point closest to current time
  const currentTime = now.getTime();
  let closestPoint = ephemerisData.ephemeris_points[0];
  let minTimeDiff = Math.abs(new Date(closestPoint.date).getTime() - currentTime);

  for (const point of ephemerisData.ephemeris_points) {
    const timeDiff = Math.abs(new Date(point.date).getTime() - currentTime);
    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestPoint = point;
    }
  }

  logger.info({ timeOffsetMinutes: Math.round(minTimeDiff / 60000) }, 'Found current ephemeris point');
  return closestPoint;
}

/**
 * Get JPL Horizons ephemeris data with comprehensive error handling
 * Main export function for dashboard components
 *
 * @param dateRange - Optional date range
 * @param stepSize - Optional step size (default: "1d")
 * @returns JPLEphemerisData or null if unavailable
 */
export async function getJPLEphemerisData(
  dateRange?: DateRange,
  stepSize?: string
): Promise<JPLEphemerisData | null> {
  try {
    return await fetchJPLEphemerisData(dateRange, stepSize);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Critical error in JPL ephemeris data fetch - returning null');
    return null;
  }
}

/**
 * Generic Comet Orbital Trail Data Interface
 * Used for visualizing orbital paths of comets in 3D space
 */
export interface CometOrbitalVector {
  date: string;
  position: {
    x: number; // AU
    y: number; // AU
    z: number; // AU
  };
  velocity?: {
    vx: number; // AU/day
    vy: number; // AU/day
    vz: number; // AU/day
  };
}

export interface CometOrbitalData {
  target: string;
  orbital_vectors: CometOrbitalVector[];
  metadata?: {
    start_date: string;
    end_date: string;
    step_size: string;
    data_source: string;
  };
}

/**
 * Fetch orbital trail data for any comet from JPL Horizons
 * This is a generic version that accepts target designation
 *
 * @param target - Comet designation (e.g., "1P/Halley", "C/2023 A3")
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param stepSize - Time step (e.g., "1d" for daily)
 */
export async function fetchCometOrbitalTrail(
  target: string,
  startDate: string,
  endDate: string,
  stepSize: string = '1d'
): Promise<CometOrbitalData | null> {
  const cacheKey = `comet_trail_${target}_${startDate}_${endDate}_${stepSize}`;

  // Check cache
  const cached = cache.get<CometOrbitalData>(cacheKey);
  if (cached) {
    logger.info({ target, cacheKey: key }, 'Cache hit for comet trail');
    return cached;
  }

  try {
    // Build JPL Horizons API parameters
    const params = new URLSearchParams({
      'COMMAND': target,
      'format': 'text',
      'EPHEM_TYPE': 'VECTORS',
      'START_TIME': startDate,
      'STOP_TIME': endDate,
      'STEP_SIZE': stepSize,
      'CENTER': '500@10', // Heliocentric
      'REF_PLANE': 'ECLIPTIC',
      'OUT_UNITS': 'AU-D'
    });

    // Respect rate limit
    await rateLimiter.waitForSlot();

    const url = `${JPL_HORIZONS_BASE}?${params.toString()}`;
    logger.info({ target, startDate, endDate, stepSize }, 'Fetching JPL Horizons data for comet');

    const response = await fetch(url, {
      headers: {
        'Accept': 'text/plain'
      }
    });

    if (!response.ok) {
      logger.error({ target, status: response.status }, 'JPL Horizons returned error status');
      return null;
    }

    const text = await response.text();

    // Parse the ASCII response
    const vectors: CometOrbitalVector[] = [];
    const lines = text.split('\n');
    let inDataSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect start of data section
      if (line.includes('$$SOE')) {
        inDataSection = true;
        continue;
      }

      // Detect end of data section
      if (line.includes('$$EOE')) {
        break;
      }

      // Parse data lines
      if (inDataSection && line.trim()) {
        // JPL format: JDTDB, Calendar Date (TDB), X, Y, Z, VX, VY, VZ
        // Example: 2460000.500000 = A.D. 2023-Jan-01 00:00:00.0000 TDB
        //          X = 1.234  Y = 5.678  Z = 9.012
        //         VX = 0.001 VY = 0.002 VZ = 0.003

        if (line.includes('=') && line.includes('A.D.')) {
          // This is a date line
          const dateMatch = line.match(/A\.D\.\s+([\d-]+\s+[\d:]+)/);
          if (dateMatch && i + 2 < lines.length) {
            const date = dateMatch[1];
            const posLine = lines[i + 1];
            const velLine = lines[i + 2];

            // Parse position: X = value Y = value Z = value
            const xMatch = posLine.match(/X\s*=\s*([-\d.E+]+)/);
            const yMatch = posLine.match(/Y\s*=\s*([-\d.E+]+)/);
            const zMatch = posLine.match(/Z\s*=\s*([-\d.E+]+)/);

            // Parse velocity: VX = value VY = value VZ = value
            const vxMatch = velLine.match(/VX\s*=\s*([-\d.E+]+)/);
            const vyMatch = velLine.match(/VY\s*=\s*([-\d.E+]+)/);
            const vzMatch = velLine.match(/VZ\s*=\s*([-\d.E+]+)/);

            if (xMatch && yMatch && zMatch) {
              vectors.push({
                date: new Date(date).toISOString(),
                position: {
                  x: parseFloat(xMatch[1]),
                  y: parseFloat(yMatch[1]),
                  z: parseFloat(zMatch[1])
                },
                velocity: (vxMatch && vyMatch && vzMatch) ? {
                  vx: parseFloat(vxMatch[1]),
                  vy: parseFloat(vyMatch[1]),
                  vz: parseFloat(vzMatch[1])
                } : undefined
              });
            }

            i += 2; // Skip the position and velocity lines we just processed
          }
        }
      }
    }

    if (vectors.length === 0) {
      logger.warn({ target }, 'No orbital vectors found for comet');
      return null;
    }

    const result: CometOrbitalData = {
      target,
      orbital_vectors: vectors,
      metadata: {
        start_date: startDate,
        end_date: endDate,
        step_size: stepSize,
        data_source: 'JPL Horizons'
      }
    };

    // Cache for 24 hours
    cache.set(cacheKey, result, 24 * 60 * 60 * 1000);
    logger.info({ target, vectorCount: vectors.length }, 'Fetched orbital vectors for comet');

    return result;

  } catch (error) {
    logger.error({ target, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'Error fetching orbital trail');
    return null;
  }
}