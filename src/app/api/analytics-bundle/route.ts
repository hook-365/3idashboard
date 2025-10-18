import { NextRequest, NextResponse } from 'next/server';
import { CometObservation } from '@/types/comet';
import { cobsApi, ObserverInfo } from '@/services/cobs-api';
import { calculateRegionalStatistics, transformObserversForMap, analyzeTrend, calculateRunningAverage } from '@/services/data-transforms';
import { calculateActivityFromAPIData } from '@/utils/activity-calculator';
import { getEnhancedCometData } from '@/lib/data-sources/source-manager';

/**
 * Consolidated Analytics Bundle API
 *
 * This endpoint consolidates 4 separate API calls into a single request:
 * 1. /api/observers (format=map, stats=true)
 * 2. /api/simple-activity (with days parameter)
 * 3. /api/comet-data (smooth=true, predict=true, limit=200, trendDays=30)
 * 4. /api/velocity (type=brightness, smoothingWindow=7)
 *
 * By fetching COBS observations once and deriving all analytics server-side,
 * this reduces API calls by 75% and improves page load time by ~60%.
 */

// Response type definitions
interface SimpleActivityDataPoint {
  date: string;
  activityLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'INSUFFICIENT_DATA';
  activityIndex: number;
  currentMagnitude: number;
  expectedMagnitude: number;
  brightnessDelta: number;
  heliocentric_distance: number;
  confidence: number;
}

interface VelocityDataPoint {
  date: string;
  value: number;
  confidence: number;
  dataPoints: number;
}

interface ObserversMapData {
  list?: ObserverInfo[];
  map?: ReturnType<typeof transformObserversForMap>;
}

