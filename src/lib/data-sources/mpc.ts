/**
 * Minor Planet Center (MPC) Data Source Integration for 3I/ATLAS Comet
 *
 * This service integrates with the Minor Planet Center's comet orbital elements
 * database to fetch precise orbital parameters for cross-validation with JPL data.
 *
 * Data source: https://www.minorplanetcenter.net/Extended_Files/cometels.json.gz
 *
 * Update frequency: MPC updates this database a few times per month
 * Cache TTL: 24 hours (sufficient given update frequency)
 *
 * Features:
 * - Gzip decompression of .json.gz files
 * - Orbital elements extraction for 3I/ATLAS
 * - Error handling with retry logic
 * - 24-hour caching
 */

import { gunzipSync } from 'zlib';
import type { MPCOrbitalElements, MPCSourceData } from '@/types/enhanced-comet-data';

// MPC API configuration
const MPC_COMET_ELEMENTS_URL = 'https://www.minorplanetcenter.net/Extended_Files/cometels.json.gz';
const TARGET_DESIGNATION = '3I'; // Looking for 3I/ATLAS
const TARGET_NAME_PARTIAL = 'ATLAS'; // Name should contain ATLAS

// Cache implementation (following established codebase pattern)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number = 86400000): void { // 24 hour default TTL
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

// Rate limiter for MPC requests
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) { // 10 requests per minute
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
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait 6 seconds
    }
  }
}

// Singleton instances
const cache = new MemoryCache();
const rateLimiter = new RateLimiter();

/**
 * MPC JSON format interface (based on documented structure)
 */
interface MPCCometElement {
  Designation?: string;
  Name?: string;
  Epoch?: number;          // Julian Date
  q?: number;             // Perihelion distance (AU)
  e?: number;             // Eccentricity
  i?: number;             // Inclination (degrees)
  Node?: number;          // Longitude of ascending node (degrees)
  Peri?: number;          // Argument of perihelion (degrees)
  Tp?: number;            // Perihelion passage time (Julian Date)
  n?: number;             // Mean motion
  Year_of_perihelion?: number;
  Month_of_perihelion?: number;
  Day_of_perihelion?: number;
  Num_obs?: number;       // Number of observations
  Arc?: string;           // Observation arc (e.g., "2025-2025")
}

/**
 * Convert Julian Date to ISO string
 */
function julianToISO(jd: number): string {
  // Julian Date conversion algorithm
  const Z = Math.floor(jd + 0.5);
  const F = (jd + 0.5) - Z;

  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayInt = Math.floor(day);
  const hours = (day - dayInt) * 24;
  const hoursInt = Math.floor(hours);
  const minutes = (hours - hoursInt) * 60;
  const minutesInt = Math.floor(minutes);
  const seconds = (minutes - minutesInt) * 60;

  return new Date(
    Date.UTC(year, month - 1, dayInt, hoursInt, minutesInt, Math.floor(seconds))
  ).toISOString();
}

/**
 * Parse MPC comet element data into our format
 */
function parseMPCElement(element: MPCCometElement): MPCOrbitalElements | null {
  // Validate required fields
  if (!element.q || !element.e || !element.i || !element.Node || !element.Peri) {
    console.warn('MPC element missing required orbital parameters');
    return null;
  }

  // Parse perihelion passage time
  let perihelion_passage_time = '';
  if (element.Tp) {
    perihelion_passage_time = julianToISO(element.Tp);
  } else if (element.Year_of_perihelion && element.Month_of_perihelion && element.Day_of_perihelion) {
    perihelion_passage_time = new Date(
      Date.UTC(element.Year_of_perihelion, element.Month_of_perihelion - 1, element.Day_of_perihelion)
    ).toISOString();
  }

  // Parse epoch
  let epoch = '';
  if (element.Epoch) {
    epoch = julianToISO(element.Epoch);
  }

  // Parse observation arc
  let observation_arc: { first: string; last: string } | undefined;
  if (element.Arc) {
    const arcParts = element.Arc.split('-');
    if (arcParts.length === 2) {
      observation_arc = {
        first: `${arcParts[0]}-01-01T00:00:00.000Z`,
        last: `${arcParts[1]}-12-31T23:59:59.999Z`
      };
    }
  }

  return {
    perihelion_distance: element.q,
    eccentricity: element.e,
    inclination: element.i,
    argument_of_perihelion: element.Peri,
    longitude_ascending_node: element.Node,
    perihelion_passage_time,
    epoch,
    number_of_observations: element.Num_obs,
    observation_arc,
    orbital_period: element.e >= 1.0 ? undefined : undefined // Only for elliptical orbits
  };
}

/**
 * Find 3I/ATLAS in MPC comet elements database
 */
