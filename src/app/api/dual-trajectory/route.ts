/**
 * Dual Trajectory API Endpoint
 *
 * Returns both predicted trajectory (from MPC orbital elements dated July 18, 2025)
 * and actual trajectory (from JPL Horizons observer ephemeris with TheSkyLive fallback)
 * for visualization in the 3D solar system.
 *
 * This endpoint enables real-time trajectory deviation visualization by showing:
 * - Predicted trail: Blue line calculated from MPC orbital elements
 * - Actual trail: Red/orange line from JPL Horizons ephemeris (primary) or TheSkyLive (fallback)
 * - Deviation: Distance between predicted and actual current positions
 *
 * GET /api/dual-trajectory?days=60
 */

import { NextResponse } from 'next/server';
import pino from 'pino';
import {
  calculatePositionFromElements,
  raDecToHeliocentric,
  calculateAngularSeparation,
  angularToLinearDistance
} from '@/lib/orbital-calculations';
import { fetchEphemerisTable, fetchTheSkyLiveData } from '@/lib/data-sources/theskylive';
import { fetchJPLEphemerisData } from '@/lib/data-sources/jpl-horizons';

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

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// 3I/ATLAS orbital elements from MPC MPEC 2025-N12 (July 18, 2025)
const MPC_ORBITAL_ELEMENTS = {
  e: 6.2769203,      // Eccentricity (hyperbolic)
  q: 1.3745928,      // Perihelion distance (AU)
  i: 175.11669,      // Inclination (degrees)
  omega: 127.79317,  // Argument of periapsis (degrees)
  node: 322.27219,   // Longitude of ascending node (degrees)
  perihelion: new Date('2025-10-29T05:03:46.000Z'), // Perihelion date
  epoch: '2025-07-18', // Epoch of orbital elements
  source: 'MPC MPEC 2025-N12'
};

interface TrajectoryPoint {
  date: string;
  x: number;
  y: number;
  z: number;
  distance_from_sun: number;
}

interface DualTrajectoryData {
  predicted: {
    trail: TrajectoryPoint[];
    current: TrajectoryPoint;
    source: string;
    epoch: string;
  };
  actual: {
    trail: TrajectoryPoint[];
    current: TrajectoryPoint;
    source: string;
    source_type: 'primary' | 'fallback';
    lastUpdate: string;
  };
  deviation: {
    position_error_au: number;
    position_error_km: number;
    angular_error_arcsec: number;
  };
}

/**
 * Get cached data if still valid
 */
function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set cached data
 */
function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Calculate predicted trajectory from MPC orbital elements
 */
function calculatePredictedTrajectory(days: number): TrajectoryPoint[] {
  const trail: TrajectoryPoint[] = [];
  const now = new Date();
  const perihelion = MPC_ORBITAL_ELEMENTS.perihelion;

  // Calculate trail: from (now - days/2) to (now + days/2)
  const startDate = new Date(now.getTime() - (days / 2) * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + (days / 2) * 24 * 60 * 60 * 1000);

  const stepDays = 2; // 2-day intervals for smooth trail
  const numSteps = Math.floor(days / stepDays);

  for (let step = 0; step <= numSteps; step++) {
    const date = new Date(startDate.getTime() + step * stepDays * 24 * 60 * 60 * 1000);

    // Calculate days from perihelion
    const daysFromPerihelion = (date.getTime() - perihelion.getTime()) / (1000 * 60 * 60 * 24);

    // Calculate position using Kepler mechanics
    const position = calculatePositionFromElements(daysFromPerihelion, {
      e: MPC_ORBITAL_ELEMENTS.e,
      q: MPC_ORBITAL_ELEMENTS.q,
      i: MPC_ORBITAL_ELEMENTS.i,
      omega: MPC_ORBITAL_ELEMENTS.omega,
      node: MPC_ORBITAL_ELEMENTS.node
    });

    const distance_from_sun = Math.sqrt(
      position.x ** 2 + position.y ** 2 + position.z ** 2
    );

    trail.push({
      date: date.toISOString(),
      x: position.x,
      y: position.y,
      z: position.z,
      distance_from_sun
    });
  }

  logger.info({
    msg: 'Calculated predicted trajectory from MPC orbital elements',
    points: trail.length,
    dateRange: `${trail[0].date} to ${trail[trail.length - 1].date}`,
    source: MPC_ORBITAL_ELEMENTS.source
  });

  return trail;
}

/**
 * Calculate actual trajectory from JPL Horizons ephemeris (primary) or TheSkyLive (fallback)
 */
