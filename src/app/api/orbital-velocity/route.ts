/**
 * Orbital Velocity API Endpoint
 *
 * Fetches state vectors (position + velocity) from JPL Horizons VECTORS mode
 * Calculates velocity magnitudes from velocity vectors
 *
 * GET /api/orbital-velocity?days=60
 */

import { NextResponse } from 'next/server';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Disable pino-pretty transport in Next.js to avoid worker thread issues
  // transport: process.env.NODE_ENV === 'development' ? {
  //   target: 'pino-pretty',
  //   options: { colorize: true }
  // } : undefined,
});

// Cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// JPL Horizons constants
const JPL_HORIZONS_BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const COMET_DESIGNATION = "'C/2025 N1'";
const AU_TO_KM = 149597870.7;
const AU_PER_DAY_TO_KM_PER_S = AU_TO_KM / 86400; // Convert AU/day to km/s

interface StateVector {
  date: string;
  position: { x: number; y: number; z: number }; // AU
  velocity: { vx: number; vy: number; vz: number }; // AU/day
}

interface VelocityPoint {
  date: string;
  heliocentric_velocity: number; // km/s
  geocentric_velocity: number;   // km/s
  acceleration: number;           // km/s² (km/s per second)
  distance_from_sun: number;      // AU
  distance_from_earth: number;    // AU
  source: 'JPL Horizons';
  confidence: number;
}

interface OrbitalVelocityResponse {
  velocity_data: VelocityPoint[];
  metadata: {
    total_points: number;
    historic_points: number;
    predicted_points: number;
    date_range: {
      start: string;
      end: string;
    };
  };
}

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

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch state vectors from JPL Horizons (both geocentric and heliocentric)
 */
