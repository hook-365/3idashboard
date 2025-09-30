/**
 * Cache configuration constants
 * Centralized TTL values and cache settings
 */

export const CACHE_TTL = {
  // API data cache TTLs (in milliseconds)
  COBS_DATA: 5 * 60 * 1000,           // 5 minutes - observation data updates frequently
  THESKYLIVE: 15 * 60 * 1000,         // 15 minutes - coordinate data
  JPL_HORIZONS: 30 * 60 * 1000,       // 30 minutes - orbital data
  NASA_SBDB: 60 * 60 * 1000,          // 1 hour - orbital elements change slowly

  // Persistent cache settings
  PERSISTENT_MAX_AGE: 24 * 60 * 60 * 1000,     // 24 hours - max age before cache expires
  PERSISTENT_STALE_WINDOW: 48 * 60 * 60 * 1000, // 48 hours - stale-while-revalidate window

  // HTTP cache headers (in seconds)
  HTTP_CACHE_PUBLIC: 300,             // 5 minutes for public cache
  HTTP_STALE_WHILE_REVALIDATE: 600,   // 10 minutes stale-while-revalidate
} as const;

export const CACHE_KEYS = {
  SOLAR_SYSTEM: 'solar-system-position',
  COMET_DATA: 'comet-data',
  OBSERVATIONS: 'observations',
  OBSERVERS: 'observers',
  JPL_HORIZONS: 'jpl-horizons',
  NASA_SBDB: 'nasa-sbdb',
  COBS: 'cobs',
  THESKYLIVE: 'theskylive',
} as const;

export const CACHE_VERSION = '1.0.0'; // Increment to bust all caches