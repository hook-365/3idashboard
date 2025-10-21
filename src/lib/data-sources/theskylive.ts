/**
 * TheSkyLive.com Data Source Integration for 3I/ATLAS Comet
 *
 * This service integrates with TheSkyLive.com to fetch real-time orbital
 * parameters and positioning data for the 3I/ATLAS interstellar comet.
 *
 * Data sources:
 * - Main info page: https://theskylive.com/c2025n1-info
 * - Position tracker: https://theskylive.com/c2025n1-tracker
 *
 * Based on research, TheSkyLive provides:
 * - Real-time coordinates (RA/Dec)
 * - Distance measurements (heliocentric/geocentric)
 * - Current magnitude estimates
 * - Orbital elements from JPL Horizons
 */

import logger from '@/lib/logger';

// TypeScript interface for TheSkyLive orbital data
export interface TheSkyLiveData {
  orbital_velocity: number;      // km/s (derived from orbital elements)
  heliocentric_velocity: number; // km/s (calculated from distance changes)
  position_angle: number;        // degrees (position angle of comet motion)
  solar_elongation: number;      // degrees (angle from Sun as seen from Earth)
  phase_angle: number;          // degrees (Sun-comet-Earth angle)
  last_updated: string;         // ISO timestamp
  ra: number;                   // right ascension in decimal degrees
  dec: number;                  // declination in decimal degrees
  heliocentric_distance: number; // AU (distance from Sun)
  geocentric_distance: number;   // AU (distance from Earth)
  magnitude_estimate: number;    // visual magnitude
  // Orbital elements (from TheSkyLive orbital elements table)
  eccentricity?: number;         // Orbital eccentricity
  perihelion_distance?: number;  // Perihelion distance in AU
  calculated_velocity?: number;  // Calculated velocity from vis-viva equation (km/s)
}

// TypeScript interface for ephemeris point
export interface EphemerisPoint {
  date: string;              // ISO format: "2025-10-09"
  ra: number;                // decimal degrees
  dec: number;               // decimal degrees
  magnitude?: number;        // predicted magnitude
  constellation?: string;    // constellation name
  prediction_date: string;   // ISO timestamp when this prediction was made
  data_source: 'TheSkyLive';
}

// TypeScript interface for ephemeris table
export interface EphemerisTable {
  predictions: EphemerisPoint[];
  captured_at: string;       // ISO timestamp
  epoch: string;             // Orbital element epoch
}

// URLs for TheSkyLive.com data sources
const THESKYLIVE_BASE = 'https://theskylive.com';
const COMET_INFO_URL = `${THESKYLIVE_BASE}/c2025n1-info`;

// Cache implementation (reusing pattern from COBS API)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number = 900000): void { // 15 minute default TTL
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

// Rate limiter for TheSkyLive requests
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 30, windowMs: number = 60000) { // 30 requests per minute
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
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
  }
}

// Singleton instances
const cache = new MemoryCache();
const rateLimiter = new RateLimiter();

/**
 * Convert RA hours/minutes/seconds to decimal degrees
 */
function parseRA(raString: string): number {
  const match = raString.match(/(\d+)h\s*(\d+)m\s*(\d+(?:\.\d+)?)s/);
  if (!match) return 0;

  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseFloat(match[3]);

  return (hours + minutes / 60 + seconds / 3600) * 15; // Convert hours to degrees
}

/**
 * Convert Dec degrees/minutes/seconds to decimal degrees
 * Handles both regular characters and HTML entities (&deg; &rsquo; &rdquo;)
 */
