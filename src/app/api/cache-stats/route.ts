/**
 * Cache Statistics API Endpoint
 * Provides detailed metrics about cache performance and usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { redisCache } from '@/lib/cache/redis-client';
import { sqliteDB } from '@/lib/database/sqlite-client';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // Handle cache clearing action
    if (action === 'clear') {
      const pattern = searchParams.get('pattern') || '*';
      const cleared = await clearCache(pattern);

      logger.info({ pattern, cleared }, 'Cache cleared via API');

      return NextResponse.json({
        success: true,
        action: 'clear',
        pattern,
        cleared,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle cache cleanup action
    if (action === 'cleanup') {
      const cleaned = sqliteDB.cleanExpiredCache();

      logger.info({ cleaned }, 'Expired cache entries cleaned');

      return NextResponse.json({
        success: true,
        action: 'cleanup',
        cleaned,
        timestamp: new Date().toISOString(),
      });
    }

    // Get cache statistics
    const [redisStats, sqliteStats] = await Promise.all([
      redisCache.getStats(),
      sqliteDB.getStats(),
    ]);

    // Get recent COBS observations from SQLite
    const recentObservations = sqliteDB.getCOBSObservations({
      limit: 10,
      objectId: '3I',
    }) as any[];

    // Get cached API responses count
    const cachedAPIs = sqliteStats ? Object.keys(sqliteStats.api_cache || {}) : [];

    const stats = {
      redis: {
        ...redisStats,
        enabled: process.env.REDIS_ENABLED === 'true',
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || '6379',
      },
      sqlite: {
        ...sqliteStats,
        recentObservationsCount: recentObservations.length,
        lastObservationDate: recentObservations[0]?.date || null,
      },
      cache_ttl: {
        cometData: '5 minutes',
        observations: '5 minutes',
        jplHorizons: '30 minutes',
        theSkyLive: '15 minutes',
        mpc: '24 hours',
        solarSystem: '1 hour',
        analytics: '15 minutes',
      },
      cached_endpoints: cachedAPIs,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      processingTimeMs: Date.now() - startTime,
    };

    logger.debug({ processingTime: stats.processingTimeMs }, 'Cache stats retrieved');

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': stats.processingTimeMs.toString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get cache stats');

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

async function clearCache(pattern: string): Promise<number> {
  try {
    const clearedCount = await redisCache.clear(pattern);
    return clearedCount;
  } catch (error) {
    logger.error({ error, pattern }, 'Failed to clear cache');
    return 0;
  }
}

// DELETE method to clear specific cache entries
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { key, pattern } = body;

    let result;
    if (key) {
      // Delete specific key
      const deleted = await redisCache.del(key);
      result = {
        success: deleted,
        deleted: deleted ? 1 : 0,
        key,
      };
    } else if (pattern) {
      // Clear by pattern
      const cleared = await redisCache.clear(pattern);
      result = {
        success: true,
        cleared,
        pattern,
      };
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Either key or pattern must be provided',
        },
        { status: 400 }
      );
    }

    logger.info({ ...result, processingTime: Date.now() - startTime }, 'Cache delete operation');

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error({ error }, 'Cache delete operation failed');

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}