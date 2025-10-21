/**
 * Redis Cache Client for 3I/ATLAS Dashboard
 * Provides high-performance caching for API responses
 */

import { Redis } from 'ioredis';
import logger from '@/lib/logger';

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: true,
  lazyConnect: true,
};

class RedisCache {
  private client: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      if (process.env.REDIS_ENABLED !== 'true') {
        logger.info('Redis cache disabled by configuration');
        return;
      }

      this.client = new Redis(REDIS_CONFIG);

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis cache connected successfully');
      });

      this.client.on('error', (error) => {
        logger.error({ error: error.message }, 'Redis cache error');
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      // Attempt connection
      await this.client.connect();
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Redis cache');
      this.client = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;

      const parsed = JSON.parse(value) as { data: T; timestamp: number; ttl: number };

      // Check if cache is still valid
      const age = Date.now() - parsed.timestamp;
      if (age > parsed.ttl) {
        await this.client.del(key);
        return null;
      }

      logger.debug({ key, age, ttl: parsed.ttl }, 'Redis cache hit');
      return parsed.data;
    } catch (error) {
      logger.error({ error, key }, 'Redis get error');
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlMs: number = 300000): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      const cacheData = {
        data: value,
        timestamp: Date.now(),
        ttl: ttlMs
      };

      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.client.setex(key, ttlSeconds, JSON.stringify(cacheData));

      logger.debug({ key, ttl: ttlMs }, 'Redis cache set');
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Redis set error');
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;

    try {
      await this.client.del(key);
      logger.debug({ key }, 'Redis cache delete');
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Redis delete error');
      return false;
    }
  }

  /**
   * Clear all cache entries with pattern
   */
  async clear(pattern: string = '*'): Promise<number> {
    if (!this.isConnected || !this.client) return 0;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;

      const deleted = await this.client.del(...keys);
      logger.info({ pattern, deleted }, 'Redis cache cleared');
      return deleted;
    } catch (error) {
      logger.error({ error, pattern }, 'Redis clear error');
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memoryUsage?: number;
    keys?: number;
    hits?: number;
    misses?: number;
  }> {
    if (!this.isConnected || !this.client) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const memMatch = info.match(/used_memory:(\d+)/);
      const keyCount = await this.client.dbsize();

      return {
        connected: true,
        memoryUsage: memMatch ? parseInt(memMatch[1]) : undefined,
        keys: keyCount
      };
    } catch (error) {
      logger.error({ error }, 'Redis stats error');
      return { connected: false };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();

// Export cache key generators
export const cacheKeys = {
  cometData: (forceRefresh?: boolean) =>
    `comet:3i-atlas:data${forceRefresh ? ':fresh' : ''}`,

  observations: (observer?: string, days?: number) =>
    `comet:3i-atlas:obs:${observer || 'all'}:${days || 'all'}`,

  jplHorizons: (type: string) =>
    `comet:3i-atlas:jpl:${type}`,

  theSkyLive: () =>
    `comet:3i-atlas:theskylive`,

  mpc: () =>
    `comet:3i-atlas:mpc`,

  solarSystem: (days?: number) =>
    `comet:3i-atlas:solar:${days || 60}`,

  analytics: (type: string, dateRange?: string) =>
    `comet:3i-atlas:analytics:${type}:${dateRange || 'default'}`,
};

// Export TTL configurations (in milliseconds)
export const cacheTTL = {
  cometData: 5 * 60 * 1000,       // 5 minutes
  observations: 5 * 60 * 1000,     // 5 minutes
  jplHorizons: 30 * 60 * 1000,     // 30 minutes
  theSkyLive: 15 * 60 * 1000,      // 15 minutes
  mpc: 24 * 60 * 60 * 1000,        // 24 hours
  solarSystem: 60 * 60 * 1000,     // 1 hour
  analytics: 15 * 60 * 1000,       // 15 minutes
};