function parseDec(decString: string): number {
  // Match format: -10° 22' 15" or -10&deg; 22&rsquo; 15&rdquo;
  const match = decString.match(/([+-]?)(\d+)(?:°|&deg;)\s*(\d+)(?:'|&rsquo;)\s*(\d+(?:\.\d+)?)(?:"|&rdquo;)/);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  const degrees = parseInt(match[2]);
  const minutes = parseInt(match[3]);
  const seconds = parseFloat(match[4]);

  return sign * (degrees + minutes / 60 + seconds / 3600);
}


/**
 * Calculate heliocentric velocity from orbital elements using vis-viva equation
 *
 * Vis-viva equation: v = sqrt(μ * (2/r - 1/a))
 * Where:
 *   μ = Sun's gravitational parameter = 1.327124e11 km³/s²
 *   r = current heliocentric distance (km)
 *   a = semi-major axis (km), calculated from eccentricity and perihelion distance
 *
 * For hyperbolic orbits (e > 1):
 *   a = q / (1 - e) where e > 1 makes a negative
 *   The 1/a term becomes negative, increasing velocity (as expected for interstellar objects)
 *
 * @param heliocentric_distance - Current distance from Sun in AU
 * @param eccentricity - Orbital eccentricity (>1 for hyperbolic/interstellar)
 * @param perihelion_distance - Perihelion distance in AU
 * @returns Heliocentric velocity in km/s
 */
function calculateVelocityFromOrbitalElements(
  heliocentric_distance: number,
  eccentricity: number,
  perihelion_distance: number
): number {
  // Validate inputs
  if (heliocentric_distance <= 0 || perihelion_distance <= 0) {
    logger.warn({
      heliocentric_distance,
      perihelion_distance
    }, 'Invalid distances for velocity calculation');
    return 0;
  }

  // Constants
  const GM_SUN = 1.32712440018e11; // km³/s² (Sun's gravitational parameter)
  const AU_TO_KM = 149597870.7; // km per AU

  // Convert distances from AU to km
  const r_km = heliocentric_distance * AU_TO_KM;
  const q_km = perihelion_distance * AU_TO_KM;

  // Calculate semi-major axis from eccentricity and perihelion distance
  // For hyperbolic orbits (e > 1), a is negative
  // a = q / (1 - e)
  const a_km = q_km / (1 - eccentricity);

  logger.info({
    heliocentric_distance_au: heliocentric_distance,
    heliocentric_distance_km: r_km,
    eccentricity,
    perihelion_distance_au: perihelion_distance,
    perihelion_distance_km: q_km,
    semi_major_axis_km: a_km,
    orbit_type: eccentricity > 1 ? 'hyperbolic' : eccentricity === 1 ? 'parabolic' : 'elliptical'
  }, 'Velocity calculation inputs');

  // Apply vis-viva equation: v = sqrt(μ * (2/r - 1/a))
  const velocity_km_s = Math.sqrt(GM_SUN * (2 / r_km - 1 / a_km));

  logger.info({
    velocity_km_s: parseFloat(velocity_km_s.toFixed(2))
  }, 'Calculated heliocentric velocity');

  return velocity_km_s;
}

/**
 * Calculate orbital velocity from distance and orbital period (simplified)
 * This is an approximation using Kepler's laws - DEPRECATED, use calculateVelocityFromOrbitalElements instead
 */
function calculateOrbitalVelocity(_heliocentrieDistance: number): number {
  // Simplified calculation: v = sqrt(GM/r) where GM ≈ 1.327e20 m³/s² for Sun
  const GM_SUN = 1.327e20; // m³/s²
  const distance_m = _heliocentrieDistance * 1.496e11; // Convert AU to meters

  if (distance_m <= 0) return 0;

  const velocity_ms = Math.sqrt(GM_SUN / distance_m);
  return velocity_ms / 1000; // Convert m/s to km/s
}

/**
 * Calculate solar elongation angle (simplified approximation)
 */
function calculateSolarElongation(ra: number): number {
  // This is a simplified calculation - in reality, we'd need Sun's position
  // For interstellar comet, we'll approximate based on RA relative to Sun's approximate position
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

  // Approximate Sun's RA based on day of year
  const sunRA = (dayOfYear * 0.985) % 360; // Rough approximation

  // Calculate angular separation
  const deltaRA = Math.abs(ra - sunRA);
  const elongation = Math.min(deltaRA, 360 - deltaRA);

  return elongation;
}

/**
 * Parse orbital data from TheSkyLive tracker page HTML
 */
export function parseOrbitalData(html: string): TheSkyLiveData {
  logger.info({}, 'Parsing TheSkyLive orbital data');

  // Initialize default values
  let ra = 0;
  let dec = 0;
  let heliocentric_distance = 0;
  let geocentric_distance = 0;
  let magnitude_estimate = 0; // Use real data only - no fabricated fallback
  let eccentricity: number | undefined;
  let perihelion_distance: number | undefined;
  let calculated_velocity: number | undefined;

  try {
    // Extract Right Ascension from TheSkyLive format (apparent coordinates)
    const raMatch = html.match(/<number class="raApparent">([^<]+)<\/number>/i);
    if (raMatch) {
      ra = parseRA(raMatch[1].trim());
      logger.info({ raw: raMatch[1].trim(), parsed: ra }, 'Extracted RA');
    }

    // Extract Declination from TheSkyLive format (apparent coordinates)
    const decMatch = html.match(/<number class="decApparent">([^<]+)<\/number>/i);
    if (decMatch) {
      dec = parseDec(decMatch[1].trim());
      logger.info({ raw: decMatch[1].trim(), parsed: dec }, 'Extracted Dec');
    }

    // Extract Distance from Earth (from info page has AU distance)
    const earthDistanceMatch = html.match(/<number class="distanceAU">([^<]+)<\/number>/i);
    if (earthDistanceMatch) {
      geocentric_distance = parseFloat(earthDistanceMatch[1]);
      logger.info({ geocentric_distance }, 'Extracted Earth distance');
    }

    // Extract Current Magnitude (observed from COBS)
    const magnitudeMatch = html.match(/latest observed magnitude[^>]*is <number>([^<]+)<\/number>/i);
    if (magnitudeMatch) {
      magnitude_estimate = parseFloat(magnitudeMatch[1]);
      logger.info({ magnitude_estimate }, 'Extracted magnitude');
    }

    // Extract orbital elements from TheSkyLive orbital elements table
    // Eccentricity: <td class="left">Orbit eccentricity</td>...<td class="right value">6.13941774</td>
    const eccentricityMatch = html.match(/Orbit eccentricity[\s\S]*?<td class="right value">([0-9.]+)<\/td>/i);
    if (eccentricityMatch) {
      eccentricity = parseFloat(eccentricityMatch[1]);
      logger.info({ eccentricity }, 'Extracted eccentricity');
    }

    // Perihelion distance: <td class="left">Perihelion distance</td>...<td class="right value">1.35638454 AU
    const perihelionMatch = html.match(/Perihelion distance[\s\S]*?<td class="right value">([0-9.]+)\s*AU/i);
    if (perihelionMatch) {
      perihelion_distance = parseFloat(perihelionMatch[1]);
      logger.info({ perihelion_distance }, 'Extracted perihelion distance');
    }

    // For heliocentric distance, we'll estimate from geocentric + Earth-Sun distance
    // This is an approximation since we don't have direct heliocentric distance from TheSkyLive
    if (geocentric_distance > 0) {
      // Rough approximation: assuming Earth is ~1 AU from Sun
      heliocentric_distance = Math.max(0.5, geocentric_distance - 1.0); // rough estimate
      logger.info({ heliocentric_distance, method: 'approximation' }, 'Estimated heliocentric distance');
    }

    // Calculate velocity from orbital elements if we have them
    if (eccentricity && perihelion_distance && heliocentric_distance > 0) {
      calculated_velocity = calculateVelocityFromOrbitalElements(
        heliocentric_distance,
        eccentricity,
        perihelion_distance
      );
      logger.info({ calculated_velocity: parseFloat(calculated_velocity.toFixed(2)) }, 'Calculated velocity from orbital elements');
    }

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error parsing TheSkyLive HTML');
  }

  // Calculate derived values
  const orbital_velocity = calculateOrbitalVelocity(heliocentric_distance);
  const heliocentric_velocity = orbital_velocity; // Simplified - same as orbital for this approximation
  const solar_elongation = calculateSolarElongation(ra);

  // Position angle and phase angle are complex calculations requiring ephemeris data
  // For now, we'll use reasonable approximations
  const position_angle = (ra % 360); // Simplified - actual PA requires velocity vector
  const phase_angle = Math.abs(solar_elongation - 90); // Rough approximation

  return {
    orbital_velocity,
    heliocentric_velocity,
    position_angle,
    solar_elongation,
    phase_angle,
    last_updated: new Date().toISOString(),
    ra,
    dec,
    heliocentric_distance,
    geocentric_distance,
    magnitude_estimate,
    eccentricity,
    perihelion_distance,
    calculated_velocity,
  };
}

/**
 * Fetch orbital data from TheSkyLive.com with error handling and fallback
 */
export async function fetchTheSkyLiveData(): Promise<TheSkyLiveData> {
  const cacheKey = 'theskylive_orbital_data';

  // Check cache first
  const cached = cache.get<TheSkyLiveData>(cacheKey);
  if (cached) {
    logger.info({ cacheKey }, 'TheSkyLive cache hit - returning cached data');
    return cached;
  }

  try {
    await rateLimiter.waitForSlot();

    logger.info({ url: COMET_INFO_URL }, 'Fetching TheSkyLive orbital data');

    // Fetch from info page which has distance and magnitude data
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(COMET_INFO_URL, {
      headers: {
        'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TheSkyLive HTTP error: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    if (!html || html.trim().length === 0) {
      throw new Error('TheSkyLive returned empty response');
    }

    // Parse the HTML to extract orbital data
    const orbitalData = parseOrbitalData(html);

    // Validate the parsed data
    if (orbitalData.ra === 0 && orbitalData.dec === 0) {
      throw new Error('No valid coordinates found in TheSkyLive data - refusing to use mock data');
    }

    // Cache successful result for 15 minutes
    cache.set(cacheKey, orbitalData, 900000);

    logger.info({
      ra: orbitalData.ra,
      dec: orbitalData.dec,
      geocentric_distance: orbitalData.geocentric_distance,
      magnitude: orbitalData.magnitude_estimate
    }, 'Successfully fetched and parsed TheSkyLive data');
    return orbitalData;

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to fetch TheSkyLive data - API unavailable');

    // Re-throw the error instead of providing mock data
    throw error;
  }
}

/**
 * Generate realistic mock data for 3I/ATLAS orbital parameters
 * Based on actual interstellar comet characteristics and current position estimates
 */
export function getMockTheSkyLiveData(): TheSkyLiveData {
  const now = new Date();

  // Mock data based on 3I/ATLAS current trajectory (October 2025 approach)
  // These values are realistic approximations for an interstellar comet

  // Current position in Libra constellation (based on real tracking data)
  const ra = 218.5; // ~14h 34m in decimal degrees
  const dec = -11.43; // ~-11° 26'

  // Distance values change as comet approaches perihelion (Oct 30, 2025)
  const daysUntilPerihelion = Math.floor((new Date('2025-10-30').getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Approximate distances based on trajectory
  const heliocentric_distance = Math.max(1.8, 3.0 - (90 - daysUntilPerihelion) * 0.015); // AU, approaching perihelion
  const geocentric_distance = Math.max(2.5, 4.0 - (90 - daysUntilPerihelion) * 0.012); // AU

  // Orbital velocity increases as comet approaches Sun
  const orbital_velocity = 35.0 + (90 - daysUntilPerihelion) * 0.2; // km/s

  // Use only real observed magnitude data - no fabricated calculations
  const magnitude_estimate = 0;

  return {
    orbital_velocity,
    heliocentric_velocity: orbital_velocity * 0.95, // Slightly different due to projection effects
    position_angle: (ra + 45) % 360, // Mock position angle
    solar_elongation: Math.abs(ra - 280) % 180, // Approximate solar elongation
    phase_angle: 45.0 + Math.sin(now.getTime() / 86400000) * 15, // Varies with position
    last_updated: now.toISOString(),
    ra,
    dec,
    heliocentric_distance,
    geocentric_distance,
    magnitude_estimate,
  };
}

/**
 * Get orbital data with comprehensive error handling
 * This is the main export function that dashboard components should use
 * Returns null if TheSkyLive API is unavailable - no mock data fallbacks
 */
export async function getTheSkyLiveOrbitalData(): Promise<TheSkyLiveData | null> {
  try {
    return await fetchTheSkyLiveData();
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Critical error in TheSkyLive data fetch - returning null');
    // Return null instead of mock data
    return null;
  }
}

/**
 * Clear cached TheSkyLive data (useful for testing or forced refresh)
 */
export function clearTheSkyLiveCache(): void {
  cache.clear();
}

/**
 * Get cache status and statistics
 */
export function getTheSkyLiveCacheInfo(): {
  hasCachedData: boolean;
  cacheAge?: number;
  nextRefreshIn?: number;
} {
  const cacheKey = 'theskylive_orbital_data';
  const entry = cache.get(cacheKey);

  if (!entry) {
    return { hasCachedData: false };
  }

  const now = Date.now();
  const cacheAge = now - (entry as { timestamp: number; ttl: number }).timestamp;
  const nextRefreshIn = (entry as { timestamp: number; ttl: number }).ttl - cacheAge;

  return {
    hasCachedData: true,
    cacheAge,
    nextRefreshIn: Math.max(0, nextRefreshIn),
  };
}

/**
 * Parse TheSkyLive 15-day ephemeris table from HTML
 * Extracts predicted positions, magnitudes, and constellations
 */
export function parseEphemerisTable(html: string): EphemerisTable {
  logger.info({}, 'Parsing TheSkyLive ephemeris table');

  const predictions: EphemerisPoint[] = [];
  const capturedAt = new Date().toISOString();

  // Extract epoch from orbital elements section (if available)
  let epoch = capturedAt;
  const epochMatch = html.match(/Epoch:\s*(\d{4}-\w{3}-\d{2})/i);
  if (epochMatch) {
    try {
      epoch = new Date(epochMatch[1]).toISOString();
    } catch (e) {
      logger.warn({ epochStr: epochMatch[1] }, 'Failed to parse epoch date');
    }
  }

  try {
    // Match ephemeris table rows
    // Format: "Oct 03 2025" or similar, followed by RA, Dec, magnitude, constellation
    // The HTML structure has nested <a> tags inside <td> elements

    // Split HTML into table rows
    const rows = html.split(/<tr[^>]*>/i);

    for (const row of rows) {
      // Skip header rows and non-data rows
      if (!row.includes('<td')) continue;

      // Extract table cells - use lazy matching to handle nested tags
      const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi);
      if (!cells || cells.length < 4) continue;

      // Remove ALL HTML tags from cells (including nested <a>, <span>, etc.)
      const cellValues = cells.map(cell =>
        cell.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      );

      // Parse date (cell 0): "Oct 03 2025" or "Oct 3 2025"
      const dateStr = cellValues[0];
      const dateMatch = dateStr.match(/(\w{3})\s+(\d{1,2})\s+(\d{4})/);
      if (!dateMatch) continue;

      try {
        // Convert "Oct 03 2025" to ISO date "2025-10-03"
        const dateObj = new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`);
        if (isNaN(dateObj.getTime())) continue;

        const isoDate = dateObj.toISOString().split('T')[0];

        // Parse RA (cell 1): "14h 23m 00s"
        const raStr = cellValues[1];
        const ra = parseRA(raStr);
        if (ra === 0 && !raStr.startsWith('0')) continue; // Skip if parsing failed

        // Parse Dec (cell 2): "-10° 46' 02"" or with HTML entities
        const decStr = cellValues[2];
        const dec = parseDec(decStr);

        // Parse magnitude (cell 3): "15.28" - optional
        let magnitude: number | undefined;
        const magStr = cellValues[3];
        const magFloat = parseFloat(magStr);
        if (!isNaN(magFloat)) {
          magnitude = magFloat;
        }

        // Parse constellation (cell 4): "Virgo" - optional
        let constellation: string | undefined;
        if (cellValues.length >= 5 && cellValues[4].length > 0) {
          constellation = cellValues[4];
        }

        predictions.push({
          date: isoDate,
          ra,
          dec,
          magnitude,
          constellation,
          prediction_date: capturedAt,
          data_source: 'TheSkyLive'
        });

      } catch (error) {
        logger.warn({
          dateStr,
          error: error instanceof Error ? error.message : String(error)
        }, 'Failed to parse ephemeris row');
      }
    }

    logger.info({
      predictionCount: predictions.length,
      dateRange: predictions.length > 0 ?
        `${predictions[0].date} to ${predictions[predictions.length - 1].date}` :
        'none',
      samplePrediction: predictions.length > 0 ? {
        date: predictions[0].date,
        ra: parseFloat(predictions[0].ra.toFixed(2)),
        dec: parseFloat(predictions[0].dec.toFixed(2)),
        magnitude: predictions[0].magnitude
      } : undefined
    }, 'Parsed ephemeris predictions from TheSkyLive');

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Error parsing ephemeris table');
  }

  return {
    predictions,
    captured_at: capturedAt,
    epoch
  };
}

/**
 * Fetch and parse full ephemeris table from TheSkyLive
 */
export async function fetchEphemerisTable(): Promise<EphemerisTable | null> {
  const cacheKey = 'theskylive_ephemeris_table';

  // Check cache first
  const cached = cache.get<EphemerisTable>(cacheKey);
  if (cached) {
    logger.info({ cacheKey, predictionCount: cached.predictions.length }, 'TheSkyLive ephemeris cache hit');
    return cached;
  }

  try {
    await rateLimiter.waitForSlot();

    logger.info({ url: COMET_INFO_URL }, 'Fetching TheSkyLive ephemeris table');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(COMET_INFO_URL, {
      headers: {
        'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TheSkyLive HTTP error: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    if (!html || html.trim().length === 0) {
      throw new Error('TheSkyLive returned empty response');
    }

    // Parse the ephemeris table
    const ephemerisTable = parseEphemerisTable(html);

    // Validate the parsed data
    if (ephemerisTable.predictions.length === 0) {
      throw new Error('No ephemeris predictions found in TheSkyLive data');
    }

    // Cache successful result for 6 hours (ephemeris doesn't change often)
    cache.set(cacheKey, ephemerisTable, 6 * 60 * 60 * 1000);

    logger.info({
      predictionCount: ephemerisTable.predictions.length,
      dateRange: ephemerisTable.predictions.length > 0 ?
        `${ephemerisTable.predictions[0].date} to ${ephemerisTable.predictions[ephemerisTable.predictions.length - 1].date}` :
        'none'
    }, 'Successfully fetched and parsed TheSkyLive ephemeris table');
    return ephemerisTable;

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to fetch TheSkyLive ephemeris table');
    return null;
  }
}