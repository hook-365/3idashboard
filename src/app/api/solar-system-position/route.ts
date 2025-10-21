import { NextRequest, NextResponse } from 'next/server';
import { getJPLHorizonsOrbitalData } from '@/lib/data-sources/jpl-horizons';
import * as Astronomy from 'astronomy-engine';
import { saveSolarSystemCache, loadSolarSystemCache } from '@/lib/cache/persistent-cache';
import { getSBDBPosition } from '@/lib/data-sources/nasa-sbdb';
import { CACHE_TTL } from '@/constants/cache';
import { calculatePositionFromElements } from '@/lib/orbital-calculations';
import logger from '@/lib/logger';
import {
  calculateAtlasProjectionFromStateVectors,
  calculateAtlasTrailFromOrbit,
  getCalculationMetadata
} from '@/lib/orbital-bridge';
import {
  PLANET_ORBITS,
  calculateAllPlanetPositions,
  calculatePlanetOrbitalPath,
  calculateEarthPosition,
  calculateEarthVelocity
} from '@/lib/planet-positions';

/**
 * 3I/ATLAS Solar System Position API
 *
 * Provides 3D position data for solar system visualization:
 * - Current 3I/ATLAS position relative to Sun (heliocentric coordinates)
 * - All 8 planet positions from JPL Horizons (real positions, not calculated)
 * - Recent orbital trail (30-90 days) for trajectory visualization
 * - Distance calculations and orbital plane information
 *
 * Data suitable for 3D solar system visualization and trajectory plotting
 */

export interface SolarSystemPosition {
  comet_position: {
    x: number;     // AU - heliocentric X coordinate
    y: number;     // AU - heliocentric Y coordinate
    z: number;     // AU - heliocentric Z coordinate
    distance_from_sun: number;    // AU - heliocentric distance
    distance_from_earth: number;  // AU - geocentric distance
  };
  earth_position: {
    x: number;     // AU - heliocentric X coordinate
    y: number;     // AU - heliocentric Y coordinate
    z: number;     // AU - heliocentric Z coordinate (near zero - ecliptic plane)
  };
  sun_position: {
    x: 0;          // AU - Sun at origin
    y: 0;          // AU - Sun at origin
    z: 0;          // AU - Sun at origin
  };
  planets: Array<{
    name: string;
    x: number;     // AU - heliocentric X coordinate
    y: number;     // AU - heliocentric Y coordinate
    z: number;     // AU - heliocentric Z coordinate
    distance_from_sun: number; // AU
    orbital_elements?: {
      semi_major_axis: number;  // AU - average distance from Sun
      eccentricity: number;     // 0 = circle, <1 = ellipse
      inclination: number;      // degrees
      longitude_of_ascending_node: number; // degrees
      argument_of_periapsis: number; // degrees
      mean_anomaly: number;     // degrees at epoch
    };
    orbital_path?: Array<{
      x: number;   // AU - position along orbit
      y: number;   // AU - position along orbit
      z: number;   // AU - position along orbit
    }>;
  }>;
  orbital_trail: Array<{
    date: string;
    x: number;     // AU - position at date
    y: number;     // AU - position at date
    z: number;     // AU - position at date
    distance_from_sun: number; // AU
  }>;
  orbital_projection: Array<{
    date: string;
    x: number;     // AU - projected future position
    y: number;     // AU - projected future position
    z: number;     // AU - projected future position
    distance_from_sun: number; // AU
  }>;
  orbital_plane: {
    inclination: number;       // degrees - orbital inclination to ecliptic
    ascending_node: number;    // degrees - longitude of ascending node
    argument_of_periapsis: number; // degrees
    eccentricity: number;      // orbital eccentricity (>1 for hyperbolic)
  };
  velocities: {
    comet_velocity: {
      x: number;   // AU/day - velocity vector X component
      y: number;   // AU/day - velocity vector Y component
      z: number;   // AU/day - velocity vector Z component
      magnitude: number; // AU/day - total velocity magnitude
    };
    earth_velocity: {
      x: number;   // AU/day - Earth's orbital velocity X
      y: number;   // AU/day - Earth's orbital velocity Y
      z: number;   // AU/day - Earth's orbital velocity Z
      magnitude: number; // AU/day - Earth's orbital speed (~0.017 AU/day)
    };
  };
  metadata: {
    reference_frame: string;   // 'heliocentric_ecliptic'
    epoch: string;            // ISO timestamp of current data
    data_source: string;      // 'JPL_Horizons'
    trail_period_days: number; // Number of days in orbital trail
    coordinate_system: string; // 'ecliptic_j2000'
    planets_source: string;    // 'JPL_Horizons' or 'calculated'
  };
}

