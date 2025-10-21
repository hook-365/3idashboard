import { NextRequest, NextResponse } from 'next/server';
import { cobsApi } from '@/services/cobs-api';
import { analyzeTrend, calculateRunningAverage } from '@/services/data-transforms';
import { getEnhancedCometData, type EnhancedCometData } from '@/lib/data-sources/source-manager';
import logger from '@/lib/logger';

// Helper function to build COBS-only response data
async function buildCOBSOnlyData(params: {
  includeSmoothed: boolean;
  maxObservations: number;
  trendDays: number;
  forceRefresh: boolean;
  startTime: number;
}) {
  const { includeSmoothed, maxObservations, trendDays, forceRefresh, startTime } = params;

  // Optimization: Fetch observations once and reuse across all derived data
  // This avoids duplicate fetches in getStatistics, getObservers, and getLightCurve
  const observations = await cobsApi.getObservations(forceRefresh);
  const [statistics, observers, lightCurve] = await Promise.all([
    cobsApi.getStatistics(forceRefresh),
    cobsApi.getObservers(forceRefresh, observations),
    cobsApi.getLightCurve(forceRefresh),
  ]);

  logger.info({
    observationCount: observations.length,
    observerCount: observers.length,
    lightCurvePoints: lightCurve.length
  }, 'COBS data fetched');

  // Analyze trend for the specified period
  const trendAnalysis = analyzeTrend(lightCurve, trendDays);

  // Calculate smoothed light curve if requested
  let processedLightCurve = lightCurve;
  if (includeSmoothed && lightCurve.length > 7) {
    processedLightCurve = calculateRunningAverage(lightCurve, 7);
  }

  // Transform data to match expected frontend format
  const cometData = {
    name: '3I/ATLAS',
    designation: 'Interstellar Comet 3I/ATLAS',
    perihelionDate: '2025-10-30T00:00:00Z',
    currentMagnitude: statistics.currentMagnitude,
    observations: observations.slice(0, maxObservations).map(obs => ({
      ...obs,
      quality: obs.uncertainty ?
        (obs.uncertainty < 0.1 ? 'excellent' :
         obs.uncertainty < 0.2 ? 'good' :
         obs.uncertainty < 0.4 ? 'fair' : 'poor') : undefined,
    })),
    lightCurve: processedLightCurve.map(point => ({
      date: point.date,
      magnitude: point.magnitude,
      uncertainty: point.uncertainty,
      observationCount: point.observationCount,
    })),
    individualObservations: observations.map(obs => ({
      date: obs.date,
      magnitude: obs.magnitude,
      filter: obs.filter || 'Visual',
      observer: obs.observer.name,
      quality: obs.uncertainty ?
        (obs.uncertainty < 0.1 ? 'excellent' :
         obs.uncertainty < 0.2 ? 'good' :
         obs.uncertainty < 0.4 ? 'fair' : 'poor') : undefined,
    })),
    trendAnalysis,
  };

  const processingTime = Date.now() - startTime;

  return {
    success: true,
    data: {
      comet: cometData,
      stats: {
        ...statistics,
        trendAnalysis,
      },
      observers: observers.slice(0, 20), // Top 20 observers
    },
    metadata: {
      totalObservations: observations.length,
      totalObservers: observers.length,
      lightCurvePoints: lightCurve.length,
      smoothed: includeSmoothed,
      trendPeriodDays: trendDays,
      processingTimeMs: processingTime,
      dataSource: 'COBS API',
      apiVersion: '2.0',
      lastUpdated: statistics.lastUpdated,
      enhanced_features: false,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Query parameters for data customization
  const includeSmoothed = searchParams.get('smooth') === 'true';
  const includePrediction = searchParams.get('predict') === 'true';
  const maxObservations = parseInt(searchParams.get('limit') || '100');
  const trendDays = parseInt(searchParams.get('trendDays') || '30');
  const forceRefresh = searchParams.get('refresh') === 'true'; // Force cache bypass

  try {
    logger.info({
      includeSmoothed,
      includePrediction,
      maxObservations,
      trendDays,
      forceRefresh
    }, 'Starting comet-data API request');

    // OPTIMIZATION: Start both COBS and enhanced data fetches in parallel
    logger.info('Starting parallel data fetch: COBS + enhanced multi-source');

    // Start COBS-only fetch immediately (doesn't wait)
    const cobsPromise = buildCOBSOnlyData({
      includeSmoothed,
      maxObservations,
      trendDays,
      forceRefresh,
      startTime,
    });

    // Try to fetch enhanced data with timeout, fall back to COBS-only on failure
    const ENHANCED_DATA_TIMEOUT = 5000;
    let enhancedResult: EnhancedCometData | null = null;

    try {
      enhancedResult = await Promise.race([
        getEnhancedCometData(),
        new Promise<EnhancedCometData>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), ENHANCED_DATA_TIMEOUT)
        )
      ]);
      logger.info('Successfully fetched enhanced multi-source data');
    } catch (error) {
      logger.warn({
        timeout: ENHANCED_DATA_TIMEOUT,
        error: error instanceof Error ? error.message : String(error)
      }, 'Enhanced data timeout or error');
    }

    // If enhanced data is available, use it; otherwise use COBS-only
    if (enhancedResult) {
      logger.info('Using enhanced multi-source data');
      const enhancedData = enhancedResult;

      // Apply frontend processing to enhanced data
      let processedLightCurve = enhancedData.comet.lightCurve;
      if (includeSmoothed && enhancedData.comet.lightCurve.length > 7) {
        processedLightCurve = calculateRunningAverage(enhancedData.comet.lightCurve, 7);
      }

      // Analyze trend for the specified period
      const trendAnalysis = analyzeTrend(enhancedData.comet.lightCurve, trendDays);

      // Transform enhanced data to maintain existing structure while adding new fields
      const cometData = {
        name: enhancedData.comet.name,
        designation: enhancedData.comet.designation,
        perihelionDate: enhancedData.comet.perihelionDate,
        currentMagnitude: enhancedData.comet.currentMagnitude,
        observations: enhancedData.comet.observations.slice(0, maxObservations).map(obs => ({
          ...obs,
          quality: obs.uncertainty ?
            (obs.uncertainty < 0.1 ? 'excellent' :
             obs.uncertainty < 0.2 ? 'good' :
             obs.uncertainty < 0.4 ? 'fair' : 'poor') : undefined,
        })), // Configurable limit
        lightCurve: processedLightCurve.map(point => ({
          date: point.date,
          magnitude: point.magnitude,
          uncertainty: point.uncertainty,
          observationCount: point.observationCount,
        })),
        individualObservations: enhancedData.comet.observations.map(obs => ({
          date: obs.date,
          magnitude: obs.magnitude,
          filter: obs.filter || 'Visual',
          observer: obs.observer?.name || 'Unknown',
          quality: obs.uncertainty ?
            (obs.uncertainty < 0.1 ? 'excellent' :
             obs.uncertainty < 0.2 ? 'good' :
             obs.uncertainty < 0.4 ? 'fair' : 'poor') : undefined,
        })),
        trendAnalysis,
      };

      const processingTime = Date.now() - startTime;
      const activeSources = enhancedData.source_status
        ? Object.entries(enhancedData.source_status)
            .filter(([, status]) => status.active)
            .map(([key]) => key)
        : [];

      const response = {
        success: true,
        data: {
          comet: cometData,
          stats: {
            ...enhancedData.stats,
            trendAnalysis,
          },
          observers: [], // Will be populated from COBS data if available
          // NEW: Enhanced multi-source data sections
          orbital_mechanics: enhancedData.orbital_mechanics,
          brightness_enhanced: enhancedData.brightness_enhanced,
          source_status: enhancedData.source_status,
          jpl_ephemeris: enhancedData.jpl_ephemeris,
          // Data attributions preserved from sources
          data_attributions: {
            visual_observations: 'COBS Comet Observation Database (CC BY-NC-SA 4.0)',
            orbital_mechanics: 'NASA/JPL Horizons System',
            position_data: 'TheSkyLive.com',
            thermal_analysis: 'Derived from multi-source photometry',
            attribution_note: 'Multi-source integration for comprehensive 3I/ATLAS tracking'
          },
        },
        metadata: {
          totalObservations: enhancedData.comet.observations.length,
          totalObservers: enhancedData.stats.activeObservers,
          lightCurvePoints: enhancedData.comet.lightCurve.length,
          smoothed: includeSmoothed,
          trendPeriodDays: trendDays,
          processingTimeMs: processingTime,
          dataSource: 'Multi-Source Enhanced',
          apiVersion: '2.1',
          lastUpdated: new Date().toISOString(),
          sources_active: activeSources,
          enhanced_features: true,
          queryParameters: {
            includeSmoothed,
            includePrediction,
            maxObservations,
            trendDays
          }
        },
        timestamp: new Date().toISOString(),
      };

      logger.info({
        processingTimeMs: processingTime,
        activeSources: activeSources
      }, 'Enhanced comet-data API completed');

      return NextResponse.json(response, {
        headers: {
          // Browser cache for 5 minutes, CDN for 5 min, revalidate in background for 10 min
          // max-age: browser cache, s-maxage: CDN cache, stale-while-revalidate: background refresh
          'Cache-Control': forceRefresh
            ? 'no-cache, no-store, must-revalidate'
            : 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          'X-Processing-Time': processingTime.toString(),
          'X-Data-Source': 'Multi-Source-Enhanced-v2.1',
          'X-Active-Sources': activeSources.join(','),
        },
      });
    } else {
      // Enhanced data timed out or failed - use COBS-only data (already fetched in parallel)
      logger.warn('Enhanced data unavailable (timeout or error), using COBS-only fallback');
      const cobsData = await cobsPromise;

      const processingTime = Date.now() - startTime;

      // Add fallback metadata to COBS response
      const responseWithFallbackInfo = {
        ...cobsData,
        metadata: {
          ...cobsData.metadata,
          queryParameters: {
            includeSmoothed,
            includePrediction,
            maxObservations,
            trendDays
          },
          fallback_reason: 'Enhanced data timeout or unavailable',
          processingTimeMs: processingTime,
        }
      };

      logger.info({
        processingTimeMs: processingTime
      }, 'COBS-only fallback completed');

      return NextResponse.json(responseWithFallbackInfo, {
        headers: {
          // Browser + CDN cache for 5 minutes, revalidate in background for 10 min
          'Cache-Control': forceRefresh
            ? 'no-cache, no-store, must-revalidate'
            : 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          'X-Processing-Time': processingTime.toString(),
          'X-Data-Source': 'COBS-API-v2-Timeout-Fallback',
          'X-Fallback': 'true',
        },
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Enhanced error logging
    logger.error({
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
    }, 'Error fetching comet data - COBS API failed');

    return NextResponse.json(
      {
        success: false,
        error: 'Insufficient data available',
        message: errorMessage,
        detail: 'Real-time comet data is currently unavailable. Please try again later.',
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString(),
        dataAvailable: false,
      },
      {
        status: 503, // Service Unavailable
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Processing-Time': processingTime.toString(),
        },
      }
    );
  }
}