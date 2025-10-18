'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getChartColors, getStatusColors, getBackgroundColors } from '@/utils/chart-theme';

export interface BrightnessData {
  date: string | Date;
  magnitude: number;
  observer?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

interface BrightnessStatsProps {
  data: BrightnessData[];
  className?: string;
  showTrend?: boolean;
  compact?: boolean; // Show only current magnitude and trend
  realTimeUpdates?: boolean;
  enableNotifications?: boolean;
  onSignificantChange?: (change: { type: 'brightening' | 'dimming'; magnitude: number }) => void;
  trendAnalysis?: {
    trend: 'brightening' | 'dimming' | 'stable';
    rate: number;
    confidence: number;
    periodDays: number;
    r2: number;
  };
}

interface Stats {
  current: {
    magnitude: number;
    date: Date;
    daysAgo: number;
  };
  average: {
    last7days: number;
    last30days: number;
    overall: number;
  };
  trend: {
    direction: 'brightening' | 'dimming' | 'stable';
    rate: number; // magnitude change per day
    confidence: 'high' | 'medium' | 'low';
  };
  extremes: {
    brightest: { magnitude: number; date: Date };
    dimmest: { magnitude: number; date: Date };
  };
  observationCount: {
    total: number;
    last7days: number;
    last30days: number;
  };
}

const BrightnessStats = React.memo(function BrightnessStats({
  data,
  className = '',
  showTrend = true,
  compact = false,
  realTimeUpdates = false,
  enableNotifications = false,
  onSignificantChange,
  trendAnalysis
}: BrightnessStatsProps) {
  const [previousStats, setPreviousStats] = useState<Stats | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get theme colors
  const chartColors = getChartColors();
  const statusColors = getStatusColors();
  const bgColors = getBackgroundColors();

  const stats: Stats = useMemo(() => {
    if (data.length === 0) {
      return {
        current: { magnitude: 0, date: new Date(), daysAgo: 0 },
        average: { last7days: 0, last30days: 0, overall: 0 },
        trend: { direction: 'stable', rate: 0, confidence: 'low' },
        extremes: {
          brightest: { magnitude: 0, date: new Date() },
          dimmest: { magnitude: 0, date: new Date() }
        },
        observationCount: { total: 0, last7days: 0, last30days: 0 }
      };
    }

    // Sort data by date (most recent first)
    const sortedData = [...data].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Current magnitude (most recent observation)
    const currentObs = sortedData[0];
    const currentDate = new Date(currentObs.date);
    const current = {
      magnitude: currentObs.magnitude,
      date: currentDate,
      daysAgo: Math.floor((now.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000))
    };

    // Filter observations by time period
    const last7daysData = sortedData.filter(obs => new Date(obs.date) >= sevenDaysAgo);
    const last30daysData = sortedData.filter(obs => new Date(obs.date) >= thirtyDaysAgo);

    // Calculate averages
    const average = {
      last7days: last7daysData.length > 0
        ? last7daysData.reduce((sum, obs) => sum + obs.magnitude, 0) / last7daysData.length
        : 0,
      last30days: last30daysData.length > 0
        ? last30daysData.reduce((sum, obs) => sum + obs.magnitude, 0) / last30daysData.length
        : 0,
      overall: data.reduce((sum, obs) => sum + obs.magnitude, 0) / data.length
    };

    // Use provided trend analysis or calculate our own as fallback
    const trend = trendAnalysis ? {
      direction: trendAnalysis.trend,
      rate: trendAnalysis.rate,
      confidence: trendAnalysis.confidence >= 0.7 ? 'high' : trendAnalysis.confidence >= 0.4 ? 'medium' : 'low' as 'high' | 'medium' | 'low'
    } : calculateTrend(sortedData);

    // Find extremes
    const magnitudes = data.map(obs => obs.magnitude);
    const brightestMag = Math.min(...magnitudes); // Lower magnitude = brighter
    const dimmestMag = Math.max(...magnitudes);

    const brightestObs = data.find(obs => obs.magnitude === brightestMag)!;
    const dimmestObs = data.find(obs => obs.magnitude === dimmestMag)!;

    const extremes = {
      brightest: { magnitude: brightestMag, date: new Date(brightestObs.date) },
      dimmest: { magnitude: dimmestMag, date: new Date(dimmestObs.date) }
    };

    // Count observations
    const observationCount = {
      total: data.length,
      last7days: last7daysData.length,
      last30days: last30daysData.length
    };

    const newStats = {
      current,
      average,
      trend,
      extremes,
      observationCount
    };

    return newStats;
  }, [data, trendAnalysis]);

  // Handle real-time updates and notifications
  useEffect(() => {
    if (realTimeUpdates && previousStats) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 1500);

      // Check for significant brightness changes
      if (enableNotifications && onSignificantChange) {
        const magnitudeChange = stats.current.magnitude - previousStats.current.magnitude;
        if (Math.abs(magnitudeChange) > 0.5) { // Significant change threshold
          onSignificantChange({
            type: magnitudeChange < 0 ? 'brightening' : 'dimming',
            magnitude: Math.abs(magnitudeChange)
          });
        }
      }

      return () => clearTimeout(timer);
    }

    setPreviousStats(stats);
  }, [stats, realTimeUpdates, enableNotifications, onSignificantChange, previousStats]);

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'brightening': return '📈';
      case 'dimming': return '📉';
      default: return '📊';
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'brightening': return 'text-[var(--color-status-success)]';
      case 'dimming': return 'text-[var(--color-status-error)]';
      default: return 'text-[var(--color-status-warning)]';
    }
  };

  const getBrightnessChangeIndicator = () => {
    if (!previousStats || !realTimeUpdates) return null;

    const change = stats.current.magnitude - previousStats.current.magnitude;
    if (Math.abs(change) < 0.1) return null;

    return (
      <div className="flex items-center gap-1 text-xs">
        <span className={change < 0 ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-error)]'}>
          {change < 0 ? '↗' : '↘'}
        </span>
        <span className="text-[var(--color-text-tertiary)]">
          {Math.abs(change).toFixed(2)}m {change < 0 ? 'brighter' : 'dimmer'}
        </span>
      </div>
    );
  };

  const formatMagnitude = (mag: number) => mag.toFixed(2);

  // Compact mode: single line with magnitude and trend
  if (compact) {
    return (
      <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          {/* Left: Current Magnitude */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-[var(--color-text-tertiary)] mb-1">Brightness Analysis</div>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-[var(--color-chart-primary)]">
                  {formatMagnitude(stats.current.magnitude)}m
                </div>
                <div className="text-sm text-[var(--color-text-tertiary)]">
                  ({stats.current.daysAgo === 0 ? 'Today' : `${stats.current.daysAgo}d ago`})
                </div>
              </div>
            </div>
          </div>

          {/* Right: Trend */}
          {showTrend && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Trend</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getTrendIcon(stats.trend.direction)}</span>
                  <span className={`text-lg font-bold ${getTrendColor(stats.trend.direction)}`}>
                    {stats.trend.direction.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Rate</div>
                <div className="text-lg font-bold text-[var(--color-text-secondary)]">
                  {Math.abs(stats.trend.rate).toFixed(3)} mag/day
                </div>
              </div>
              <div className="px-3 py-2 rounded text-xs font-medium" style={{
                backgroundColor: stats.trend.confidence === 'high' ? bgColors.tertiary :
                  stats.trend.confidence === 'medium' ? bgColors.secondary :
                  bgColors.secondary,
                color: stats.trend.confidence === 'high' ? statusColors.success :
                  stats.trend.confidence === 'medium' ? statusColors.warning :
                  statusColors.error
              }}>
                {stats.trend.confidence} confidence
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full mode: all statistics
  return (
    <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            Brightness Analysis
            {realTimeUpdates && (
              <span className={`w-3 h-3 rounded-full ${isUpdating ? 'bg-[var(--color-status-success)] animate-pulse' : 'bg-[var(--color-text-tertiary)]'}`}></span>
            )}
          </h3>
          {getBrightnessChangeIndicator()}
        </div>
        <div className="text-right">
          <div className="text-sm text-[var(--color-text-tertiary)]">
            Last observed: {stats.current.date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })} UTC
          </div>
          {realTimeUpdates && isUpdating && (
            <div className="text-xs text-[var(--color-text-tertiary)]">
              Checking for updates...
            </div>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`bg-gradient-to-br from-yellow-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border border-yellow-500/30 hover:scale-105 transition-all ${
          isUpdating ? 'ring-2 ring-yellow-500/50' : ''
        }`}>
          <div className="text-4xl mb-2">🌟</div>
          <div className="text-2xl font-bold text-yellow-400 mb-1">
            {formatMagnitude(stats.current.magnitude)}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">Current Magnitude</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
            {stats.current.daysAgo === 0 ? 'Today' : `${stats.current.daysAgo}d ago`}
          </div>
          {getBrightnessChangeIndicator()}
        </div>

        <div className="bg-gradient-to-br from-cyan-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border border-cyan-500/30 hover:scale-105 transition-transform">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-2xl font-bold text-cyan-400 mb-1">
            {formatMagnitude(stats.average.last7days)}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">7-Day Average</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
            {stats.observationCount.last7days} observations
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border border-green-500/30 hover:scale-105 transition-transform">
          <div className="text-4xl mb-2">✨</div>
          <div className="text-2xl font-bold text-green-400 mb-1">
            {formatMagnitude(stats.extremes.brightest.magnitude)}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">Brightest Recorded</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
            {stats.extremes.brightest.date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })} UTC
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border border-blue-500/30 hover:scale-105 transition-transform">
          <div className="text-4xl mb-2">🔭</div>
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {stats.observationCount.total}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">Total Observations</div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
            {realTimeUpdates ? `${stats.observationCount.last7days} this week` : 'Since tracking began'}
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      {showTrend && (
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              {getTrendIcon(stats.trend.direction)}
              Brightness Trend
            </h4>
            <div className="px-2 py-1 rounded text-xs font-medium" style={{
              backgroundColor: stats.trend.confidence === 'high' ? bgColors.tertiary :
                stats.trend.confidence === 'medium' ? bgColors.secondary :
                bgColors.secondary,
              color: stats.trend.confidence === 'high' ? statusColors.success :
                stats.trend.confidence === 'medium' ? statusColors.warning :
                statusColors.error
            }}>
              {stats.trend.confidence} confidence
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className={`text-2xl font-bold ${getTrendColor(stats.trend.direction)}`}>
                {stats.trend.direction.toUpperCase()}
              </div>
              <div className="text-[var(--color-text-secondary)] text-sm">Current Direction</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--color-text-secondary)]">
                {Math.abs(stats.trend.rate).toFixed(3)}
              </div>
              <div className="text-[var(--color-text-secondary)] text-sm">Mag/Day Change Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--color-text-secondary)]">
                {formatMagnitude(stats.average.last30days)}m
              </div>
              <div className="text-[var(--color-text-secondary)] text-sm">30-Day Average</div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <h5 className="font-semibold text-[var(--color-text-secondary)]">Historical Range</h5>
          <div className="text-[var(--color-text-secondary)]">
            <div>Brightest: {formatMagnitude(stats.extremes.brightest.magnitude)}m</div>
            <div>Dimmest: {formatMagnitude(stats.extremes.dimmest.magnitude)}m</div>
            <div>Range: {formatMagnitude(stats.extremes.dimmest.magnitude - stats.extremes.brightest.magnitude)}m</div>
          </div>
        </div>

        <div className="space-y-2">
          <h5 className="font-semibold text-[var(--color-text-secondary)]">Observation Activity</h5>
          <div className="text-[var(--color-text-secondary)]">
            <div>Recent (7d): {stats.observationCount.last7days} obs</div>
            <div>Month (30d): {stats.observationCount.last30days} obs</div>
            <div>Rate: {(stats.observationCount.last7days / 7).toFixed(1)}/day</div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-[var(--color-text-tertiary)] border-t border-[var(--color-border-secondary)] pt-3">
        <p>• Magnitude scale is logarithmic and inverted (lower values = brighter)</p>
        <p>• Trend analysis based on linear regression of recent observations</p>
        <p>• Confidence levels determined by data consistency and observation frequency</p>
        {realTimeUpdates && (
          <>
            <p>• Real-time monitoring shows live brightness changes</p>
            {enableNotifications && (
              <p>• Significant brightness changes (&gt;0.5m) trigger notifications</p>
            )}
          </>
        )}
      </div>
    </div>
  );
});

