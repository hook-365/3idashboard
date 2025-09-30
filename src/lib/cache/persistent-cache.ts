import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { CACHE_TTL, CACHE_VERSION } from '@/constants/cache';
import { logger, logCache } from '@/lib/logger';

/**
 * Persistent file-based cache for critical data
 * Stores last known good data to survive server restarts and API outages
 *
 * Features:
 * - Async file operations (non-blocking)
 * - Cache expiration with max age
 * - Stale-while-revalidate support
 * - Cache versioning for busting
 */

const CACHE_DIR = path.join(process.cwd(), '.cache');
const SOLAR_SYSTEM_CACHE_FILE = path.join(CACHE_DIR, 'solar-system-position.json');

export interface CachedSolarSystemData {
  data: unknown;
  timestamp: number;
  createdAt: string;
  version: string;
  maxAge: number;
}

/**
 * Ensure cache directory exists (async)
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    logger.info('Created cache directory');
  }
}

/**
 * Ensure cache directory exists (sync - for initialization)
 */
function ensureCacheDirSync(): void {
  if (!fsSync.existsSync(CACHE_DIR)) {
    fsSync.mkdirSync(CACHE_DIR, { recursive: true });
    logger.info('Created cache directory (sync)');
  }
}

/**
 * Save solar system position data to persistent cache (async)
 */
export async function saveSolarSystemCacheAsync(data: unknown): Promise<void> {
  try {
    await ensureCacheDir();
    const cached: CachedSolarSystemData = {
      data,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      version: CACHE_VERSION,
      maxAge: CACHE_TTL.PERSISTENT_MAX_AGE,
    };
    await fs.writeFile(SOLAR_SYSTEM_CACHE_FILE, JSON.stringify(cached, null, 2));
    logCache.set('solar-system-position', CACHE_TTL.PERSISTENT_MAX_AGE);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      type: 'cache_write_error'
    }, 'Failed to save solar system cache');
  }
}

/**
 * Save solar system position data to persistent cache (sync)
 */
export function saveSolarSystemCache(data: unknown): void {
  try {
    ensureCacheDirSync();
    const cached: CachedSolarSystemData = {
      data,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      version: CACHE_VERSION,
      maxAge: CACHE_TTL.PERSISTENT_MAX_AGE,
    };
    fsSync.writeFileSync(SOLAR_SYSTEM_CACHE_FILE, JSON.stringify(cached, null, 2));
    logCache.set('solar-system-position', CACHE_TTL.PERSISTENT_MAX_AGE);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      type: 'cache_write_error'
    }, 'Failed to save solar system cache (sync)');
  }
}

/**
 * Load solar system position data from persistent cache (async)
 * Returns null if cache doesn't exist, is invalid, or is expired
 *
 * @param maxAge - Maximum age in milliseconds (default: 24 hours)
 * @param allowStale - If true, returns stale data within stale window
 */
export async function loadSolarSystemCacheAsync(
  maxAge: number = CACHE_TTL.PERSISTENT_MAX_AGE,
  allowStale: boolean = false
): Promise<CachedSolarSystemData | null> {
  try {
    // Check if file exists
    try {
      await fs.access(SOLAR_SYSTEM_CACHE_FILE);
    } catch {
      logCache.miss('solar-system-position');
      return null;
    }

    const content = await fs.readFile(SOLAR_SYSTEM_CACHE_FILE, 'utf-8');
    const cached: CachedSolarSystemData = JSON.parse(content);

    // Verify cache structure
    if (!cached.data || !cached.timestamp) {
      logger.warn('Invalid cache structure, ignoring');
      await fs.unlink(SOLAR_SYSTEM_CACHE_FILE).catch(() => {});
      return null;
    }

    // Check cache version
    if (cached.version !== CACHE_VERSION) {
      logger.warn({
        cached_version: cached.version,
        current_version: CACHE_VERSION,
      }, 'Cache version mismatch, invalidating');
      await fs.unlink(SOLAR_SYSTEM_CACHE_FILE).catch(() => {});
      return null;
    }

    const age = Date.now() - cached.timestamp;

    // Check if cache is expired
    if (age > maxAge) {
      // If stale allowed, check stale window
      if (allowStale && age <= CACHE_TTL.PERSISTENT_STALE_WINDOW) {
        logCache.stale('solar-system-position', age);
        return cached;
      }

      logCache.expired('solar-system-position', age);
      await fs.unlink(SOLAR_SYSTEM_CACHE_FILE).catch(() => {});
      return null;
    }

    logCache.hit('solar-system-position', age);
    return cached;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      type: 'cache_read_error'
    }, 'Failed to load solar system cache');
    return null;
  }
}

/**
 * Load solar system position data from persistent cache (sync)
 * Returns null if cache doesn't exist, is invalid, or is expired
 */
export function loadSolarSystemCache(
  maxAge: number = CACHE_TTL.PERSISTENT_MAX_AGE,
  allowStale: boolean = false
): CachedSolarSystemData | null {
  try {
    if (!fsSync.existsSync(SOLAR_SYSTEM_CACHE_FILE)) {
      logCache.miss('solar-system-position');
      return null;
    }

    const content = fsSync.readFileSync(SOLAR_SYSTEM_CACHE_FILE, 'utf-8');
    const cached: CachedSolarSystemData = JSON.parse(content);

    // Verify cache structure
    if (!cached.data || !cached.timestamp) {
      logger.warn('Invalid cache structure, ignoring');
      fsSync.unlinkSync(SOLAR_SYSTEM_CACHE_FILE);
      return null;
    }

    // Check cache version
    if (cached.version !== CACHE_VERSION) {
      logger.warn({
        cached_version: cached.version,
        current_version: CACHE_VERSION,
      }, 'Cache version mismatch, invalidating');
      fsSync.unlinkSync(SOLAR_SYSTEM_CACHE_FILE);
      return null;
    }

    const age = Date.now() - cached.timestamp;

    // Check if cache is expired
    if (age > maxAge) {
      // If stale allowed, check stale window
      if (allowStale && age <= CACHE_TTL.PERSISTENT_STALE_WINDOW) {
        logCache.stale('solar-system-position', age);
        return cached;
      }

      logCache.expired('solar-system-position', age);
      fsSync.unlinkSync(SOLAR_SYSTEM_CACHE_FILE);
      return null;
    }

    logCache.hit('solar-system-position', age);
    return cached;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      type: 'cache_read_error'
    }, 'Failed to load solar system cache (sync)');
    return null;
  }
}

/**
 * Get age of cached data in milliseconds (async)
 * Returns Infinity if cache doesn't exist
 */
export async function getCacheAgeAsync(): Promise<number> {
  const cached = await loadSolarSystemCacheAsync(Infinity, true); // Don't expire
  if (!cached) {
    return Infinity;
  }
  return Date.now() - cached.timestamp;
}

/**
 * Get age of cached data in milliseconds (sync)
 * Returns Infinity if cache doesn't exist
 */
export function getCacheAge(): number {
  const cached = loadSolarSystemCache(Infinity, true); // Don't expire
  if (!cached) {
    return Infinity;
  }
  return Date.now() - cached.timestamp;
}

/**
 * Clear the persistent cache
 */
export async function clearCache(): Promise<void> {
  try {
    await fs.unlink(SOLAR_SYSTEM_CACHE_FILE);
    logger.info('Cleared persistent cache');
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Check if cache exists and is valid (not expired)
 */
export async function isCacheValid(maxAge: number = CACHE_TTL.PERSISTENT_MAX_AGE): Promise<boolean> {
  const cached = await loadSolarSystemCacheAsync(maxAge, false);
  return cached !== null;
}