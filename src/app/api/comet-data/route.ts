import { NextRequest, NextResponse } from 'next/server';
import { cobsApi } from '@/services/cobs-api';
import { analyzeTrend, calculateRunningAverage } from '@/services/data-transforms';
import { getEnhancedCometData } from '@/lib/data-sources/source-manager';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Query parameters for data customization
  const includeSmoothed = searchParams.get('smooth') === 'true';
  const includePrediction = searchParams.get('predict') === 'true';
  const maxObservations = parseInt(searchParams.get('limit') || '100');
  const trendDays = parseInt(searchParams.get('trendDays') || '30');

  try {
    console.log('Starting comet-data API request with params:', {
      includeSmoothed,
      includePrediction,
      maxObservations,
      trendDays
    });

    // Try enhanced multi-source data first
    try {
      console.log('Attempting enhanced multi-source data fetch...');
      const enhancedData = await getEnhancedCometData();

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
      const activeSources = Object.entries(enhancedData.source_status)
        .filter(([, status]) => status.active)
        .map(([key]) => key);

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

      console.log(`Enhanced comet-data API completed in ${processingTime}ms with sources: ${activeSources.join(', ')}`);

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Processing-Time': processingTime.toString(),
          'X-Data-Source': 'Multi-Source-Enhanced-v2.1',
          'X-Active-Sources': activeSources.join(','),
        },
      });

    } catch (enhancedError) {
      // Fallback to existing COBS-only implementation
      console.warn('Enhanced data failed, falling back to COBS-only:', enhancedError);

      // Fetch all data in parallel for better performance (existing implementation)
      const [observations, statistics, observers, lightCurve] = await Promise.all([
        cobsApi.getObservations(),
        cobsApi.getStatistics(),
        cobsApi.getObservers(),
        cobsApi.getLightCurve(),
      ]);

      console.log(`COBS fallback data fetched: ${observations.length} observations, ${observers.length} observers, ${lightCurve.length} light curve points`);

      // Analyze trend for the specified period
      const trendAnalysis = analyzeTrend(lightCurve, trendDays);

      // Calculate smoothed light curve if requested
      let processedLightCurve = lightCurve;
      if (includeSmoothed && lightCurve.length > 7) {
        processedLightCurve = calculateRunningAverage(lightCurve, 7);
      }

      // Transform data to match expected frontend format (existing logic)
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
        })), // Configurable limit
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

      const response = {
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
          dataSource: 'COBS API (Fallback)',
          apiVersion: '2.0',
          lastUpdated: statistics.lastUpdated,
          enhanced_features: false,
          fallback_reason: enhancedError instanceof Error ? enhancedError.message : 'Enhanced data unavailable',
          queryParameters: {
            includeSmoothed,
            includePrediction,
            maxObservations,
            trendDays
          }
        },
        timestamp: new Date().toISOString(),
      };

      console.log(`COBS-only fallback completed in ${processingTime}ms`);

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Processing-Time': processingTime.toString(),
          'X-Data-Source': 'COBS-API-v2-Fallback',
          'X-Fallback': 'true',
        },
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Error fetching comet data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Enhanced error logging
    console.error('Full error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      timestamp: new Date().toISOString(),
    });

    // Return error response when real data isn't available
    console.error('COBS API failed and no mock data fallback will be used');
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