function calculateTrend(sortedData: BrightnessData[]): {
  direction: 'brightening' | 'dimming' | 'stable';
  rate: number;
  confidence: 'high' | 'medium' | 'low';
} {
  if (sortedData.length < 3) {
    return { direction: 'stable', rate: 0, confidence: 'low' };
  }

  // Use the last 14 days or all data if less available
  const recentData = sortedData.slice(0, 14);

  // Simple linear regression
  const n = recentData.length;
  const dates = recentData.map(obs => new Date(obs.date).getTime());
  const mags = recentData.map(obs => obs.magnitude);

  // Convert dates to days relative to most recent
  const maxDate = Math.max(...dates);
  const x = dates.map(date => (maxDate - date) / (24 * 60 * 60 * 1000));
  const y = mags;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  // Determine direction and confidence
  let direction: 'brightening' | 'dimming' | 'stable';
  if (Math.abs(slope) < 0.01) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'dimming'; // Positive slope = increasing magnitude = dimming
  } else {
    direction = 'brightening'; // Negative slope = decreasing magnitude = brightening
  }

  // Calculate confidence based on data consistency and sample size
  const variance = y.reduce((sum, yi, i) => {
    const predicted = sumY / n + slope * (x[i] - sumX / n);
    return sum + Math.pow(yi - predicted, 2);
  }, 0) / n;

  const standardError = Math.sqrt(variance);

  let confidence: 'high' | 'medium' | 'low';
  if (n >= 7 && standardError < 0.2) {
    confidence = 'high';
  } else if (n >= 4 && standardError < 0.5) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    direction,
    rate: -slope, // Invert for intuitive interpretation
    confidence
  };
}

export default BrightnessStats;