function find3IAtlasInMPCData(comets: MPCCometElement[]): MPCCometElement | null {
  console.log(`Searching for 3I/ATLAS in ${comets.length} MPC comet records...`);

  // Search strategies (in order of preference):
  // 1. Exact designation match "3I"
  // 2. Designation contains "3I" or "C/2025 N1"
  // 3. Name contains "ATLAS" or "3I"

  for (const comet of comets) {
    // Strategy 1: Exact designation
    if (comet.Designation === '3I') {
      console.log('Found 3I/ATLAS by exact designation match');
      return comet;
    }
  }

  for (const comet of comets) {
    // Strategy 2: Designation contains target
    if (comet.Designation && (
      comet.Designation.includes('3I') ||
      comet.Designation.includes('C/2025 N1')
    )) {
      console.log(`Found 3I/ATLAS by designation: ${comet.Designation}`);
      return comet;
    }
  }

  for (const comet of comets) {
    // Strategy 3: Name contains ATLAS
    if (comet.Name && (
      comet.Name.toUpperCase().includes('ATLAS') ||
      comet.Name.includes('3I')
    )) {
      console.log(`Found 3I/ATLAS by name: ${comet.Name}`);
      return comet;
    }
  }

  console.warn('3I/ATLAS not found in MPC database');
  return null;
}

/**
 * Fetch and decompress MPC comet elements data with retry logic
 */
async function fetchMPCDataWithRetry(maxRetries: number = 3): Promise<MPCCometElement[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching MPC comet elements (attempt ${attempt}/${maxRetries})...`);

      await rateLimiter.waitForSlot();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(MPC_COMET_ELEMENTS_URL, {
        headers: {
          'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
          'Accept': 'application/gzip, application/json, */*',
          'Accept-Encoding': 'gzip, deflate',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`MPC HTTP error: ${response.status} ${response.statusText}`);
      }

      // Get compressed data as buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Decompress gzip data
      console.log(`Decompressing ${buffer.length} bytes of gzipped MPC data...`);
      const decompressed = gunzipSync(buffer);
      const jsonString = decompressed.toString('utf-8');

      // Parse JSON
      const data = JSON.parse(jsonString) as MPCCometElement[];

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('MPC returned invalid or empty data');
      }

      console.log(`Successfully fetched and parsed ${data.length} MPC comet records`);
      return data;

    } catch (error) {
      lastError = error as Error;
      console.error(`MPC fetch attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const backoffMs = attempt * 5000; // 5s, 10s, 15s backoff
        console.log(`Retrying in ${backoffMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error('Failed to fetch MPC data after all retries');
}

/**
 * Fetch MPC orbital elements for 3I/ATLAS
 */
export async function fetchMPCData(): Promise<MPCSourceData> {
  const cacheKey = 'mpc_3i_atlas';

  // Check cache first
  const cached = cache.get<MPCSourceData>(cacheKey);
  if (cached) {
    console.log('MPC cache hit - returning cached data');
    return cached;
  }

  try {
    // Fetch all comet elements from MPC
    const allComets = await fetchMPCDataWithRetry();

    // Find 3I/ATLAS in the dataset
    const atlas3I = find3IAtlasInMPCData(allComets);

    if (!atlas3I) {
      throw new Error('3I/ATLAS not found in MPC database');
    }

    // Parse orbital elements
    const orbitalElements = parseMPCElement(atlas3I);

    if (!orbitalElements) {
      throw new Error('Failed to parse MPC orbital elements for 3I/ATLAS');
    }

    const result: MPCSourceData = {
      designation: atlas3I.Designation || '3I',
      name: atlas3I.Name || '3I/ATLAS',
      orbital_elements: orbitalElements,
      last_updated: new Date().toISOString(),
      data_source: 'Minor Planet Center'
    };

    // Cache for 24 hours
    cache.set(cacheKey, result, 86400000);

    console.log('Successfully fetched MPC data for 3I/ATLAS');
    return result;

  } catch (error) {
    console.error('Failed to fetch MPC data:', error);
    throw error;
  }
}

/**
 * Get MPC orbital data with comprehensive error handling
 * This is the main export function that dashboard components should use
 * Returns null if MPC API is unavailable
 */
export async function getMPCOrbitalData(): Promise<MPCSourceData | null> {
  try {
    return await fetchMPCData();
  } catch (error) {
    console.error('Critical error in MPC data fetch:', error);
    console.log('Returning null - MPC data unavailable');
    return null;
  }
}

/**
 * Clear cached MPC data (useful for testing or forced refresh)
 */
export function clearMPCCache(): void {
  cache.clear();
}

/**
 * Get cache status and statistics
 */
export function getMPCCacheInfo(): {
  hasCachedData: boolean;
  cacheAge?: number;
  nextRefreshIn?: number;
} {
  const cacheKey = 'mpc_3i_atlas';
  const entry = cache.get(cacheKey);

  if (!entry) {
    return { hasCachedData: false };
  }

  // Type assertion needed for internal cache structure
  const cacheEntry = (cache as { cache: Map<string, CacheEntry<unknown>> }).cache.get(cacheKey);
  if (!cacheEntry) {
    return { hasCachedData: false };
  }

  const now = Date.now();
  const cacheAge = now - cacheEntry.timestamp;
  const nextRefreshIn = cacheEntry.ttl - cacheAge;

  return {
    hasCachedData: true,
    cacheAge,
    nextRefreshIn: Math.max(0, nextRefreshIn),
  };
}
