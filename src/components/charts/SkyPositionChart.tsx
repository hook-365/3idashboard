'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import { getTextColors, getBackgroundColors, getBorderColors, getChartColors, hexToRgba } from '@/utils/chart-theme';

// Flag to track Chart.js registration
let chartJsRegistered = false;

/**
 * Sky position data point for RA/DEC coordinates
 */
export interface SkyPositionDataPoint {
  /** Right Ascension in degrees (0-360) */
  ra: number;
  /** Declination in degrees (-90 to +90) */
  dec: number;
  /** Optional label for the point */
  label?: string;
  /** ISO timestamp of when this position was observed/calculated */
  timestamp?: string;
  /** Data source (e.g., "JPL Horizons", "TheSkyLive", "Calculated") */
  source?: string;
}

/**
 * Props for SkyPositionChart component
 */
interface SkyPositionChartProps {
  /** Current position data point */
  currentPosition: SkyPositionDataPoint;
  /** Optional historical positions to show comet's path across the sky */
  historicalPositions?: SkyPositionDataPoint[];
  /** Chart height in pixels */
  height?: number;
  /** CSS class name for styling */
  className?: string;
  /** Show constellation boundaries (future enhancement) */
  showConstellations?: boolean;
}

/**
 * SkyPositionChart - Displays the comet's position in celestial coordinates
 *
 * Visualizes Right Ascension (RA) and Declination (DEC) coordinates to show
 * where the comet appears in the night sky. Uses a scatter plot with RA on
 * the X-axis (0-360°) and DEC on the Y-axis (-90° to +90°).
 *
 * @example
 * ```tsx
 * <SkyPositionChart
 *   currentPosition={{
 *     ra: 180.5,
 *     dec: -45.2,
 *     label: '3I/ATLAS',
 *     timestamp: '2025-10-06T00:00:00Z',
 *     source: 'JPL Horizons'
 *   }}
 *   historicalPositions={[...]}
 *   height={500}
 * />
 * ```
 */
