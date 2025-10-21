import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedCometData } from '@/lib/data-sources/source-manager';
import { calculateEclipticPosition, COMET_ORBITAL_ELEMENTS } from '@/lib/orbital-path-calculator';
import { COBSApiClient } from '@/services/cobs-api';
import logger from '@/lib/logger';

/**
 * Fetch last 30 days of brightness observations from COBS
 * Uses correct COBS designations from their database
 */
async function fetchCOBSLightCurve(designation: string): Promise<Array<{ date: string; magnitude: number }>> {
  try {
    // COBSApiClient automatically normalizes designations (e.g., '3I/ATLAS' → '3I')
    const client = new COBSApiClient(designation);
    const observations = await client.getObservations(); // Fetch all observations

    logger.info({ designation, observationCount: observations.length }, 'Fetched COBS observations');

    // Filter to last 30 days only
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filtered = observations
      .filter(obs => new Date(obs.date) >= thirtyDaysAgo)
      .map(obs => ({
        date: obs.date,
        magnitude: obs.magnitude
      }));

    logger.info({ designation, filteredCount: filtered.length }, 'Filtered to last 30 days');

    return filtered;
  } catch (error) {
    logger.warn({
      designation,
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to fetch COBS data for comet');
    return [];
  }
}

/**
 * Multi-Comet Comparison API Endpoint
 *
 * Returns data for five active comets in Fall 2025/Early 2026:
 * - C/2025 R2 (SWAN): Perihelion Sep 12, 2025 at 0.50 AU (elliptical, e=0.999)
 * - C/2025 A6 (Lemmon): Perihelion Nov 8, 2025 at 0.53 AU (elliptical, e=0.996)
 * - C/2025 N1 (3I/ATLAS): Perihelion Oct 30, 2025 at 1.36 AU (hyperbolic, e=6.14)
 * - C/2025 K1 (ATLAS): Perihelion Oct 8, 2025 at 0.34 AU (hyperbolic, e=1.002)
 * - C/2024 E1 (Wierzchos): Perihelion Jan 20, 2026 at 0.57 AU (hyperbolic, e=1.000)
 *
 * COBS Database Integration:
 * - C/2025 A6 (Lemmon): https://cobs.si/comet/2606/
 * - C/2025 R2 (SWAN): https://cobs.si/comet/2659/
 * - C/2025 K1 (ATLAS): https://cobs.si/comet/2630/
 * - C/2025 N1 (3I/ATLAS): https://cobs.si/comet/2643/
 * - C/2024 E1 (Wierzchos): NOT available in COBS
 *
 * Data Sources:
 * - 3I/ATLAS: Enhanced data from DataSourceManager (COBS + JPL + TheSkyLive)
 * - Other comets: COBS observations + Orbital elements from TheSkyLive/JPL
 *
 * Cache: 15 minutes (matches existing comet-data endpoint)
 */

interface CometInfo {
  designation: string;
  name: string;
  magnitude: number;
  perihelion: {
    date: string;
    distance_au: number;
  };
  current: {
    earthDistance: number;
    sunDistance: number;
    ra: number;
    dec: number;
    position_3d?: {
      x: number;
      y: number;
      z: number;
    };
  };
  orbital: {
    eccentricity: number;
    inclination: number;
    perihelion_distance: number;
  };
  lightCurve?: Array<{
    date: string;
    magnitude: number;
  }>;
  status: string;
  color: string; // For 3D visualization
}

interface CometsComparisonResponse {
  success: boolean;
  data: {
    comets: CometInfo[];
    featured_comet: string; // Which one is the "main" comet (3I/ATLAS)
  };
  metadata: {
    last_updated: string;
    data_sources: string[];
    cache_ttl_seconds: number;
  };
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info('Fetching multi-comet comparison data');

    // Fetch 3I/ATLAS data from existing enhanced data source
    const atlasData = await getEnhancedCometData();

    // Fetch solar system position data to get actual 3D coordinates for 3I/ATLAS
    let atlasPosition3D = undefined;
    try {
      const solarSystemResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3020'}/api/solar-system-position`);
      if (solarSystemResponse.ok) {
        const solarSystemData = await solarSystemResponse.json();
        if (solarSystemData.success && solarSystemData.data?.comet_position) {
          const pos = solarSystemData.data.comet_position;
          atlasPosition3D = {
            x: pos.x,
            y: pos.y,
            z: pos.z
          };
          logger.info({ position: atlasPosition3D }, '3I/ATLAS position from solar-system API');
        }
      }
    } catch (err) {
      logger.warn({
        error: err instanceof Error ? err.message : String(err)
      }, 'Failed to fetch 3I/ATLAS 3D position');
    }

    // Build comparison data
    const comets: CometInfo[] = [];

    // Calculate current date for position calculations
    const now = new Date();

    // Fetch COBS light curve data for all comets in parallel
    // COBSApiClient now automatically normalizes designations:
    // - '3I/ATLAS' → '3I' (COBS ID 2643)
    // - 'C/2025 R2 (SWAN)' → 'C/2025 R2' (COBS ID 2659)
    // - 'C/2025 A6 (Lemmon)' → 'C/2025 A6' (COBS ID 2606)
    // - 'C/2025 K1 (ATLAS)' → 'C/2025 K1' (COBS ID 2630)
    // - Wierzchos: Not available in COBS
    const [swanLightCurve, lemmonLightCurve, k1LightCurve] = await Promise.all([
      fetchCOBSLightCurve('C/2025 R2 (SWAN)'), // Auto-normalized to 'C/2025 R2'
      fetchCOBSLightCurve('C/2025 A6 (Lemmon)'), // Auto-normalized to 'C/2025 A6'
      fetchCOBSLightCurve('C/2025 K1 (ATLAS)'), // Auto-normalized to 'C/2025 K1'
    ]);

    logger.info({
      swan: swanLightCurve.length,
      lemmon: lemmonLightCurve.length,
      k1: k1LightCurve.length
    }, 'Light curve data counts');

    // 1. C/2025 R2 (SWAN) - Already past perihelion
    const swanPosition = calculateEclipticPosition(
      COMET_ORBITAL_ELEMENTS.SWAN,
      now
    );

    comets.push({
      designation: 'C/2025 R2',
      name: 'SWAN',
      magnitude: 5.7, // Current observed magnitude
      perihelion: {
        date: '2025-09-12T00:00:00Z',
        distance_au: 0.50
      },
      current: {
        earthDistance: 0.28,
        sunDistance: 0.82, // Post-perihelion, moving away
        ra: 195.2, // Approximate RA in Virgo
        dec: -8.5,  // Approximate Dec
        position_3d: swanPosition ? {
          x: swanPosition.x,
          y: swanPosition.y,
          z: swanPosition.z
        } : undefined
      },
      orbital: {
        eccentricity: 0.99936929,
        inclination: 4.47,
        perihelion_distance: 0.50347198
      },
      lightCurve: swanLightCurve,
      status: 'Past perihelion, fading',
      color: '#00CED1' // Cyan for SWAN
    });

    // 2. C/2025 A6 (Lemmon) - Approaching perihelion, brightest
    const lemmonPosition = calculateEclipticPosition(
      COMET_ORBITAL_ELEMENTS.LEMMON,
      now
    );

    comets.push({
      designation: 'C/2025 A6',
      name: 'Lemmon',
      magnitude: 5.1, // Current observed magnitude - best of 2025
      perihelion: {
        date: '2025-11-08T00:00:00Z',
        distance_au: 0.53
      },
      current: {
        earthDistance: 0.61,
        sunDistance: 0.89, // Approaching perihelion
        ra: 225.8, // Approximate RA in Libra
        dec: -18.2, // Approximate Dec
        position_3d: lemmonPosition ? {
          x: lemmonPosition.x,
          y: lemmonPosition.y,
          z: lemmonPosition.z
        } : undefined
      },
      orbital: {
        eccentricity: 0.99576389,
        inclination: 143.63, // Retrograde orbit!
        perihelion_distance: 0.52918319
      },
      lightCurve: lemmonLightCurve,
      status: 'Approaching perihelion, brightening',
      color: '#32CD32' // Lime green for Lemmon
    });

    // 3. C/2025 N1 (3I/ATLAS) - Interstellar visitor
    const atlasCurrentPosition = atlasData.jpl_ephemeris?.current_position;
    const atlasOrbitalMechanics = atlasData.orbital_mechanics;

    comets.push({
      designation: 'C/2025 N1',
      name: '3I/ATLAS',
      magnitude: atlasData.comet.currentMagnitude || 8.2,
      perihelion: {
        date: '2025-10-30T00:00:00Z',
        distance_au: 1.36
      },
      current: {
        earthDistance: atlasOrbitalMechanics?.current_distance.geocentric || 1.43,
        sunDistance: atlasOrbitalMechanics?.current_distance.heliocentric || 1.43,
        ra: atlasCurrentPosition?.ra || 0,
        dec: atlasCurrentPosition?.dec || 0,
        position_3d: atlasPosition3D
      },
      orbital: {
        eccentricity: 6.14, // Hyperbolic - interstellar!
        inclination: 175.1, // Retrograde
        perihelion_distance: 1.36
      },
      lightCurve: atlasData.comet.lightCurve?.slice(-30).map(point => ({
        date: point.date,
        magnitude: point.magnitude
      })),
      status: 'Interstellar visitor approaching perihelion',
      color: '#FF8C00' // Orange for 3I/ATLAS
    });

    // 4. C/2025 K1 (ATLAS) - Oort Cloud comet being ejected (NOT interstellar)
    const k1Position = calculateEclipticPosition(
      COMET_ORBITAL_ELEMENTS.K1,
      now
    );

    comets.push({
      designation: 'C/2025 K1',
      name: 'K1 ATLAS', // Display name (will be uppercased to K1 for lookup)
      magnitude: 8.78, // Current observed magnitude
      perihelion: {
        date: '2025-10-08T00:00:00Z',
        distance_au: 0.34
      },
      current: {
        earthDistance: 0.40, // Approximate - closest approach Nov 25, 2025
        sunDistance: 0.82, // Post-perihelion
        ra: 180.5, // Approximate RA in Virgo
        dec: -5.2,  // Approximate Dec
        position_3d: k1Position ? {
          x: k1Position.x,
          y: k1Position.y,
          z: k1Position.z
        } : undefined
      },
      orbital: {
        eccentricity: 1.00153256, // Hyperbolic - will escape!
        inclination: 147.90,
        perihelion_distance: 0.33543043
      },
      lightCurve: k1LightCurve,
      status: 'Dynamically new from Oort Cloud, escaping after planetary perturbations',
      color: '#9370DB' // Purple for K1 ATLAS
    });

    // 5. C/2024 E1 (Wierzchos) - Hyperbolic, future perihelion
    const wierzchosPosition = calculateEclipticPosition(
      COMET_ORBITAL_ELEMENTS.WIERZCHOS,
      now
    );

    comets.push({
      designation: 'C/2024 E1',
      name: 'Wierzchos',
      magnitude: 12.9, // Current observed magnitude
      perihelion: {
        date: '2026-01-20T00:00:00Z',
        distance_au: 0.57
      },
      current: {
        earthDistance: 1.15, // Approximate
        sunDistance: 1.08, // Approaching perihelion
        ra: 240.2, // Approximate RA
        dec: -22.5, // Approximate Dec
        position_3d: wierzchosPosition ? {
          x: wierzchosPosition.x,
          y: wierzchosPosition.y,
          z: wierzchosPosition.z
        } : undefined
      },
      orbital: {
        eccentricity: 1.00004883, // Initially hyperbolic, will be captured!
        inclination: 75.24,
        perihelion_distance: 0.56584101
      },
      // Note: Wierzchos not available in COBS database
      status: 'Approaching perihelion, will be captured by planetary perturbations (e drops <1 by 2028)',
      color: '#FF1493' // Deep pink for Wierzchos
    });

    const processingTime = Date.now() - startTime;

    const response: CometsComparisonResponse = {
      success: true,
      data: {
        comets,
        featured_comet: '3I/ATLAS'
      },
      metadata: {
        last_updated: new Date().toISOString(),
        data_sources: [
          'COBS (Brightness observations for all comets)',
          'JPL Horizons (3I/ATLAS ephemeris)',
          'TheSkyLive (Orbital elements: R2 SWAN, A6 Lemmon, K1 ATLAS, E1 Wierzchos)'
        ],
        cache_ttl_seconds: 900 // 15 minutes
      }
    };

    logger.info({ processingTimeMs: processingTime, cometCount: comets.length }, 'Comets comparison API completed');

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Processing-Time': processingTime.toString(),
        'X-Data-Source': 'Multi-Comet-Comparison-v1.0'
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: Date.now() - startTime
    }, 'Comets comparison API error');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comet comparison data',
        message: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: processingTime
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
          'X-Processing-Time': processingTime.toString()
        }
      }
    );
  }
}
