/**
 * Structured logging utility using Pino
 * Provides better log formatting, filtering, and production-ready logging
 */
import pino from 'pino';

// Create logger instance with configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  // Disable pino-pretty transport in Next.js to avoid worker thread issues
  // transport: process.env.NODE_ENV !== 'production' ? {
  //   target: 'pino-pretty',
  //   options: {
  //     colorize: true,
  //     translateTime: 'SYS:standard',
  //     ignore: 'pid,hostname',
  //   }
  // } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * Helper functions for common logging scenarios
 */

export const logAPI = {
  request: (route: string, params?: Record<string, unknown>) => {
    logger.info({ route, params, type: 'api_request' }, `API Request: ${route}`);
  },

  response: (route: string, duration: number, cached: boolean = false) => {
    logger.info({
      route,
      duration_ms: duration,
      cached,
      type: 'api_response'
    }, `API Response: ${route} (${duration}ms)${cached ? ' [CACHED]' : ''}`);
  },

  error: (route: string, error: unknown, duration?: number) => {
    logger.error({
      route,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: duration,
      type: 'api_error'
    }, `API Error: ${route}`);
  },
};

export const logCache = {
  hit: (key: string, age?: number) => {
    logger.debug({
      cache_key: key,
      age_ms: age,
      type: 'cache_hit'
    }, `Cache hit: ${key}${age ? ` (age: ${Math.round(age / 1000)}s)` : ''}`);
  },

  miss: (key: string) => {
    logger.debug({
      cache_key: key,
      type: 'cache_miss'
    }, `Cache miss: ${key}`);
  },

  set: (key: string, ttl?: number) => {
    logger.debug({
      cache_key: key,
      ttl_ms: ttl,
      type: 'cache_set'
    }, `Cache set: ${key}${ttl ? ` (TTL: ${Math.round(ttl / 1000)}s)` : ''}`);
  },

  expired: (key: string, age: number) => {
    logger.debug({
      cache_key: key,
      age_ms: age,
      type: 'cache_expired'
    }, `Cache expired: ${key} (age: ${Math.round(age / 1000)}s)`);
  },

  stale: (key: string, age: number) => {
    logger.warn({
      cache_key: key,
      age_ms: age,
      type: 'cache_stale'
    }, `Serving stale cache: ${key} (age: ${Math.round(age / 1000)}s)`);
  },
};

export const logExternal = {
  request: (service: string, url: string) => {
    logger.debug({
      service,
      url,
      type: 'external_request'
    }, `External API request: ${service}`);
  },

  success: (service: string, duration: number) => {
    logger.info({
      service,
      duration_ms: duration,
      type: 'external_success'
    }, `External API success: ${service} (${duration}ms)`);
  },

  error: (service: string, error: unknown, duration?: number) => {
    logger.error({
      service,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: duration,
      type: 'external_error'
    }, `External API error: ${service}`);
  },

  fallback: (service: string, reason: string) => {
    logger.warn({
      service,
      reason,
      type: 'external_fallback'
    }, `Using fallback for ${service}: ${reason}`);
  },
};

export const logPerformance = {
  measure: (operation: string, duration: number) => {
    const level = duration > 1000 ? 'warn' : 'debug';
    logger[level]({
      operation,
      duration_ms: duration,
      type: 'performance'
    }, `Performance: ${operation} took ${duration}ms`);
  },
};

export default logger;