export default function SkyPositionChart({
  currentPosition,
  historicalPositions = [],
  height = 500,
  className = '',
  showConstellations = false
}: SkyPositionChartProps) {
  const [isClient, setIsClient] = useState(false);

  // Register Chart.js components only when this chart loads
  useEffect(() => {
    if (!chartJsRegistered) {
      ChartJS.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend,
        annotationPlugin
      );
      chartJsRegistered = true;
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Format RA for display (convert to hours:minutes if needed)
  const formatRA = (ra: number): string => {
    // Keep in degrees for now (0-360°)
    return `${ra.toFixed(2)}°`;
  };

  // Format DEC for display
  const formatDEC = (dec: number): string => {
    const sign = dec >= 0 ? '+' : '';
    return `${sign}${dec.toFixed(2)}°`;
  };

  // Format RA for axis labels (in hours:minutes format)
  const formatRAAxis = (ra: number): string => {
    const hours = Math.floor(ra / 15);
    const minutes = Math.floor(((ra / 15) - hours) * 60);
    return `${hours}h ${minutes}m`;
  };

  const chartData: ChartData<'scatter'> = useMemo(() => {
    const chartColors = getChartColors();

    const datasets = [];

    // Historical positions (path the comet has taken)
    if (historicalPositions.length > 0) {
      datasets.push({
        label: 'Historical Path',
        data: historicalPositions.map(pos => ({
          x: pos.ra,
          y: pos.dec,
          timestamp: pos.timestamp,
          source: pos.source,
        })),
        backgroundColor: hexToRgba(chartColors.tertiary, 0.4),
        borderColor: hexToRgba(chartColors.tertiary, 0.6),
        pointRadius: 3,
        pointHoverRadius: 5,
        showLine: true, // Connect historical points
        borderWidth: 1,
        borderDash: [5, 5],
        tension: 0.3,
      });
    }

    // Current position (highlighted)
    datasets.push({
      label: `Current Position (${currentPosition.source || 'Unknown'})`,
      data: [{
        x: currentPosition.ra,
        y: currentPosition.dec,
        timestamp: currentPosition.timestamp,
        source: currentPosition.source,
      }],
      backgroundColor: chartColors.primary,
      borderColor: '#ffffff',
      pointRadius: 10,
      pointHoverRadius: 12,
      pointStyle: 'star',
      borderWidth: 3,
      showLine: false,
    });

    return { datasets };
  }, [currentPosition, historicalPositions]);

  const options: ChartOptions<'scatter'> = useMemo(() => {
    const textColors = getTextColors();
    const bgColors = getBackgroundColors();
    const borderColors = getBorderColors();

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            color: textColors.secondary,
            font: {
              size: 12
            },
            usePointStyle: true,
          }
        },
        title: {
          display: true,
          text: 'Sky Position (Celestial Coordinates)',
          color: textColors.heading,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        tooltip: {
          backgroundColor: bgColors.tertiary,
          titleColor: textColors.primary,
          bodyColor: textColors.secondary,
          borderColor: borderColors.secondary,
          borderWidth: 1,
          callbacks: {
            title: () => {
              return '3I/ATLAS Position';
            },
            label: (context) => {
              const point = context.raw as { x: number; y: number; timestamp?: string; source?: string };
              const lines = [
                `RA: ${formatRA(point.x)} (${formatRAAxis(point.x)})`,
                `DEC: ${formatDEC(point.y)}`,
              ];
              if (point.source) {
                lines.push(`Source: ${point.source}`);
              }
              if (point.timestamp) {
                const date = new Date(point.timestamp);
                lines.push(`Updated: ${date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC'
                })} UTC`);
              }
              return lines;
            }
          }
        },
        annotation: {
          annotations: {
            // Add celestial equator line (DEC = 0°)
            celestialEquator: {
              type: 'line',
              yMin: 0,
              yMax: 0,
              borderColor: hexToRgba(textColors.tertiary, 0.3),
              borderWidth: 1,
              borderDash: [3, 3],
              label: {
                display: true,
                content: 'Celestial Equator',
                position: 'end',
                backgroundColor: hexToRgba(bgColors.tertiary, 0.8),
                color: textColors.tertiary,
                font: {
                  size: 10
                },
                padding: 2
              }
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Right Ascension (RA)',
            color: textColors.secondary,
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          min: 0,
          max: 360,
          ticks: {
            color: textColors.tertiary,
            stepSize: 30, // Every 2 hours (30° = 2h)
            callback: function(value) {
              // Show both degrees and hours
              const val = value as number;
              return `${val}° (${Math.floor(val / 15)}h)`;
            }
          },
          grid: {
            color: borderColors.primary,
            drawTicks: true,
          }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: 'Declination (DEC)',
            color: textColors.secondary,
            font: {
              size: 14,
              weight: 'bold'
            }
          },
          min: -90,
          max: 90,
          ticks: {
            color: textColors.tertiary,
            stepSize: 15,
            callback: function(value) {
              const val = value as number;
              const sign = val >= 0 ? '+' : '';
              return `${sign}${val}°`;
            }
          },
          grid: {
            color: borderColors.primary,
            drawTicks: true,
          }
        }
      },
      interaction: {
        mode: 'nearest',
        intersect: false
      }
    };
  }, []);

  if (!isClient) {
    return (
      <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-6 ${className}`} style={{ height: `${height}px` }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-[var(--color-text-tertiary)]">
            Loading sky position chart...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-4 ${className}`}>
      <div style={{ height: `${height}px`, width: '100%' }} aria-label="3I/ATLAS sky position chart">
        <Scatter data={chartData} options={options} />
      </div>

      {/* Information Panel */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Position Info */}
          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              Current Sky Position
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-tertiary)]">Right Ascension:</span>
                <span className="text-[var(--color-chart-primary)] font-mono">
                  {formatRA(currentPosition.ra)} ({formatRAAxis(currentPosition.ra)})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-tertiary)]">Declination:</span>
                <span className="text-[var(--color-chart-primary)] font-mono">
                  {formatDEC(currentPosition.dec)}
                </span>
              </div>
              {currentPosition.source && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-tertiary)]">Source:</span>
                  <span className="text-[var(--color-text-secondary)] text-xs">
                    {currentPosition.source}
                  </span>
                </div>
              )}
              {currentPosition.timestamp && (
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-tertiary)]">Updated:</span>
                  <span className="text-[var(--color-text-secondary)] text-xs">
                    {new Date(currentPosition.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'UTC',
                      hour12: false
                    })} UTC
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Coordinate System Explanation */}
          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              Celestial Coordinates
            </h4>
            <div className="space-y-1 text-xs text-[var(--color-text-tertiary)]">
              <p>
                <strong className="text-[var(--color-text-secondary)]">RA (Right Ascension):</strong> East-west position in the sky, measured in degrees (0-360°) or hours (0-24h). Like celestial longitude.
              </p>
              <p>
                <strong className="text-[var(--color-text-secondary)]">DEC (Declination):</strong> North-south position, measured in degrees (-90° to +90°). Like celestial latitude.
              </p>
              <p className="text-[10px] italic pt-1">
                The horizontal dashed line at DEC = 0° marks the celestial equator. Positive DEC = Northern sky, Negative DEC = Southern sky.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Notes */}
        <div className="mt-3 text-xs text-[var(--color-text-tertiary)] space-y-1">
          <p>• Star icon shows current position • Historical path shows comet&apos;s motion across the sky</p>
          <p>• Coordinates update from {currentPosition.source || 'multiple sources'} with ~15 minute refresh</p>
          {historicalPositions.length > 0 && (
            <p>• Dashed line shows {historicalPositions.length} historical positions tracked over time</p>
          )}
        </div>
      </div>
    </div>
  );
}
