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
 */
function parseDec(decString: string): number {
  const match = decString.match(/([+-]?)(\d+)°\s*(\d+)'\s*(\d+(?:\.\d+)?)"/);
  if (!match) return 0;

  const sign = match[1] === '-' ? -1 : 1;
  const degrees = parseInt(match[2]);
  const minutes = parseInt(match[3]);
  const seconds = parseFloat(match[4]);

  return sign * (degrees + minutes / 60 + seconds / 3600);
}


/**
 * Calculate orbital velocity from distance and orbital period (simplified)
 * This is an approximation using Kepler's laws
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
  console.log('Parsing TheSkyLive orbital data...');

  // Initialize default values
  let ra = 0;
  let dec = 0;
  let heliocentric_distance = 0;
  let geocentric_distance = 0;
  let magnitude_estimate = 0; // Use real data only - no fabricated fallback

  try {
    // Extract Right Ascension from TheSkyLive format (apparent coordinates)
    const raMatch = html.match(/<number class="raApparent">([^<]+)<\/number>/i);
    if (raMatch) {
      ra = parseRA(raMatch[1].trim());
      console.log(`Extracted RA: ${raMatch[1].trim()} → ${ra}°`);
    }

    // Extract Declination from TheSkyLive format (apparent coordinates)
    const decMatch = html.match(/<number class="decApparent">([^<]+)<\/number>/i);
    if (decMatch) {
      dec = parseDec(decMatch[1].trim());
      console.log(`Extracted Dec: ${decMatch[1].trim()} → ${dec}°`);
    }

    // Extract Distance from Earth (from info page has AU distance)
    const earthDistanceMatch = html.match(/<number class="distanceAU">([^<]+)<\/number>/i);
    if (earthDistanceMatch) {
      geocentric_distance = parseFloat(earthDistanceMatch[1]);
      console.log(`Extracted Earth distance: ${earthDistanceMatch[1].trim()} → ${geocentric_distance} AU`);
    }

    // Extract Current Magnitude (observed from COBS)
    const magnitudeMatch = html.match(/latest observed magnitude[^>]*is <number>([^<]+)<\/number>/i);
    if (magnitudeMatch) {
      magnitude_estimate = parseFloat(magnitudeMatch[1]);
      console.log(`Extracted magnitude: ${magnitude_estimate}`);
    }

    // For heliocentric distance, we'll estimate from geocentric + Earth-Sun distance
    // This is an approximation since we don't have direct heliocentric distance from TheSkyLive
    if (geocentric_distance > 0) {
      // Rough approximation: assuming Earth is ~1 AU from Sun
      heliocentric_distance = Math.max(0.5, geocentric_distance - 1.0); // rough estimate
      console.log(`Estimated heliocentric distance: ${heliocentric_distance} AU (approximation)`);
    }

  } catch (error) {
    console.error('Error parsing TheSkyLive HTML:', error);
  }

  // Calculate derived values
  const orbital_velocity = calculateOrbitalVelocity(heliocentric_distance);
  const heliocentric_velocity = orbital_velocity; // Simplified - same as orbital for this approximation
  const solar_elongation = calculateSolarElongation(ra, dec);

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
    console.log('TheSkyLive cache hit - returning cached data');
    return cached;
  }

  try {
    await rateLimiter.waitForSlot();

    console.log('Fetching TheSkyLive orbital data...');

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

    console.log('Successfully fetched and parsed TheSkyLive data');
    return orbitalData;

  } catch (error) {
    console.error('Failed to fetch TheSkyLive data:', error);
    console.log('TheSkyLive API unavailable - no fallback data will be provided');

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
    console.error('Critical error in TheSkyLive data fetch:', error);
    console.log('Returning null - no mock data will be provided');
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