async function fetchStateVectors(startDate: string, endDate: string, stepSize: string, center: string): Promise<StateVector[]> {
  const params = new URLSearchParams({
    'COMMAND': COMET_DESIGNATION,
    'format': 'text',
    'EPHEM_TYPE': 'VECTORS',
    'START_TIME': startDate,
    'STOP_TIME': endDate,
    'STEP_SIZE': stepSize,
    'CENTER': center, // '500@10' = heliocentric, '500@399' = geocentric
    'OUT_UNITS': 'AU-D', // AU and AU/day
    'REF_PLANE': 'ECLIPTIC',
    'VEC_TABLE': '2' // Position and velocity
  });

  const url = `${JPL_HORIZONS_BASE}?${params.toString()}`;

  logger.info({ msg: 'Fetching JPL state vectors', center, url });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
        'Accept': 'text/plain,*/*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`JPL API error: ${response.status}`);
    }

    const text = await response.text();

    // Parse state vectors from response
    const vectors: StateVector[] = [];
    const dataStart = text.indexOf('$$SOE');
    const dataEnd = text.indexOf('$$EOE');

    if (dataStart === -1 || dataEnd === -1) {
      throw new Error('No vector data found in JPL response');
    }

    const dataSection = text.substring(dataStart + 5, dataEnd);
    const lines = dataSection.split('\n');

    let currentDate: string | null = null;
    let position: { x: number; y: number; z: number } | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Date line: "2460956.500000000 = A.D. 2025-Oct-08 00:00:00.0000 TDB"
      const dateMatch = trimmed.match(/A\.D\.\s+(\d{4})-(\w+)-(\d{2})\s+(\d{2}):(\d{2}):\d{2}/);
      if (dateMatch) {
        const [, year, monthStr, day, hour, minute] = dateMatch;
        const monthMap: Record<string, string> = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        const month = monthMap[monthStr];
        currentDate = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
        continue;
      }

      // Position line: " X =-2.039637384349146E+00 Y =-1.386204634151973E+00 Z = 1.328680781443490E-01"
      if (trimmed.startsWith('X =')) {
        const xMatch = trimmed.match(/X\s*=\s*([^\s]+)/);
        const yMatch = trimmed.match(/Y\s*=\s*([^\s]+)/);
        const zMatch = trimmed.match(/Z\s*=\s*([^\s]+)/);

        if (xMatch && yMatch && zMatch) {
          position = {
            x: parseFloat(xMatch[1]),
            y: parseFloat(yMatch[1]),
            z: parseFloat(zMatch[1])
          };
        }
        continue;
      }

      // Velocity line: " VX=-7.739409332822073E-03 VY= 2.006740312739997E-02 VZ=-1.824385269994904E-03"
      if (trimmed.startsWith('VX=') && currentDate && position) {
        const vxMatch = trimmed.match(/VX=\s*([^\s]+)/);
        const vyMatch = trimmed.match(/VY=\s*([^\s]+)/);
        const vzMatch = trimmed.match(/VZ=\s*([^\s]+)/);

        if (vxMatch && vyMatch && vzMatch) {
          vectors.push({
            date: currentDate,
            position,
            velocity: {
              vx: parseFloat(vxMatch[1]),
              vy: parseFloat(vyMatch[1]),
              vz: parseFloat(vzMatch[1])
            }
          });

          // Reset for next entry
          currentDate = null;
          position = null;
        }
      }
    }

    logger.info({ msg: 'Parsed state vectors', count: vectors.length });
    return vectors;

  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '60');

    // Validate days parameter to prevent JPL Horizons timeouts
    if (days > 90) {
      logger.warn({ msg: 'Days parameter exceeds maximum', days, max: 90 });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid parameter',
          message: 'The "days" parameter must be 90 or less to prevent API timeouts',
          detail: `Requested ${days} days, maximum is 90 days`,
        },
        { status: 400 }
      );
    }

    logger.info({ msg: 'Orbital velocity API request', days });

    // Check cache
    const cacheKey = `orbital-velocity-${days}`;
    const cachedData = getCachedData<OrbitalVelocityResponse>(cacheKey);

    if (cachedData) {
      logger.info({ msg: 'Returning cached orbital velocity data' });
      return NextResponse.json({
        success: true,
        data: cachedData,
        metadata: { cached: true, processingTimeMs: Date.now() - startTime },
        timestamp: new Date().toISOString(),
      });
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    // Fetch both heliocentric and geocentric vectors
    const [helioVectors, geoVectors] = await Promise.all([
      fetchStateVectors(startDateStr, endDateStr, '1d', '500@10'),  // Heliocentric (Sun center)
      fetchStateVectors(startDateStr, endDateStr, '1d', '500@399')  // Geocentric (Earth center)
    ]);

    if (helioVectors.length === 0 || geoVectors.length === 0) {
      throw new Error('No state vector data received from JPL');
    }

    // Combine the data
    const velocityData: VelocityPoint[] = [];

    for (let i = 0; i < Math.min(helioVectors.length, geoVectors.length); i++) {
      const helio = helioVectors[i];
      const geo = geoVectors[i];

      // Calculate velocity magnitudes from velocity vectors
      const helioVel = Math.sqrt(
        helio.velocity.vx ** 2 +
        helio.velocity.vy ** 2 +
        helio.velocity.vz ** 2
      ) * AU_PER_DAY_TO_KM_PER_S;

      const geoVel = Math.sqrt(
        geo.velocity.vx ** 2 +
        geo.velocity.vy ** 2 +
        geo.velocity.vz ** 2
      ) * AU_PER_DAY_TO_KM_PER_S;

      // Calculate distances
      const distFromSun = Math.sqrt(
        helio.position.x ** 2 +
        helio.position.y ** 2 +
        helio.position.z ** 2
      );

      const distFromEarth = Math.sqrt(
        geo.position.x ** 2 +
        geo.position.y ** 2 +
        geo.position.z ** 2
      );

      velocityData.push({
        date: helio.date,
        heliocentric_velocity: helioVel,
        geocentric_velocity: geoVel,
        acceleration: 0, // Will calculate next
        distance_from_sun: distFromSun,
        distance_from_earth: distFromEarth,
        source: 'JPL Horizons',
        confidence: 0.95
      });
    }

    // Calculate acceleration from velocity changes
    // a = dv/dt where dv is in km/s and dt is in seconds
    for (let i = 1; i < velocityData.length; i++) {
      const prev = velocityData[i - 1];
      const curr = velocityData[i];

      const dv = curr.heliocentric_velocity - prev.heliocentric_velocity; // km/s
      const dt_ms = new Date(curr.date).getTime() - new Date(prev.date).getTime(); // milliseconds
      const dt_seconds = dt_ms / 1000; // convert to seconds

      curr.acceleration = dv / dt_seconds; // km/s² (standard SI-derived units)
    }

    const response: OrbitalVelocityResponse = {
      velocity_data: velocityData,
      metadata: {
        total_points: velocityData.length,
        historic_points: velocityData.length,
        predicted_points: 0,
        date_range: {
          start: velocityData[0].date,
          end: velocityData[velocityData.length - 1].date
        }
      }
    };

    setCachedData(cacheKey, response);

    const processingTime = Date.now() - startTime;

    logger.info({
      msg: 'Orbital velocity calculation complete',
      processingTime,
      totalPoints: velocityData.length
    });

    return NextResponse.json({
      success: true,
      data: response,
      metadata: { cached: false, processingTimeMs: processingTime },
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        // Browser + CDN cache for 10 minutes (orbital velocity is stable)
        'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=1200',
        'X-Processing-Time': processingTime.toString(),
      },
    });

  } catch (error) {
    logger.error({
      msg: 'Error in orbital velocity API',
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to get orbital velocity data',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
      headers: { 'Cache-Control': 'no-cache' },
    });
  }
}