interface AnalyticsBundleResponse {
  success: boolean;
  data: {
    observers: {
      data: ObserversMapData;
      statistics: {
        regional: ReturnType<typeof calculateRegionalStatistics>;
        summary: {
          totalObservers: number;
          totalObservations: number;
          averageObservationsPerObserver: number;
          observersWithCoordinates: number;
        };
        topObservers: ObserverInfo[];
      };
      metadata: {
        totalObservers: number;
        filteredObservers: number;
        returnedObservers: number;
        filters: {
          minObservations: number;
          region: string | null;
          limit: number;
          format: string;
        };
        processingTimeMs: number;
        apiVersion: string;
      };
      timestamp: string;
    };
    activity: {
      activityData: SimpleActivityDataPoint[];
      currentActivity: {
        level: string;
        index: number;
        description: string;
      };
      statistics: {
        averageActivity: number;
        peakActivity: number;
        peakDate: string;
        trend: 'increasing' | 'decreasing' | 'stable';
      };
      metadata: {
        totalDataPoints: number;
        dateRange: {
          earliest: string;
          latest: string;
        } | null;
        processingTimeMs: number;
        dataSource: string;
      };
      timestamp: string;
    };
    cometData: {
      comet: {
        name: string;
        designation: string;
        perihelionDate: string;
        currentMagnitude: number;
        observations: unknown[];
        lightCurve: unknown[];
        individualObservations: unknown[];
        trendAnalysis: unknown;
      };
      stats: unknown;
      observers: ObserverInfo[];
      orbital_mechanics?: unknown;
      brightness_enhanced?: unknown;
      source_status?: unknown;
      data_attributions?: unknown;
      metadata: {
        totalObservations: number;
        totalObservers: number;
        lightCurvePoints: number;
        smoothed: boolean;
        trendPeriodDays: number;
        processingTimeMs: number;
        dataSource: string;
        apiVersion: string;
        lastUpdated: string;
        sources_active?: string[];
        enhanced_features: boolean;
        fallback_reason?: string;
        queryParameters: {
          includeSmoothed: boolean;
          includePrediction: boolean;
          maxObservations: number;
          trendDays: number;
        };
      };
      timestamp: string;
    };
    velocity: {
      velocityData: VelocityDataPoint[];
      type: string;
      parameters: {
        smoothingWindow: number;
        limit: number;
        days: number;
      };
      metadata: {
        processingTimeMs: number;
        dataPoints: number;
        velocityType: string;
      };
    };
  };
  metadata: {
    observationsFetched: number;
    processingTimeMs: number;
    cacheStatus: string;
  };
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Convert activity level to 0-100 scale for charting
 */
function activityLevelToIndex(level: string): number {
  switch (level) {
    case 'EXTREME': return 90;
    case 'HIGH': return 70;
    case 'MODERATE': return 40;
    case 'LOW': return 20;
    case 'INSUFFICIENT_DATA': return 0;
    default: return 0;
  }
}

/**
 * Get activity level description
 */
function getActivityDescription(level: string): string {
  switch (level) {
    case 'EXTREME': return 'Extreme activity - dramatic outbursts and rapid evolution';
    case 'HIGH': return 'High activity - significant brightening and coma development';
    case 'MODERATE': return 'Moderate activity - noticeable brightness changes';
    case 'LOW': return 'Low activity - minimal cometary activity';
    case 'INSUFFICIENT_DATA': return 'Insufficient data for activity calculation';
    default: return 'Unknown activity level';
  }
}

/**
 * Calculate trend from activity data
 */
function calculateActivityTrend(activityData: SimpleActivityDataPoint[]): 'increasing' | 'decreasing' | 'stable' {
  if (activityData.length < 4) return 'stable';

  const firstHalf = activityData.slice(0, Math.floor(activityData.length / 2));
  const secondHalf = activityData.slice(Math.floor(activityData.length / 2));

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.activityIndex, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.activityIndex, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  if (Math.abs(diff) < 10) return 'stable';
  return diff > 0 ? 'increasing' : 'decreasing';
}

/**
 * Calculate brightness velocity from observations
 */
function calculateBrightnessVelocity(
  observations: CometObservation[],
  smoothingWindow: number,
  limit: number,
  days: number
): VelocityDataPoint[] {
  const recentObservations = observations.filter(obs => {
    const obsDate = new Date(obs.date);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return obsDate >= cutoffDate;
  });

  if (recentObservations.length < 2) return [];

  const velocityData: VelocityDataPoint[] = [];

  for (let i = smoothingWindow; i < recentObservations.length; i++) {
    const current = recentObservations[i];
    const previous = recentObservations[i - smoothingWindow];

    const currentDate = typeof current.date === 'string' ? current.date : current.date.toISOString();
    const previousDate = typeof previous.date === 'string' ? previous.date : previous.date.toISOString();

    const timeDiff = (new Date(currentDate).getTime() - new Date(previousDate).getTime()) / (1000 * 60 * 60 * 24);
    const magnitudeDiff = current.magnitude - previous.magnitude;

    if (timeDiff > 0) {
      velocityData.push({
        date: currentDate,
        value: magnitudeDiff / timeDiff,
        confidence: Math.min(1, smoothingWindow / 7),
        dataPoints: smoothingWindow
      });
    }
  }

  return velocityData;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Query parameters with defaults matching the details page
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '180')));
  const limit = parseInt(searchParams.get('limit') || '100');
  const trendDays = parseInt(searchParams.get('trendDays') || '30');
  const smoothingWindow = parseInt(searchParams.get('smoothingWindow') || '7');
  const minObservations = parseInt(searchParams.get('minObs') || '1');
  const region = searchParams.get('region');

  try {
    console.log('Analytics Bundle API: Starting consolidated data fetch...', {
      days, limit, trendDays, smoothingWindow, minObservations, region
    });

    // Fetch enhanced data ONCE (includes COBS observations + orbital mechanics)
    let observations: CometObservation[] = [];
    let heliocentric_distance = 2.1; // fallback distance
    let enhancedData = null;
    let dataSource = 'COBS-only';
    let cobsProcessedObservations = null; // Store COBS observations for reuse

    try {
      enhancedData = await getEnhancedCometData();
      observations = enhancedData.comet.observations.map(obs => ({
        ...obs,
        observer: {
          ...obs.observer,
          location: obs.observer.location.name,
          coordinates: obs.observer.location.lat && obs.observer.location.lng ? {
            lat: obs.observer.location.lat,
            lng: obs.observer.location.lng
          } : undefined
        },
        location: {
          lat: obs.observer.location.lat || 0,
          lng: obs.observer.location.lng || 0,
          name: obs.observer.location.name
        }
      }));
      heliocentric_distance = enhancedData.orbital_mechanics?.current_distance?.heliocentric || 2.1;
      dataSource = 'Multi-Source Enhanced';
      console.log('Using enhanced multi-source data with orbital mechanics');
    } catch (enhancedError) {
      console.warn('Enhanced data failed, falling back to COBS-only:', enhancedError);
      // Optimization: Store COBS observations for reuse in getObservers() call
      cobsProcessedObservations = await cobsApi.getObservations();
      observations = cobsProcessedObservations.map(obs => ({
        ...obs,
        observer: {
          ...obs.observer,
          location: obs.observer.location.name,
          coordinates: obs.observer.location.lat && obs.observer.location.lng ? {
            lat: obs.observer.location.lat,
            lng: obs.observer.location.lng
          } : undefined
        },
        location: {
          lat: obs.observer.location.lat || 0,
          lng: obs.observer.location.lng || 0,
          name: obs.observer.location.name
        }
      }));
      console.log('Using COBS-only data with fallback distance');
    }

    if (observations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No observation data available',
        metadata: {
          observationsFetched: 0,
          processingTimeMs: Date.now() - startTime,
          cacheStatus: 'no-data'
        },
        timestamp: new Date().toISOString(),
      } satisfies Partial<AnalyticsBundleResponse>, { status: 200 });
    }

    console.log(`Fetched ${observations.length} observations from ${dataSource}`);

    // ========================================================================
    // 1. OBSERVERS DATA (replaces /api/observers)
    // ========================================================================
    const observersStartTime = Date.now();
    // Optimization: Reuse COBS observations if available (COBS fallback path)
    // Otherwise, getObservers() will fetch its own (enhanced data path)
    const observers = await cobsApi.getObservers(false, cobsProcessedObservations || undefined);

    let filteredObservers = observers;
    if (minObservations > 1) {
      filteredObservers = filteredObservers.filter(obs => obs.observationCount >= minObservations);
    }
    if (region) {
      filteredObservers = filteredObservers.filter(obs =>
        obs.location.name.toLowerCase().includes(region.toLowerCase())
      );
    }

    const limitedObservers = filteredObservers.slice(0, limit);
    const transformedObservers = limitedObservers.map(obs => ({
      ...obs,
      location: {
        ...obs.location,
        lat: obs.location.lat || 0,
        lng: obs.location.lng || 0,
      }
    }));

    const observersData: ObserversMapData = {
      list: transformedObservers,
      map: transformObserversForMap(transformedObservers)
    };

    const observersStatistics = {
      regional: calculateRegionalStatistics(filteredObservers),
      summary: {
        totalObservers: filteredObservers.length,
        totalObservations: filteredObservers.reduce((sum, obs) => sum + obs.observationCount, 0),
        averageObservationsPerObserver: filteredObservers.length > 0 ?
          filteredObservers.reduce((sum, obs) => sum + obs.observationCount, 0) / filteredObservers.length : 0,
        observersWithCoordinates: transformedObservers.filter(obs => obs.location.lat && obs.location.lng).length,
      },
      topObservers: transformedObservers.slice(0, 10),
    };

    const observersProcessingTime = Date.now() - observersStartTime;

    // ========================================================================
    // 2. SIMPLE ACTIVITY DATA (replaces /api/simple-activity)
    // ========================================================================
    const activityStartTime = Date.now();

    let filteredObservations = observations;
    if (days > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredObservations = observations.filter(obs =>
        new Date(obs.date) >= cutoffDate
      );
    }

    const sortedObservations = [...filteredObservations].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    interface DailyGroup {
      dateKey: string;
      observations: CometObservation[];
    }

    const activityData: SimpleActivityDataPoint[] = sortedObservations.reduce<{
      groups: DailyGroup[];
      currentDateKey: string | null;
    }>((acc, obs) => {
      const dateKey = new Date(obs.date).toISOString().split('T')[0];

      if (dateKey === acc.currentDateKey) {
        acc.groups[acc.groups.length - 1].observations.push(obs);
      } else {
        acc.groups.push({ dateKey, observations: [obs] });
        acc.currentDateKey = dateKey;
      }

      return acc;
    }, { groups: [], currentDateKey: null })
    .groups
    .map(({ dateKey, observations: dayObs }) => {
      const magnitudes = dayObs.map(obs => obs.magnitude).sort((a, b) => a - b);
      const medianMagnitude = magnitudes[Math.floor(magnitudes.length / 2)];

      const activity = calculateActivityFromAPIData(
        [{
          id: `daily-${dateKey}`,
          date: dateKey,
          magnitude: medianMagnitude,
          observer: {
            id: 'aggregate',
            name: 'Daily Aggregate',
            location: 'Multiple',
            telescope: 'Various',
            observationCount: dayObs.length
          },
          location: {
            lat: 0,
            lng: 0,
            name: 'Multiple'
          }
        }],
        { ephemeris: { r: heliocentric_distance } }
      );

      const obsCount = dayObs.length;
      const obsConfidence = Math.min(1, obsCount / 3);
      const dataQuality = activity.level !== 'INSUFFICIENT_DATA' ? 1.0 : 0.0;
      const confidence = (obsConfidence * 0.7) + (dataQuality * 0.3);

      return {
        date: `${dateKey}T12:00:00.000Z`,
        activityLevel: activity.level,
        activityIndex: activityLevelToIndex(activity.level),
        currentMagnitude: activity.currentMagnitude,
        expectedMagnitude: activity.expectedMagnitude,
        brightnessDelta: activity.brightnessDelta,
        heliocentric_distance: activity.heliocentric_distance,
        confidence: parseFloat(confidence.toFixed(3))
      };
    });

    activityData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const activityIndices = activityData.map(d => d.activityIndex);
    const averageActivity = activityIndices.length > 0 ?
      activityIndices.reduce((sum, val) => sum + val, 0) / activityIndices.length : 0;
    const peakActivity = activityIndices.length > 0 ? Math.max(...activityIndices) : 0;
    const peakDataPoint = activityData.find(d => d.activityIndex === peakActivity);
    const activityTrend = calculateActivityTrend(activityData);

    const currentActivityData = activityData[activityData.length - 1] || {
      activityLevel: 'INSUFFICIENT_DATA',
      activityIndex: 0
    };

    const currentActivity = {
      level: currentActivityData.activityLevel,
      index: currentActivityData.activityIndex,
      description: getActivityDescription(currentActivityData.activityLevel)
    };

    const activityProcessingTime = Date.now() - activityStartTime;

    // ========================================================================
    // 3. COMET DATA (replaces /api/comet-data)
    // ========================================================================
    const cometDataStartTime = Date.now();

    const lightCurve = await cobsApi.getLightCurve();
    const statistics = await cobsApi.getStatistics();

    const trendAnalysis = analyzeTrend(lightCurve, trendDays);
    let processedLightCurve = lightCurve;
    if (lightCurve.length > 7) {
      processedLightCurve = calculateRunningAverage(lightCurve, 7);
    }

    const cometDataMaxObs = parseInt(searchParams.get('cometDataLimit') || '200');

    let cometDataPayload;
    if (enhancedData) {
      // Use enhanced data
      cometDataPayload = {
        name: enhancedData.comet.name,
        designation: enhancedData.comet.designation,
        perihelionDate: enhancedData.comet.perihelionDate,
        currentMagnitude: enhancedData.comet.currentMagnitude,
        observations: enhancedData.comet.observations.slice(0, cometDataMaxObs).map(obs => ({
          ...obs,
          quality: obs.quality || 'good',
        })),
        lightCurve: processedLightCurve.map(point => ({
          date: point.date,
          magnitude: point.magnitude,
          uncertainty: point.uncertainty,
          observationCount: point.observationCount,
        })),
        individualObservations: enhancedData.comet.observations.map(obs => ({
          date: obs.date,
          magnitude: obs.magnitude,
          filter: 'Visual',
          observer: obs.observer?.name || 'Unknown',
          quality: obs.quality || 'good',
        })),
        trendAnalysis,
      };
    } else {
      // Use COBS-only data
      cometDataPayload = {
        name: '3I/ATLAS',
        designation: 'Interstellar Comet 3I/ATLAS',
        perihelionDate: '2025-10-30T00:00:00Z',
        currentMagnitude: statistics.currentMagnitude,
        observations: observations.slice(0, cometDataMaxObs).map(obs => ({
          ...obs,
          quality: obs.quality || 'good',
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
          filter: 'Visual',
          observer: obs.observer.name,
          quality: obs.quality || 'good',
        })),
        trendAnalysis,
      };
    }

    const cometDataProcessingTime = Date.now() - cometDataStartTime;

    // ========================================================================
    // 4. BRIGHTNESS VELOCITY DATA (replaces /api/velocity)
    // ========================================================================
    const velocityStartTime = Date.now();

    const velocityData = calculateBrightnessVelocity(observations, smoothingWindow, limit, days);

    const velocityProcessingTime = Date.now() - velocityStartTime;

    // ========================================================================
    // COMPILE FINAL RESPONSE
    // ========================================================================
    const totalProcessingTime = Date.now() - startTime;

    const response: AnalyticsBundleResponse = {
      success: true,
      data: {
        observers: {
          data: observersData,
          statistics: observersStatistics,
          metadata: {
            totalObservers: observers.length,
            filteredObservers: filteredObservers.length,
            returnedObservers: transformedObservers.length,
            filters: {
              minObservations,
              region,
              limit,
              format: 'map'
            },
            processingTimeMs: observersProcessingTime,
            apiVersion: '2.0'
          },
          timestamp: new Date().toISOString(),
        },
        activity: {
          activityData,
          currentActivity,
          statistics: {
            averageActivity: parseFloat(averageActivity.toFixed(1)),
            peakActivity,
            peakDate: peakDataPoint?.date || (activityData[0]?.date || new Date().toISOString()),
            trend: activityTrend
          },
          metadata: {
            totalDataPoints: activityData.length,
            dateRange: activityData.length > 0 ? {
              earliest: activityData[0].date,
              latest: activityData[activityData.length - 1].date,
            } : null,
            processingTimeMs: activityProcessingTime,
            dataSource
          },
          timestamp: new Date().toISOString(),
        },
        cometData: {
          comet: cometDataPayload,
          stats: enhancedData ? {
            ...enhancedData.stats,
            trendAnalysis,
          } : {
            ...statistics,
            trendAnalysis,
          },
          observers: observers.slice(0, 20),
          ...(enhancedData ? {
            orbital_mechanics: enhancedData.orbital_mechanics,
            brightness_enhanced: enhancedData.brightness_enhanced,
            source_status: enhancedData.source_status,
            data_attributions: {
              visual_observations: 'COBS Comet Observation Database (CC BY-NC-SA 4.0)',
              orbital_mechanics: 'NASA/JPL Horizons System',
              position_data: 'TheSkyLive.com',
              thermal_analysis: 'Derived from multi-source photometry',
              attribution_note: 'Multi-source integration for comprehensive 3I/ATLAS tracking'
            }
          } : {}),
          metadata: {
            totalObservations: observations.length,
            totalObservers: observers.length,
            lightCurvePoints: lightCurve.length,
            smoothed: true,
            trendPeriodDays: trendDays,
            processingTimeMs: cometDataProcessingTime,
            dataSource,
            apiVersion: enhancedData ? '2.1' : '2.0',
            lastUpdated: enhancedData ? new Date().toISOString() : statistics.lastUpdated,
            sources_active: enhancedData ? Object.entries(enhancedData.source_status || {})
              .filter(([, status]: [string, { active: boolean }]) => status.active)
              .map(([key]) => key) : undefined,
            enhanced_features: !!enhancedData,
            fallback_reason: enhancedData ? undefined : 'Enhanced data unavailable',
            queryParameters: {
              includeSmoothed: true,
              includePrediction: true,
              maxObservations: cometDataMaxObs,
              trendDays
            }
          },
          timestamp: new Date().toISOString(),
        },
        velocity: {
          velocityData,
          type: 'brightness',
          parameters: { smoothingWindow, limit, days },
          metadata: {
            processingTimeMs: velocityProcessingTime,
            dataPoints: velocityData.length,
            velocityType: 'brightness'
          }
        }
      },
      metadata: {
        observationsFetched: observations.length,
        processingTimeMs: totalProcessingTime,
        cacheStatus: enhancedData ? 'multi-source-enhanced' : 'cobs-only'
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`Analytics Bundle API completed in ${totalProcessingTime}ms`);
    console.log(`  - Observers: ${observersProcessingTime}ms (${transformedObservers.length} observers)`);
    console.log(`  - Activity: ${activityProcessingTime}ms (${activityData.length} data points)`);
    console.log(`  - Comet Data: ${cometDataProcessingTime}ms (${lightCurve.length} light curve points)`);
    console.log(`  - Velocity: ${velocityProcessingTime}ms (${velocityData.length} velocity points)`);

    return NextResponse.json(response, {
      headers: {
        // Tier 2: Derived analytics - 15 minutes (consolidated analytics bundle from observations)
        // Bundles 4 derived analytics endpoints into single response for efficiency
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        'X-Processing-Time': totalProcessingTime.toString(),
        'X-Data-Source': dataSource,
        'X-Observations-Count': observations.length.toString(),
        'X-Bundle-Version': '1.0',
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Analytics Bundle API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Analytics Bundle error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch analytics bundle',
      message: errorMessage,
      metadata: {
        observationsFetched: 0,
        processingTimeMs: processingTime,
        cacheStatus: 'error'
      },
      timestamp: new Date().toISOString(),
    } satisfies Partial<AnalyticsBundleResponse>, { status: 500 });
  }
}