// Cache for orbital trail data to avoid repeated JPL requests
interface CacheEntry {
  data: SolarSystemPosition;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Calculate 3I/ATLAS future projection using Kepler mechanics from current position
 */
async function calculateAtlasProjection(
  projectionDays: number = 720,
  startDate: Date = new Date(),
  currentPosition?: [number, number, number],
  currentVelocity?: [number, number, number]
): Promise<Array<{
  date: string;
  x: number;
  y: number;
  z: number;
  distance_from_sun: number;
}>> {
  const projection: Array<{date: string; x: number; y: number; z: number; distance_from_sun: number;}> = [];

  // If we have JPL position/velocity data, use it to calculate projection
  if (currentPosition && currentVelocity) {
    logger.info({ projectionDays }, 'Using JPL Horizons data for projection calculation');
    return calculateAtlasProjectionFromStateVectors(projectionDays, startDate, currentPosition, currentVelocity);
  }

  // Perihelion date: 2025 Oct. 29.21095 TT from MPC MPEC 2025-N12
  const perihelionDate = new Date('2025-10-29T05:03:46.000Z');
  const currentDate = startDate;

  // Official orbital elements for 3I/ATLAS from Minor Planet Center MPEC 2025-N12
  const elements = {
    e: 6.2769203,     // Eccentricity (hyperbolic)
    q: 1.3745928,     // Perihelion distance (AU)
    i: 175.11669,     // Inclination (degrees) - retrograde, ~5° from ecliptic
    omega: 127.79317, // Argument of periapsis (degrees)
    node: 322.27219,  // Longitude of ascending node (degrees)
  };

  // Calculate projection using Kepler mechanics
  // Limit to reasonable solar system distances (100 AU max to show exit trajectory)
  const maxDistance = 100; // AU
  const sampleInterval = 2; // Sample every 2 days for smoother curve

  for (let i = 0; i <= projectionDays; i += sampleInterval) {
    const date = new Date(currentDate.getTime() + (i * 24 * 60 * 60 * 1000));

    // Days from perihelion (negative = before perihelion, positive = after)
    const daysFromPerihelion = (date.getTime() - perihelionDate.getTime()) / (1000 * 60 * 60 * 24);

    // Calculate position using orbital elements
    const pos = calculatePositionFromElements(daysFromPerihelion, elements);

    const distance_from_sun = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

    // Stop if we've exceeded max distance (comet leaving solar system)
    if (distance_from_sun > maxDistance) {
      logger.warn({ distance: distance_from_sun, maxDistance, daysCalculated: i }, 'Projection stopped - exceeded distance limit');
      break;
    }

    projection.push({
      date: date.toISOString(),
      x: pos.x,
      y: pos.y,
      z: pos.z,
      distance_from_sun
    });
  }

  logger.info({ pointCount: projection.length, projectionDays }, 'Calculated projection points using Kepler orbital mechanics');
  return projection;
}

/**
 * Fetch historical orbital trail using provided current position/velocity
 */
async function fetchOrbitalTrail(
  trailDays: number = 60,
  currentPosition?: [number, number, number],
  currentVelocity?: [number, number, number]
): Promise<Array<{
  date: string;
  x: number;
  y: number;
  z: number;
  distance_from_sun: number;
}>> {
  // If we have current position/velocity, use backward integration
  if (currentPosition && currentVelocity) {
    logger.info({ trailDays }, 'Using JPL Horizons data for trail calculation');
    return calculateAtlasTrailFromOrbit(trailDays, currentPosition, currentVelocity);
  }

  // Fallback: try to get JPL data
  logger.warn({ trailDays }, 'No current position provided for trail, using simplified trail');
  return generateSimplifiedTrail(trailDays);
}

/**
 * Generate simplified orbital trail for fallback
 */
function generateSimplifiedTrail(trailDays: number): Array<{
  date: string;
  x: number;
  y: number;
  z: number;
  distance_from_sun: number;
}> {
  const trail: Array<{date: string; x: number; y: number; z: number; distance_from_sun: number;}> = [];
  const endDate = new Date();

  // Simplified 3I/ATLAS trajectory approaching perihelion
  const perihelionDate = new Date('2025-10-30T00:00:00Z');
  const daysUntilPerihelion = (perihelionDate.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);

  for (let i = 0; i <= trailDays; i += 1) {
    const daysBack = trailDays - i;
    const date = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    const daysFromPerihelion = daysUntilPerihelion + daysBack;

    // Simplified hyperbolic orbit approaching perihelion
    const distance = Math.max(1.56, 1.56 + Math.abs(daysFromPerihelion) * 0.02);
    const angle = (daysFromPerihelion * 0.5) * (Math.PI / 180);

    const x = distance * Math.cos(angle + Math.PI) * 0.8;
    const y = distance * Math.sin(angle + Math.PI) * 0.6;
    const z = distance * 0.3; // Inclined orbit

    trail.push({
      date: date.toISOString(),
      x,
      y,
      z,
      distance_from_sun: distance
    });
  }

  return trail.reverse();
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Query parameters
  const trailDays = Math.min(Math.max(parseInt(searchParams.get('trail_days') || '60'), 30), 1000);
  const projectionDays = Math.min(Math.max(parseInt(searchParams.get('projection_days') || '720'), 30), 2000);
  const forceRefresh = searchParams.get('refresh') === 'true';

  const cacheKey = `solar_system_position_${trailDays}`;

  // Check cache unless forced refresh
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      logger.info({ cacheAgeMs: Date.now() - cached.timestamp }, 'Solar system position cache hit');

      return NextResponse.json({
        success: true,
        data: cached.data,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          cached: true,
          cacheAge: Date.now() - cached.timestamp
        }
      }, {
        headers: {
          // Tier 3: Orbital mechanics - 1 hour (positions change very slowly)
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'X-Data-Source': 'Solar-System-Position-Cached',
        }
      });
    }
  }

  try {
    logger.info({ trailDays, projectionDays, forceRefresh }, 'Fetching solar system position data');

    const currentDate = new Date();

    // Try multiple NASA APIs in sequence
    let cometPos: [number, number, number];
    let cometVel: [number, number, number];
    let cometDataSource = 'JPL_Horizons';

    // 1. Try JPL Horizons (most accurate)
    const jplData = await getJPLHorizonsOrbitalData();

    if (jplData) {
      cometPos = jplData.state_vectors.position;
      cometVel = jplData.state_vectors.velocity;
      logger.info({ hasPosition: !!cometPos, hasVelocity: !!cometVel }, 'Using JPL Horizons data');
    } else {
      // 2. Try NASA Small-Body Database as fallback
      logger.warn('JPL Horizons unavailable, trying NASA SBDB');
      const sbdbData = await getSBDBPosition(currentDate);

      if (sbdbData) {
        cometPos = sbdbData.position;
        // Estimate velocity (very rough approximation)
        cometVel = [-0.01, 0.02, -0.002];
        cometDataSource = 'NASA_SBDB';
        logger.info({ hasPosition: !!sbdbData.position }, 'Using NASA SBDB data (approximate positions)');
      } else {
        // 3. Final fallback: calculate from official MPC orbital elements
        logger.warn('All NASA APIs unavailable - calculating from MPC orbital elements');

        // Official MPC orbital elements (MPEC 2025-N12)
        const perihelionDate = new Date('2025-10-29T05:03:46.000Z'); // Corrected perihelion date
        const daysFromPerihelion = (currentDate.getTime() - perihelionDate.getTime()) / (1000 * 60 * 60 * 24);

        const elements = {
          e: 6.2769203,     // Eccentricity (official MPC)
          q: 1.3745928,     // Perihelion distance (AU) (official MPC)
          i: 175.11669,     // Inclination (degrees)
          omega: 127.79317, // Argument of periapsis (degrees)
          node: 322.27219,  // Longitude of ascending node (degrees)
        };

        // Calculate position using Kepler orbital mechanics
        const pos = calculatePositionFromElements(daysFromPerihelion, elements);
        cometPos = [pos.x, pos.y, pos.z];

        // Estimate velocity using finite difference (position at t+0.1 days)
        const posFuture = calculatePositionFromElements(daysFromPerihelion + 0.1, elements);
        const dt = 0.1; // days
        cometVel = [
          (posFuture.x - pos.x) / dt,
          (posFuture.y - pos.y) / dt,
          (posFuture.z - pos.z) / dt
        ];

        cometDataSource = 'MPC_orbital_elements';
        logger.info({
          x: pos.x,
          y: pos.y,
          z: pos.z
        }, 'Calculated position from MPC elements');
      }
    }

    // Calculate distances
    const distanceFromSun = Math.sqrt(cometPos[0]**2 + cometPos[1]**2 + cometPos[2]**2);

    // Get Earth's position from real JPL data if available
    // Use astronomy-engine for Earth position
    const earthPos = calculateEarthPosition(currentDate);
    const earthVel = calculateEarthVelocity(currentDate);
    const planetsSource = 'astronomy_engine';
    logger.info('Using astronomy-engine for Earth position');
    const distanceFromEarth = Math.sqrt(
      (cometPos[0] - earthPos.x)**2 +
      (cometPos[1] - earthPos.y)**2 +
      (cometPos[2] - earthPos.z)**2
    );

    // Calculate orbital trail and projection using same JPL current position/velocity
    const orbitalTrail = await fetchOrbitalTrail(trailDays, cometPos, cometVel);
    const orbitalProjection = await calculateAtlasProjection(720, currentDate, cometPos, cometVel);

    // Comet velocity magnitude
    const cometVelMagnitude = Math.sqrt(cometVel[0]**2 + cometVel[1]**2 + cometVel[2]**2);

    // Get planet positions using astronomy-engine
    const planetBodies = [
      { name: 'Mercury', body: Astronomy.Body.Mercury },
      { name: 'Venus', body: Astronomy.Body.Venus },
      { name: 'Earth', body: Astronomy.Body.Earth },
      { name: 'Mars', body: Astronomy.Body.Mars },
      { name: 'Jupiter', body: Astronomy.Body.Jupiter },
      { name: 'Saturn', body: Astronomy.Body.Saturn },
      { name: 'Uranus', body: Astronomy.Body.Uranus },
      { name: 'Neptune', body: Astronomy.Body.Neptune },
      { name: 'Pluto', body: Astronomy.Body.Pluto }
    ];

    const planetsFormatted = calculateAllPlanetPositions(currentDate).map(p => {
      const orbitData = PLANET_ORBITS.find(planet => planet.name === p.name);
      const planetBody = planetBodies.find(pb => pb.name === p.name);

      // Calculate orbital path for visualization (64 samples for performance)
      const orbitalPath = planetBody
        ? calculatePlanetOrbitalPath(planetBody.body, p.name, currentDate, 64)
        : undefined;

      return {
        ...p,
        orbital_elements: orbitData?.orbital_elements,
        orbital_path: orbitalPath
      };
    });

    const solarSystemData: SolarSystemPosition = {
      comet_position: {
        x: cometPos[0],
        y: cometPos[1],
        z: cometPos[2],
        distance_from_sun: distanceFromSun,
        distance_from_earth: distanceFromEarth
      },
      earth_position: earthPos,
      sun_position: {
        x: 0,
        y: 0,
        z: 0
      },
      planets: planetsFormatted,
      orbital_trail: orbitalTrail,
      orbital_projection: orbitalProjection,
      orbital_plane: {
        inclination: jplData?.orbital_elements.inclination || 109.0,
        ascending_node: 0, // Would need more orbital elements from JPL
        argument_of_periapsis: 0, // Would need more orbital elements from JPL
        eccentricity: jplData?.orbital_elements.eccentricity || 3.2
      },
      velocities: {
        comet_velocity: {
          x: cometVel[0],
          y: cometVel[1],
          z: cometVel[2],
          magnitude: cometVelMagnitude
        },
        earth_velocity: earthVel
      },
      metadata: {
        reference_frame: 'heliocentric_ecliptic',
        epoch: currentDate.toISOString(),
        data_source: cometDataSource,
        trail_period_days: trailDays,
        coordinate_system: 'ecliptic_j2000',
        planets_source: planetsSource
      }
    };

    // Cache the result (in-memory)
    cache.set(cacheKey, {
      data: solarSystemData,
      timestamp: Date.now(),
      ttl: CACHE_TTL.COBS_DATA
    });

    // Save to persistent cache for fallback on API failures
    saveSolarSystemCache(solarSystemData);

    const processingTime = Date.now() - startTime;

    logger.info({
      processingTimeMs: processingTime,
      trailPoints: orbitalTrail.length,
      projectionPoints: orbitalProjection.length,
      dataSource: cometDataSource
    }, 'Solar system position API completed');

    // Determine data quality and attribution based on source
    const isJPLHorizons = cometDataSource === 'JPL_Horizons';
    const isSBDB = cometDataSource === 'NASA_SBDB';
    const dataSourceName = isJPLHorizons ? 'JPL Horizons' : isSBDB ? 'NASA SBDB' : 'Calculated';
    const dataQuality = isJPLHorizons ? 'high' : isSBDB ? 'approximate' : 'estimated';

    return NextResponse.json({
      success: true,
      data: solarSystemData,
      metadata: {
        processingTimeMs: processingTime,
        trailPoints: orbitalTrail.length,
        dataSource: cometDataSource,
        dataSourceName: dataSourceName,
        dataQuality: {
          comet_data_source: cometDataSource,
          data_quality: dataQuality,
          jpl_horizons_available: isJPLHorizons,
          sbdb_available: isSBDB,
          earth_position_calculated: true,
          orbital_trail_generated: true
        },
        distances: {
          comet_from_sun_au: distanceFromSun,
          comet_from_earth_au: distanceFromEarth,
          comet_from_sun_km: distanceFromSun * 149597870.7,
          comet_from_earth_km: distanceFromEarth * 149597870.7
        },
        velocities: {
          comet_velocity_au_per_day: cometVelMagnitude,
          comet_velocity_km_per_s: cometVelMagnitude * 149597870.7 / 86400,
          earth_velocity_km_per_s: earthVel.magnitude * 149597870.7 / 86400
        }
      },
      attribution: {
        comet_data: dataSourceName,
        orbital_mechanics: isJPLHorizons ? 'NASA/JPL Horizons System' : isSBDB ? 'NASA Small-Body Database' : 'Simplified orbital calculation',
        earth_position: 'Calculated using astronomy-engine',
        coordinate_system: 'Heliocentric Ecliptic J2000.0'
      }
    }, {
      headers: {
        // Orbital positions change slowly - cache for 30 min in browser, 1 hour on CDN
        'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=7200',
        'X-Processing-Time': processingTime.toString(),
        'X-Data-Source': cometDataSource,
        'X-Trail-Points': orbitalTrail.length.toString()
      }
    });

  } catch (_error) {
    const processingTime = Date.now() - startTime;
    logger.error({
      error: _error instanceof Error ? _error.message : 'Unknown error',
      stack: _error instanceof Error ? _error.stack : undefined,
      processingTimeMs: Date.now() - startTime
    }, 'Error in solar system position API');

    const errorMessage = _error instanceof Error ? _error.message : 'Unknown error';

    // Try to load from persistent cache as fallback
    const cachedData = loadSolarSystemCache();
    if (cachedData) {
      const cacheAgeMinutes = (Date.now() - cachedData.timestamp) / (1000 * 60);
      const cacheAgeDays = cacheAgeMinutes / (60 * 24);

      logger.warn({
        cacheCreatedAt: cachedData.createdAt,
        cacheAgeMinutes: cacheAgeMinutes
      }, 'Using stale cached data as fallback');

      return NextResponse.json({
        success: true,
        data: cachedData.data,
        metadata: {
          processingTimeMs: processingTime,
          cached: true,
          cacheAge: Date.now() - cachedData.timestamp,
          cacheAgeMinutes: Math.round(cacheAgeMinutes),
          cacheAgeDays: cacheAgeDays.toFixed(2),
          dataTimestamp: cachedData.createdAt,
          warning: 'Using cached data - live API unavailable'
        },
        warning: {
          message: 'Using cached position data',
          reason: errorMessage,
          dataAge: `${Math.round(cacheAgeMinutes)} minutes old`,
          cachedAt: cachedData.createdAt
        }
      }, {
        status: 200,  // Return 200 since we have data
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Processing-Time': processingTime.toString(),
          'X-Data-Source': 'Persistent-Cache-Fallback',
          'X-Cache-Age-Minutes': Math.round(cacheAgeMinutes).toString()
        }
      });
    }

    // No cached data available - return error
    return NextResponse.json({
      success: false,
      error: 'Solar system position data unavailable',
      message: errorMessage,
      detail: 'Unable to fetch 3D position data for solar system visualization',
      fallback_available: false,
      processingTimeMs: processingTime
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Processing-Time': processingTime.toString()
      }
    });
  }
}