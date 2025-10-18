import { NextRequest, NextResponse } from 'next/server';
import { CometObservation } from '@/types/comet';
import { cobsApi } from '@/services/cobs-api';
import { calculateActivityFromAPIData } from '@/utils/activity-calculator';
import { getEnhancedCometData } from '@/lib/data-sources/source-manager';

interface SimpleActivityDataPoint {
  date: string;
  activityLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'INSUFFICIENT_DATA';
  activityIndex: number; // 0-100 scale (converted from activity level)
  currentMagnitude: number;
  expectedMagnitude: number;
  brightnessDelta: number;
  heliocentric_distance: number;
  confidence: number; // 0-1 confidence level
}

interface SimpleActivityResponse {
  success: boolean;
  data?: {
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
  };
  metadata?: {
    totalDataPoints: number;
    dateRange: {
      earliest: string;
      latest: string;
    } | null;
    processingTimeMs: number;
    dataSource: string;
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
function calculateTrend(activityData: SimpleActivityDataPoint[]): 'increasing' | 'decreasing' | 'stable' {
  if (activityData.length < 4) return 'stable';

  const firstHalf = activityData.slice(0, Math.floor(activityData.length / 2));
  const secondHalf = activityData.slice(Math.floor(activityData.length / 2));

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.activityIndex, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.activityIndex, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;
  if (Math.abs(diff) < 10) return 'stable';
  return diff > 0 ? 'increasing' : 'decreasing';
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  // Query parameters
  const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '0'))); // 0 means all data

  try {
    console.log('Calculating simple activity levels with params:', { days });

    // Try to get enhanced data first (includes orbital mechanics)
    let observations: CometObservation[] = [];
    let heliocentric_distance = 2.1; // fallback distance

    try {
      const enhancedData = await getEnhancedCometData();
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
      console.log('Using enhanced data with orbital mechanics');
    } catch (enhancedError) {
      console.warn('Enhanced data failed, falling back to COBS-only:', enhancedError);
      const cobsObs = await cobsApi.getObservations();
      observations = cobsObs.map(obs => ({
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
        message: 'Need brightness observations for activity calculation',
        timestamp: new Date().toISOString(),
      } satisfies SimpleActivityResponse, { status: 200 });
    }

    // Filter by date range if specified
    let filteredObservations = observations;
    if (days > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filteredObservations = observations.filter(obs =>
        new Date(obs.date) >= cutoffDate
      );
    }

    // Optimized linear-time daily grouping algorithm:
    // 1. Sort observations once by date (O(n log n))
    // 2. Use reduce() for single-pass aggregation (O(n))
    // 3. Group consecutive dates linearly without Map lookups
    // Total complexity: O(n log n) - optimal for grouping sorted data

    // Sort observations by date once
    const sortedObservations = [...filteredObservations].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Single-pass reduce to group by date and calculate activity
    interface DailyGroup {
      dateKey: string;
      observations: CometObservation[];
    }

    const activityData: SimpleActivityDataPoint[] = sortedObservations.reduce<{
      groups: DailyGroup[];
      currentDateKey: string | null;
    }>((acc, obs) => {
      const dateKey = new Date(obs.date).toISOString().split('T')[0];

      // Linear grouping: only compare with current date key
      if (dateKey === acc.currentDateKey) {
        // Same day - append to current group
        acc.groups[acc.groups.length - 1].observations.push(obs);
      } else {
        // New day - create new group
        acc.groups.push({ dateKey, observations: [obs] });
        acc.currentDateKey = dateKey;
      }

      return acc;
    }, { groups: [], currentDateKey: null })
    .groups
    .map(({ dateKey, observations: dayObs }) => {
      // Use median magnitude for the day to reduce noise
      const magnitudes = dayObs.map(obs => obs.magnitude).sort((a, b) => a - b);
      const medianMagnitude = magnitudes[Math.floor(magnitudes.length / 2)];

      // Calculate activity for this day
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

      // Calculate confidence based on number of observations and data quality
      const obsCount = dayObs.length;
      const obsConfidence = Math.min(1, obsCount / 3); // Higher confidence with more observations
      const dataQuality = activity.level !== 'INSUFFICIENT_DATA' ? 1.0 : 0.0;
      const confidence = (obsConfidence * 0.7) + (dataQuality * 0.3);

      return {
        date: `${dateKey}T12:00:00.000Z`, // Use noon UTC for daily data points
        activityLevel: activity.level,
        activityIndex: activityLevelToIndex(activity.level),
        currentMagnitude: activity.currentMagnitude,
        expectedMagnitude: activity.expectedMagnitude,
        brightnessDelta: activity.brightnessDelta,
        heliocentric_distance: activity.heliocentric_distance,
        confidence: parseFloat(confidence.toFixed(3))
      };
    });

    if (activityData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Unable to calculate activity levels',
        message: 'No valid observations found for activity calculation',
        timestamp: new Date().toISOString(),
      } satisfies SimpleActivityResponse, { status: 200 });
    }

    // Sort by date
    activityData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate statistics
    const activityIndices = activityData.map(d => d.activityIndex);
    const averageActivity = activityIndices.reduce((sum, val) => sum + val, 0) / activityIndices.length;
    const peakActivity = Math.max(...activityIndices);
    const peakDataPoint = activityData.find(d => d.activityIndex === peakActivity);
    const trend = calculateTrend(activityData);

    // Current activity (most recent)
    const currentActivityData = activityData[activityData.length - 1];
    const currentActivity = {
      level: currentActivityData.activityLevel,
      index: currentActivityData.activityIndex,
      description: getActivityDescription(currentActivityData.activityLevel)
    };

    const processingTime = Date.now() - startTime;

    const response: SimpleActivityResponse = {
      success: true,
      data: {
        activityData,
        currentActivity,
        statistics: {
          averageActivity: parseFloat(averageActivity.toFixed(1)),
          peakActivity,
          peakDate: peakDataPoint?.date || activityData[0].date,
          trend
        }
      },
      metadata: {
        totalDataPoints: activityData.length,
        dateRange: activityData.length > 0 ? {
          earliest: activityData[0].date,
          latest: activityData[activityData.length - 1].date,
        } : null,
        processingTimeMs: processingTime,
        dataSource: observations === filteredObservations ? 'Enhanced Multi-Source' : 'COBS-only'
      },
      timestamp: new Date().toISOString(),
    };

    console.log(`Simple activity API completed in ${processingTime}ms`);
    console.log(`Generated ${activityData.length} activity data points`);
    console.log(`Current activity level: ${currentActivity.level} (${currentActivity.index})`);

    return NextResponse.json(response, {
      headers: {
        // Browser + CDN cache for 10 minutes (activity calculations are stable)
        'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=1200',
        'X-Processing-Time': processingTime.toString(),
        'X-Activity-Points': activityData.length.toString(),
        'X-Current-Activity': currentActivity.level,
      },
    });

  } catch (error) {
    console.error('Error calculating simple activity levels:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      success: false,
      error: 'Failed to calculate activity levels',
      message: errorMessage,
      timestamp: new Date().toISOString(),
    } satisfies SimpleActivityResponse, { status: 500 });
  }
}