/**
 * Data Transformation Utilities for 3I/ATLAS Comet Dashboard
 *
 * Utilities to transform raw COBS data into chart-ready formats
 * and calculate trends, running averages, and statistical insights.
 */

import { ProcessedObservation, LightCurvePoint, ObserverInfo } from './cobs-api';
import { format } from 'date-fns';

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesData {
  labels: string[];
  datasets: {
    label: string;
    data: ChartDataPoint[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface TrendAnalysis {
  trend: 'brightening' | 'dimming' | 'stable';
  rate: number; // magnitude change per day
  confidence: number; // 0-1
  periodDays: number;
  r2: number; // coefficient of determination
}

export interface BinnedData {
  bins: Array<{
    startDate: string;
    endDate: string;
    averageMagnitude: number;
    observationCount: number;
    uncertainty: number;
    observers: string[];
  }>;
  binSize: 'daily' | 'weekly' | 'monthly';
}

/**
 * Transform light curve data for Chart.js time series
 */
export function transformLightCurveForChart(lightCurve: LightCurvePoint[]): TimeSeriesData {
  const dataPoints = lightCurve.map(point => ({
    x: new Date(point.date).getTime(),
    y: point.magnitude,
    label: format(new Date(point.date), 'MMM dd'),
    metadata: {
      uncertainty: point.uncertainty,
      observationCount: point.observationCount,
    },
  }));

  return {
    labels: lightCurve.map(point => format(new Date(point.date), 'MMM dd')),
    datasets: [{
      label: 'Magnitude',
      data: dataPoints,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: false,
      tension: 0.2,
    }],
  };
}

/**
 * Calculate running average for light curve smoothing
 */
export function calculateRunningAverage(
  lightCurve: LightCurvePoint[],
  windowDays: number = 7
): LightCurvePoint[] {
  if (lightCurve.length === 0) return [];

  const smoothed: LightCurvePoint[] = [];

  for (let i = 0; i < lightCurve.length; i++) {
    const currentDate = new Date(lightCurve[i].date);
    const windowStart = new Date(currentDate);
    windowStart.setDate(windowStart.getDate() - Math.floor(windowDays / 2));
    const windowEnd = new Date(currentDate);
    windowEnd.setDate(windowEnd.getDate() + Math.floor(windowDays / 2));

    const windowPoints = lightCurve.filter(point => {
      const pointDate = new Date(point.date);
      return pointDate >= windowStart && pointDate <= windowEnd;
    });

    if (windowPoints.length > 0) {
      const averageMagnitude = windowPoints.reduce((sum, point) => sum + point.magnitude, 0) / windowPoints.length;
      const totalObservations = windowPoints.reduce((sum, point) => sum + point.observationCount, 0);

      smoothed.push({
        date: lightCurve[i].date,
        magnitude: parseFloat(averageMagnitude.toFixed(2)),
        observationCount: totalObservations,
        uncertainty: windowPoints[0].uncertainty, // Use first point's uncertainty
      });
    }
  }

  return smoothed;
}

/**
 * Analyze brightness trend using linear regression
 */
export function analyzeTrend(lightCurve: LightCurvePoint[], days: number = 30): TrendAnalysis {
  if (lightCurve.length < 3) {
    return {
      trend: 'stable',
      rate: 0,
      confidence: 0,
      periodDays: days,
      r2: 0,
    };
  }

  // Filter to recent data
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const recentPoints = lightCurve.filter(point => new Date(point.date) >= cutoffDate);

  if (recentPoints.length < 3) {
    return {
      trend: 'stable',
      rate: 0,
      confidence: 0,
      periodDays: days,
      r2: 0,
    };
  }

  // Convert dates to days since first observation
  const firstDate = new Date(recentPoints[0].date).getTime();
  const dataPoints = recentPoints.map(point => ({
    x: (new Date(point.date).getTime() - firstDate) / (1000 * 60 * 60 * 24), // days
    y: point.magnitude,
  }));

  // Linear regression
  const n = dataPoints.length;
  const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
  const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
  const sumXY = dataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = dataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = 1 - (ssResidual / ssTotal);

  // Determine trend
  let trend: 'brightening' | 'dimming' | 'stable';
  const absSlope = Math.abs(slope);

  if (absSlope < 0.01) {
    trend = 'stable';
  } else if (slope < 0) {
    trend = 'brightening'; // Lower magnitude = brighter
  } else {
    trend = 'dimming';
  }

  return {
    trend,
    rate: parseFloat(slope.toFixed(4)),
    confidence: parseFloat(Math.max(0, Math.min(1, r2)).toFixed(3)),
    periodDays: days,
    r2: parseFloat(r2.toFixed(4)),
  };
}

/**
 * Bin observations by time period (daily, weekly, monthly)
 */
export function binObservationsByTime(
  observations: ProcessedObservation[],
  binSize: 'daily' | 'weekly' | 'monthly' = 'daily'
): BinnedData {
  if (observations.length === 0) {
    return { bins: [], binSize };
  }

  // Sort observations by date
  const sortedObs = observations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const bins: BinnedData['bins'] = [];
  const binMap = new Map<string, ProcessedObservation[]>();

  // Group observations by bin
  sortedObs.forEach(obs => {
    const obsDate = new Date(obs.date);
    let binKey: string;

    switch (binSize) {
      case 'daily':
        binKey = format(obsDate, 'yyyy-MM-dd');
        break;
      case 'weekly':
        const startOfWeek = new Date(obsDate);
        startOfWeek.setDate(obsDate.getDate() - obsDate.getDay());
        binKey = format(startOfWeek, 'yyyy-MM-dd');
        break;
      case 'monthly':
        binKey = format(obsDate, 'yyyy-MM');
        break;
    }

    if (!binMap.has(binKey)) {
      binMap.set(binKey, []);
    }
    binMap.get(binKey)!.push(obs);
  });

  // Process bins
  for (const [binKey, binObservations] of binMap) {
    const magnitudes = binObservations.map(obs => obs.magnitude);
    const averageMagnitude = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;

    // Calculate uncertainty as standard deviation
    const variance = magnitudes.reduce((sum, mag) => sum + Math.pow(mag - averageMagnitude, 2), 0) / magnitudes.length;
    const uncertainty = Math.sqrt(variance);

    const uniqueObservers = Array.from(new Set(binObservations.map(obs => obs.observer.name)));

    let startDate: string, endDate: string;

    switch (binSize) {
      case 'daily':
        startDate = endDate = `${binKey}T00:00:00.000Z`;
        break;
      case 'weekly':
        const weekStart = new Date(binKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        startDate = weekStart.toISOString();
        endDate = weekEnd.toISOString();
        break;
      case 'monthly':
        const monthStart = new Date(`${binKey}-01`);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        startDate = monthStart.toISOString();
        endDate = monthEnd.toISOString();
        break;
    }

    bins.push({
      startDate,
      endDate,
      averageMagnitude: parseFloat(averageMagnitude.toFixed(2)),
      observationCount: binObservations.length,
      uncertainty: parseFloat(uncertainty.toFixed(3)),
      observers: uniqueObservers,
    });
  }

  return {
    bins: bins.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    binSize,
  };
}

/**
 * Transform observer data for geographic visualization
 */
export function transformObserversForMap(observers: ObserverInfo[]) {
  return observers
    .filter(obs => obs.location.lat !== undefined && obs.location.lng !== undefined)
    .map(obs => ({
      id: obs.id,
      name: obs.name,
      position: [obs.location.lat!, obs.location.lng!] as [number, number],
      observationCount: obs.observationCount,
      averageMagnitude: obs.averageMagnitude,
      location: obs.location.name,
      popup: `
        <strong>${obs.name}</strong><br/>
        Location: ${obs.location.name}<br/>
        Observations: ${obs.observationCount}<br/>
        Avg Magnitude: ${obs.averageMagnitude}
      `,
    }));
}

/**
 * Calculate observation statistics by country/region
 */
export function calculateRegionalStatistics(observers: ObserverInfo[]) {
  const regionMap = new Map<string, {
    observerCount: number;
    totalObservations: number;
    averageMagnitude: number;
    regions: string[];
  }>();

  observers.forEach(obs => {
    // Extract country/region from location
    const locationParts = obs.location.name.split(',');
    const region = locationParts[locationParts.length - 1].trim();

    if (!regionMap.has(region)) {
      regionMap.set(region, {
        observerCount: 0,
        totalObservations: 0,
        averageMagnitude: 0,
        regions: [],
      });
    }

    const stats = regionMap.get(region)!;
    stats.observerCount++;
    stats.totalObservations += obs.observationCount;

    // Update running average
    const totalMagnitudeWeight = stats.averageMagnitude * (stats.observerCount - 1) + obs.averageMagnitude;
    stats.averageMagnitude = totalMagnitudeWeight / stats.observerCount;
  });

  return Array.from(regionMap.entries()).map(([region, stats]) => ({
    region,
    ...stats,
    averageMagnitude: parseFloat(stats.averageMagnitude.toFixed(2)),
  })).sort((a, b) => b.totalObservations - a.totalObservations);
}

/**
 * Generate prediction data points based on trend analysis
 */
export function generatePrediction(
  lightCurve: LightCurvePoint[],
  trend: TrendAnalysis,
  futureDays: number = 30
): LightCurvePoint[] {
  if (lightCurve.length === 0 || trend.confidence < 0.5) {
    return [];
  }

  const lastPoint = lightCurve[lightCurve.length - 1];
  const lastDate = new Date(lastPoint.date);
  const predictions: LightCurvePoint[] = [];

  for (let i = 1; i <= futureDays; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);

    const predictedMagnitude = lastPoint.magnitude + (trend.rate * i);

    predictions.push({
      date: futureDate.toISOString(),
      magnitude: parseFloat(predictedMagnitude.toFixed(2)),
      observationCount: 0,
      uncertainty: 0.5 + (i * 0.1), // Increasing uncertainty over time
    });
  }

  return predictions;
}