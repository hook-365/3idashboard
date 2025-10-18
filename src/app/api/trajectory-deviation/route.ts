import { NextResponse } from 'next/server';
import pino from 'pino';
import { getTheSkyLiveOrbitalData } from '@/lib/data-sources/theskylive';
import { calculateAtlasRADEC, calculateAngularSeparation, angularToLinearDistance } from '@/lib/orbital-calculations';
import type { TrajectoryDeviation } from '@/types/trajectory-deviation';
import { DEVIATION_THRESHOLDS } from '@/types/trajectory-deviation';

// Initialize Pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Disable pino-pretty transport in Next.js to avoid worker thread issues
  // transport: process.env.NODE_ENV === 'development' ? {
  //   target: 'pino-pretty',
  //   options: {
  //     colorize: true,
  //   }
  // } : undefined,
});

// Cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<TrajectoryDeviation>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data if still valid
 */
function getCachedData(key: string): TrajectoryDeviation | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set cached data
 */
function setCachedData(key: string, data: TrajectoryDeviation): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Calculate trajectory deviation from JPL predictions
 */
async function calculateTrajectoryDeviation(): Promise<TrajectoryDeviation> {
  const startTime = Date.now();

  try {
    // Get predicted position from our orbital elements
    const predictedPosition = calculateAtlasRADEC();
    logger.info({
      msg: 'Calculated predicted position from orbital elements',
      ra: predictedPosition.ra.toFixed(4),
      dec: predictedPosition.dec.toFixed(4),
    });

    // Get observed position from TheSkyLive
    const observedData = await getTheSkyLiveOrbitalData();

    if (!observedData || observedData.ra === undefined || observedData.dec === undefined) {
      throw new Error('No observed position data available from TheSkyLive');
    }

    logger.info({
      msg: 'Fetched observed position from TheSkyLive',
      ra: observedData.ra.toFixed(4),
      dec: observedData.dec.toFixed(4),
    });

    // Calculate angular separation
    const angularError = calculateAngularSeparation(
      predictedPosition.ra,
      predictedPosition.dec,
      observedData.ra,
      observedData.dec
    );

    logger.info({
      msg: 'Calculated angular separation',
      angularError: angularError.toFixed(2),
      unit: 'arcseconds',
    });

    // Convert to linear distance using geocentric distance
    const geocentricDistance = observedData.geocentric_distance || 3.0; // Default to ~3 AU if not available
    const positionError = angularToLinearDistance(angularError, geocentricDistance);

    logger.info({
      msg: 'Converted to linear distance',
      positionError: positionError.toFixed(6),
      unit: 'AU',
      geocentricDistance: geocentricDistance.toFixed(3),
    });

    // Determine health status based on thresholds
    let healthStatus: 'good' | 'warning' | 'critical';
    const alerts: string[] = [];

    if (positionError < DEVIATION_THRESHOLDS.GOOD.positionError &&
        angularError < DEVIATION_THRESHOLDS.GOOD.angularError) {
      healthStatus = 'good';
      alerts.push('Trajectory predictions are accurate - no significant deviation detected');
    } else if (positionError < DEVIATION_THRESHOLDS.WARNING.positionError &&
               angularError < DEVIATION_THRESHOLDS.WARNING.angularError) {
      healthStatus = 'warning';
      alerts.push('Minor trajectory deviation detected - within expected range for cometary activity');
      if (angularError > DEVIATION_THRESHOLDS.GOOD.angularError) {
        alerts.push(`Sky position differs by ${angularError.toFixed(1)} arcseconds from predictions`);
      }
    } else {
      healthStatus = 'critical';
      alerts.push('⚠️ Significant trajectory deviation detected!');
      alerts.push('This may indicate strong non-gravitational forces (outgassing) affecting the orbit');
      if (positionError > DEVIATION_THRESHOLDS.WARNING.positionError) {
        alerts.push(`Position error: ${positionError.toFixed(3)} AU (${(positionError * 149597870.7).toFixed(0)} km)`);
      }
      if (angularError > DEVIATION_THRESHOLDS.WARNING.angularError) {
        alerts.push(`Angular error: ${angularError.toFixed(1)} arcseconds`);
      }
      alerts.push('JPL orbital elements may need updating with new observations');
    }

    // Calculate data age (days since orbital elements epoch)
    const jplEpochDate = new Date('2025-07-18T00:00:00.000Z'); // Epoch from orbital elements
    const dataAge = (Date.now() - jplEpochDate.getTime()) / (1000 * 60 * 60 * 24);

    // If orbital elements are very old, add a warning
    if (dataAge > 90) {
      alerts.push(`⚠️ Orbital elements are ${Math.floor(dataAge)} days old - predictions may be less accurate`);
    }

    const result: TrajectoryDeviation = {
      currentDeviation: {
        positionError,
        angularError,
        velocityError: undefined, // Not implemented in v1
        lastObservation: observedData.last_updated,
        lastPredictionUpdate: jplEpochDate.toISOString(),
        dataAge,
      },
      healthStatus,
      alerts,
      // Historical deviations not implemented in v1
      historicalDeviations: undefined,
    };

    const processingTime = Date.now() - startTime;
    logger.info({
      msg: 'Trajectory deviation calculation complete',
      processingTime,
      healthStatus,
      positionError,
      angularError,
    });

    return result;

  } catch (error) {
    logger.error({
      msg: 'Error calculating trajectory deviation',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}

/**
 * GET /api/trajectory-deviation
 * Returns trajectory deviation data
 */
export async function GET() {
  const startTime = Date.now();

  try {
    logger.info({ msg: 'Trajectory deviation API request received' });

    // Check cache first
    const cacheKey = 'trajectory-deviation';
    const cachedData = getCachedData(cacheKey);

    if (cachedData) {
      logger.info({ msg: 'Returning cached trajectory deviation data' });
      const processingTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        data: cachedData,
        metadata: {
          cached: true,
          processingTimeMs: processingTime,
          dataSource: 'Cached',
        },
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Processing-Time': processingTime.toString(),
          'X-Data-Source': 'Cached',
        },
      });
    }

    // Calculate fresh data
    const deviationData = await calculateTrajectoryDeviation();

    // Cache the result
    setCachedData(cacheKey, deviationData);

    const processingTime = Date.now() - startTime;

    logger.info({
      msg: 'Trajectory deviation API request completed',
      processingTime,
      healthStatus: deviationData.healthStatus,
    });

    return NextResponse.json({
      success: true,
      data: deviationData,
      metadata: {
        cached: false,
        processingTimeMs: processingTime,
        dataSource: 'TheSkyLive + Calculated Predictions',
        apiVersion: '1.0',
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Processing-Time': processingTime.toString(),
        'X-Data-Source': 'Fresh-Calculation',
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      msg: 'Trajectory deviation API error',
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to calculate trajectory deviation',
      message: errorMessage,
      detail: 'Unable to calculate trajectory deviation at this time. This may be due to missing data from TheSkyLive or calculation errors.',
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
    }, {
      status: 503, // Service Unavailable
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': processingTime.toString(),
      },
    });
  }
}