async function calculateActualTrajectory(): Promise<{
  trail: TrajectoryPoint[];
  source: string;
  source_type: 'primary' | 'fallback';
  lastUpdate: string;
} | null> {

  // Try JPL Horizons first (60 days of past data)
  try {
    logger.info('Attempting to fetch JPL Horizons observer ephemeris...');

    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const jplData = await fetchJPLEphemerisData({
      start: sixtyDaysAgo.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    }, '1d'); // Daily steps

    if (jplData && jplData.ephemeris_points.length > 0) {
      logger.info({
        msg: 'Successfully fetched JPL Horizons ephemeris (PRIMARY SOURCE)',
        points: jplData.ephemeris_points.length,
        dateRange: `${jplData.ephemeris_points[0].date} to ${jplData.ephemeris_points[jplData.ephemeris_points.length - 1].date}`
      });

      // Fetch geocentric distance for coordinate conversion
      let currentGeocentricDistance = 2.5; // Default fallback
      try {
        const skyLiveData = await fetchTheSkyLiveData();
        if (skyLiveData && skyLiveData.geocentric_distance > 0) {
          currentGeocentricDistance = skyLiveData.geocentric_distance;
        }
      } catch (error) {
        logger.warn('Using default geocentric distance for JPL ephemeris conversion');
      }

      // Convert JPL ephemeris points to heliocentric coordinates
      const trail: TrajectoryPoint[] = [];
      for (const point of jplData.ephemeris_points) {
        try {
          const date = new Date(point.date);
          const heliocentricPos = raDecToHeliocentric(
            point.ra,
            point.dec,
            point.delta || currentGeocentricDistance, // Use JPL's delta if available
            date
          );

          trail.push({
            date: point.date,
            x: heliocentricPos.x,
            y: heliocentricPos.y,
            z: heliocentricPos.z,
            distance_from_sun: heliocentricPos.distance_from_sun
          });
        } catch (error) {
          logger.warn({
            msg: 'Failed to convert JPL ephemeris point',
            date: point.date,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      if (trail.length > 0) {
        logger.info({
          msg: 'Converted JPL ephemeris to heliocentric coordinates',
          points: trail.length
        });

        return {
          trail,
          source: 'JPL Horizons Observer Ephemeris',
          source_type: 'primary',
          lastUpdate: new Date().toISOString()
        };
      }
    }
  } catch (error) {
    logger.warn({
      msg: 'JPL Horizons ephemeris unavailable, falling back to TheSkyLive',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Fallback to TheSkyLive
  logger.info('Using TheSkyLive as fallback source...');

  try {
    const ephemerisTable = await fetchEphemerisTable();

    if (!ephemerisTable || ephemerisTable.predictions.length === 0) {
      logger.warn('No ephemeris data available from TheSkyLive');
      return null;
    }

    logger.info({
      msg: 'Fetched ephemeris data from TheSkyLive (FALLBACK SOURCE)',
      predictions: ephemerisTable.predictions.length,
      dateRange: `${ephemerisTable.predictions[0].date} to ${ephemerisTable.predictions[ephemerisTable.predictions.length - 1].date}`
    });

    // Fetch current geocentric distance
    let currentGeocentricDistance = 3.0;
    try {
      const skyLiveData = await fetchTheSkyLiveData();
      if (skyLiveData && skyLiveData.geocentric_distance > 0) {
        currentGeocentricDistance = skyLiveData.geocentric_distance;
      }
    } catch (error) {
      logger.warn('Using default geocentric distance for TheSkyLive');
    }

    // Convert TheSkyLive ephemeris to heliocentric coordinates
    const trail: TrajectoryPoint[] = [];
    for (const prediction of ephemerisTable.predictions) {
      try {
        const date = new Date(prediction.date);
        const heliocentricPos = raDecToHeliocentric(
          prediction.ra,
          prediction.dec,
          currentGeocentricDistance,
          date
        );

        trail.push({
          date: prediction.date,
          x: heliocentricPos.x,
          y: heliocentricPos.y,
          z: heliocentricPos.z,
          distance_from_sun: heliocentricPos.distance_from_sun
        });
      } catch (error) {
        logger.warn({
          msg: 'Failed to convert TheSkyLive ephemeris prediction',
          date: prediction.date,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (trail.length > 0) {
      logger.info({
        msg: 'Converted TheSkyLive ephemeris to heliocentric coordinates',
        points: trail.length
      });

      return {
        trail,
        source: 'TheSkyLive Ephemeris',
        source_type: 'fallback',
        lastUpdate: ephemerisTable.captured_at
      };
    }

    return null;

  } catch (error) {
    logger.error({
      msg: 'All ephemeris sources failed',
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Calculate trajectory deviation between predicted and actual positions
 */
function calculateDeviation(
  predictedCurrent: TrajectoryPoint,
  actualCurrent: TrajectoryPoint
): {
  position_error_au: number;
  position_error_km: number;
  angular_error_arcsec: number;
} {
  // Calculate 3D Euclidean distance between positions
  const positionError = Math.sqrt(
    (predictedCurrent.x - actualCurrent.x) ** 2 +
    (predictedCurrent.y - actualCurrent.y) ** 2 +
    (predictedCurrent.z - actualCurrent.z) ** 2
  );

  // Convert AU to km
  const positionErrorKm = positionError * 149597870.7;

  // Calculate angular separation (simplified - assumes we can derive RA/Dec)
  // For now, use approximate angular separation based on 3D distance and heliocentric distance
  const heliocentricDistance = actualCurrent.distance_from_sun;
  const angularError = angularToLinearDistance(1, heliocentricDistance) > 0
    ? (positionError / angularToLinearDistance(1, heliocentricDistance))
    : 0;

  return {
    position_error_au: positionError,
    position_error_km: positionErrorKm,
    angular_error_arcsec: angularError
  };
}

/**
 * GET /api/dual-trajectory
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '60');

    logger.info({
      msg: 'Dual trajectory API request',
      days
    });

    // Check cache first
    const cacheKey = `dual-trajectory-${days}`;
    const cachedData = getCachedData<DualTrajectoryData>(cacheKey);

    if (cachedData) {
      logger.info({ msg: 'Returning cached dual trajectory data' });
      const processingTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        data: cachedData,
        metadata: {
          cached: true,
          processingTimeMs: processingTime,
        },
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
          'X-Processing-Time': processingTime.toString(),
        },
      });
    }

    // Calculate predicted trajectory from MPC orbital elements
    const predictedTrail = calculatePredictedTrajectory(days);

    // Find current predicted position (closest to now)
    const now = new Date();
    const predictedCurrent = predictedTrail.reduce((closest, point) => {
      const pointDate = new Date(point.date);
      const closestDate = new Date(closest.date);
      return Math.abs(pointDate.getTime() - now.getTime()) <
             Math.abs(closestDate.getTime() - now.getTime())
        ? point : closest;
    });

    // Calculate actual trajectory from JPL Horizons (primary) or TheSkyLive (fallback)
    const actualData = await calculateActualTrajectory();

    if (!actualData || actualData.trail.length === 0) {
      // If we can't get actual trajectory, return only predicted
      logger.warn('No actual trajectory data available - returning predicted only');

      const response: DualTrajectoryData = {
        predicted: {
          trail: predictedTrail,
          current: predictedCurrent,
          source: MPC_ORBITAL_ELEMENTS.source,
          epoch: MPC_ORBITAL_ELEMENTS.epoch
        },
        actual: {
          trail: [],
          current: predictedCurrent, // Fallback to predicted
          source: 'Unavailable',
          source_type: 'fallback',
          lastUpdate: new Date().toISOString()
        },
        deviation: {
          position_error_au: 0,
          position_error_km: 0,
          angular_error_arcsec: 0
        }
      };

      return NextResponse.json({
        success: true,
        data: response,
        warning: 'Actual trajectory data unavailable from all sources - showing predicted only',
        metadata: {
          cached: false,
          processingTimeMs: Date.now() - startTime,
        },
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Find current actual position (most recent in ephemeris)
    const actualCurrent = actualData.trail[actualData.trail.length - 1];

    // Calculate deviation
    const deviation = calculateDeviation(predictedCurrent, actualCurrent);

    const response: DualTrajectoryData = {
      predicted: {
        trail: predictedTrail,
        current: predictedCurrent,
        source: MPC_ORBITAL_ELEMENTS.source,
        epoch: MPC_ORBITAL_ELEMENTS.epoch
      },
      actual: {
        trail: actualData.trail,
        current: actualCurrent,
        source: actualData.source,
        source_type: actualData.source_type,
        lastUpdate: actualData.lastUpdate
      },
      deviation: {
        position_error_au: deviation.position_error_au,
        position_error_km: deviation.position_error_km,
        angular_error_arcsec: deviation.angular_error_arcsec
      }
    };

    // Cache the result
    setCachedData(cacheKey, response);

    const processingTime = Date.now() - startTime;

    logger.info({
      msg: 'Dual trajectory calculation complete',
      processingTime,
      predictedPoints: response.predicted.trail.length,
      actualPoints: response.actual.trail.length,
      deviationAU: deviation.position_error_au.toFixed(6)
    });

    return NextResponse.json({
      success: true,
      data: response,
      metadata: {
        cached: false,
        processingTimeMs: processingTime,
      },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Processing-Time': processingTime.toString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      msg: 'Dual trajectory API error',
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to calculate dual trajectory',
      message: errorMessage,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
