import { NextRequest, NextResponse } from 'next/server';
import { getJPLHorizonsOrbitalData } from '@/lib/data-sources/jpl-horizons';
import * as Astronomy from 'astronomy-engine';
import { saveSolarSystemCache, loadSolarSystemCache } from '@/lib/cache/persistent-cache';
import { getSBDBPosition } from '@/lib/data-sources/nasa-sbdb';
import { CACHE_TTL } from '@/constants/cache';
import {
  calculatePositionFromElements,
  calculateAtlasProjectionFromStateVectors,
  calculateAtlasTrailFromOrbit
} from '@/lib/orbital-calculations';
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
    console.log('Using JPL Horizons data for projection calculation');
    return calculateAtlasProjectionFromStateVectors(projectionDays, startDate, currentPosition, currentVelocity);
  }

  // Perihelion date: October 29, 2025 12:00 UT (JD 2460613.5)
  const perihelionDate = new Date('2025-10-29T12:00:00Z');
  const currentDate = startDate;

  // Official orbital elements for 3I/ATLAS (from MPC, epoch 2025-May-05)
  const elements = {
    e: 6.2769,     // Hyperbolic eccentricity (MPC: 6.2769203)
    q: 1.3746,     // Perihelion distance (AU) (MPC: 1.3745928)
    i: 175.117,    // Inclination (degrees) (MPC: 175.11669°)
    omega: 127.79, // Argument of periapsis (degrees) (MPC: 127.79317°)
    node: 322.27,  // Longitude of ascending node (degrees) (MPC: 322.27219°)
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
      console.log(`⚠ Projection stopped at ${distance_from_sun.toFixed(1)} AU (exceeded ${maxDistance} AU limit after ${i} days)`);
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

  console.log(`✓ Calculated ${projection.length} projection points using Kepler orbital mechanics (${projectionDays} days)`);
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
    console.log('Using JPL Horizons data for trail calculation (backward integration from current state)');
    return calculateAtlasTrailFromOrbit(trailDays, currentPosition, currentVelocity);
  }

  // Fallback: try to get JPL data
  console.warn('No current position provided for trail, using simplified trail');
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
  const forceRefresh = searchParams.get('refresh') === 'true';

  const cacheKey = `solar_system_position_${trailDays}`;

  // Check cache unless forced refresh
  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('Solar system position cache hit');

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
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800', // 15min cache
          'X-Data-Source': 'Solar-System-Position-Cached',
        }
      });
    }
  }

  try {
    console.log(`Fetching solar system position data with ${trailDays} day trail...`);

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
      console.log('✓ Using JPL Horizons data');
    } else {
      // 2. Try NASA Small-Body Database as fallback
      console.warn('JPL Horizons unavailable, trying NASA SBDB...');
      const sbdbData = await getSBDBPosition(currentDate);

      if (sbdbData) {
        cometPos = sbdbData.position;
        // Estimate velocity (very rough approximation)
        cometVel = [-0.01, 0.02, -0.002];
        cometDataSource = 'NASA_SBDB';
        console.log('✓ Using NASA SBDB data (approximate positions)');
      } else {
        // 3. Final fallback: use simplified calculation
        console.warn('All NASA APIs unavailable - using simplified calculation');
        const perihelionDate = new Date('2025-10-30T00:00:00Z');
        const daysUntilPerihelion = (perihelionDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
        const distance = Math.max(1.56, 3.0 - (90 - daysUntilPerihelion) * 0.016);
        const angle = (daysUntilPerihelion * 2.0) * (Math.PI / 180);

        cometPos = [
          distance * Math.cos(angle) * 0.8,
          distance * Math.sin(angle) * 0.6,
          distance * 0.3
        ];
        cometVel = [
          -0.015 * Math.sin(angle),
          0.018 * Math.cos(angle),
          0.008
        ];
        cometDataSource = 'calculated';
      }
    }

    // Calculate distances
    const distanceFromSun = Math.sqrt(cometPos[0]**2 + cometPos[1]**2 + cometPos[2]**2);

    // Get Earth's position from real JPL data if available
    // Use astronomy-engine for Earth position
    const earthPos = calculateEarthPosition(currentDate);
    const earthVel = calculateEarthVelocity(currentDate);
    const planetsSource = 'astronomy_engine';
    console.log('Using astronomy-engine for Earth position');
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

    console.log(`Solar system position API completed in ${processingTime}ms`);

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
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Processing-Time': processingTime.toString(),
        'X-Data-Source': cometDataSource,
        'X-Trail-Points': orbitalTrail.length.toString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error in solar system position API:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Try to load from persistent cache as fallback
    const cachedData = loadSolarSystemCache();
    if (cachedData) {
      const cacheAgeMinutes = (Date.now() - cachedData.timestamp) / (1000 * 60);
      const cacheAgeDays = cacheAgeMinutes / (60 * 24);

      console.log(`⚠️  Using cached data from ${cachedData.createdAt} (${cacheAgeMinutes.toFixed(1)} minutes old)`);

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