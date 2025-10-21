/**
 * Health Check API Endpoint
 * Monitors the status of cache systems, database, and external data sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { redisCache } from '@/lib/cache/redis-client';
import { sqliteDB } from '@/lib/database/sqlite-client';
import logger from '@/lib/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    redis: {
      connected: boolean;
      stats?: any;
      error?: string;
    };
    sqlite: {
      connected: boolean;
      stats?: any;
      error?: string;
    };
    dataSources: any[];
  };
  timestamp: string;
  uptime: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check Redis health
    const redisHealth = await checkRedisHealth();

    // Check SQLite health
    const sqliteHealth = await checkSQLiteHealth();

    // Check data source health
    const dataSourceHealth = await checkDataSourceHealth();

    // Calculate overall status
    const overallStatus = calculateOverallStatus(
      redisHealth.connected,
      sqliteHealth.connected,
      dataSourceHealth
    );

    const healthStatus: HealthStatus = {
      status: overallStatus,
      services: {
        redis: redisHealth,
        sqlite: sqliteHealth,
        dataSources: dataSourceHealth,
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    logger.info({
      status: overallStatus,
      processingTime: Date.now() - startTime
    }, 'Health check completed');

    return NextResponse.json(healthStatus, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': (Date.now() - startTime).toString(),
      },
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}

async function checkRedisHealth() {
  try {
    const isHealthy = await redisCache.healthCheck();
    const stats = await redisCache.getStats();

    return {
      connected: isHealthy,
      stats,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Redis check failed',
    };
  }
}

async function checkSQLiteHealth() {
  try {
    const stats = sqliteDB.getStats();
    const sourceHealth = sqliteDB.getSourceHealth();

    return {
      connected: stats !== null,
      stats: {
        ...stats,
        sourceHealth,
      },
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'SQLite check failed',
    };
  }
}

async function checkDataSourceHealth() {
  try {
    // Get health status from SQLite
    const sourceHealth = sqliteDB.getSourceHealth();

    // Also do a quick check of critical endpoints
    const endpoints = [
      { name: 'COBS', url: 'https://cobs.si/api/', timeout: 2000 },
      { name: 'JPL Horizons', url: 'https://ssd.jpl.nasa.gov/api/horizons.api', timeout: 2000 },
      { name: 'TheSkyLive', url: 'https://theskylive.com/', timeout: 2000 },
    ];

    const healthChecks = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

        try {
          const startTime = Date.now();
          const response = await fetch(endpoint.url, {
            signal: controller.signal,
            method: 'HEAD',
          });

          const responseTime = Date.now() - startTime;
          clearTimeout(timeoutId);

          const status = response.ok ? 'healthy' : 'degraded';

          // Update database with health status
          sqliteDB.updateSourceHealth(endpoint.name, status, undefined, responseTime);

          return {
            name: endpoint.name,
            status,
            responseTime,
            statusCode: response.status,
          };
        } catch (error) {
          clearTimeout(timeoutId);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';

          // Update database with failure
          sqliteDB.updateSourceHealth(endpoint.name, 'failed', errorMsg);

          return {
            name: endpoint.name,
            status: 'failed',
            error: errorMsg,
          };
        }
      })
    );

    return healthChecks.map(result =>
      result.status === 'fulfilled' ? result.value : {
        name: 'Unknown',
        status: 'failed',
        error: result.reason,
      }
    );
  } catch (error) {
    return [];
  }
}

function calculateOverallStatus(
  redisConnected: boolean,
  sqliteConnected: boolean,
  dataSources: any[]
): 'healthy' | 'degraded' | 'unhealthy' {
  // If both caches are down, system is unhealthy
  if (!redisConnected && !sqliteConnected) {
    return 'unhealthy';
  }

  // Count healthy data sources
  const healthySources = dataSources.filter(s => s.status === 'healthy').length;
  const totalSources = dataSources.length;

  // If no data sources are healthy and no cache, system is unhealthy
  if (healthySources === 0 && !sqliteConnected) {
    return 'unhealthy';
  }

  // If some services are down but we have fallbacks, system is degraded
  if (!redisConnected || !sqliteConnected || healthySources < totalSources) {
    return 'degraded';
  }

  // Everything is working
  return 'healthy';
}