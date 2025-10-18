'use client';

import { useRef, useEffect, useState, useMemo, memo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import { ExtensionSafeChartContainer } from '../ExtensionSafeComponents';
import {
  getTextColors,
  getBorderColors,
  getFilterColor,
  getChartPointStyle,
  getChartPointRadius,
  getBackgroundColors,
  getStatusColors,
  hexToRgba
} from '@/utils/chart-theme';
import { createStandardAnnotations } from '@/utils/chart-annotations';

// Register Chart.js components immediately at module load
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin,
  annotationPlugin
);

export interface LightCurveDataPoint {
  date: string | Date;
  magnitude: number;
  source?: string;
  observer?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  filter?: string; // Visual, CCD, R, V, etc.
  uncertainty?: number;
}

interface LightCurveProps {
  data: LightCurveDataPoint[];
  className?: string;
  realTimeUpdates?: boolean;
  onDataPointClick?: (point: LightCurveDataPoint) => void;
  enableZoom?: boolean;
}

const LightCurve = memo(function LightCurve({
  data,
  className = '',
  realTimeUpdates = false,
  onDataPointClick,
  enableZoom = true
}: LightCurveProps) {
  console.log('LightCurve component rendered with:', {
    dataLength: data.length,
    enableZoom
  });

  const chartRef = useRef<ChartJS<'line'>>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  // Group data by filter type (Visual, CCD, etc.) to match COBS plot style
  // Memoize to prevent recalculation on every render
  const processedData = useMemo(() => groupDataByFilter(data), [data]);

  // Earth visibility blackout period (memoized to avoid recalculation)
  const blackoutStart = useMemo(() => new Date('2025-10-01T00:00:00Z').getTime(), []);
  const blackoutEnd = useMemo(() => new Date('2025-11-09T00:00:00Z').getTime(), []);

  const chartData: ChartData<'line'> = useMemo(() => {
    const pointRadius = getChartPointRadius();

    return {
      datasets: [
        ...processedData.map((group, index) => ({
          label: group.filterType,
          data: group.data.map(point => ({
            x: new Date(point.date).getTime(),
            y: point.magnitude, // Use raw magnitude values
            pointData: point, // Store reference to original data
          })),
          borderColor: getFilterColor(group.filterType),
          backgroundColor: getFilterColor(group.filterType),
          borderWidth: 0, // No connecting lines
          pointRadius: pointRadius,
          pointHoverRadius: pointRadius + 2,
          pointStyle: getChartPointStyle(index),
          showLine: false, // Disable connecting lines - scatter plot style
          fill: false,
          animation: realTimeUpdates ? {
            duration: 300,
            easing: 'easeInOutQuart' as const
          } : {
            duration: 300
          },
        })),
      ],
    };
  }, [processedData, realTimeUpdates]);

  const options: ChartOptions<'line'> = useMemo(() => {
    const textColors = getTextColors();
    const bgColors = getBackgroundColors();
    const borderColors = getBorderColors();
    const statusColors = getStatusColors();
    const pointRadius = getChartPointRadius();

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300
      },
      interaction: {
        intersect: false,
        mode: 'nearest',
      },
      elements: {
        point: {
          radius: typeof window !== 'undefined' && window.innerWidth < 768 ? pointRadius + 1 : pointRadius,
          hitRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 7,
          hoverRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? pointRadius + 3 : pointRadius + 2,
        },
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: textColors.secondary,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: true,
          text: '3I/ATLAS Brightness Observations',
          color: textColors.heading,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        tooltip: {
          backgroundColor: bgColors.tertiary,
          titleColor: textColors.primary,
          bodyColor: textColors.secondary,
          borderColor: borderColors.secondary,
          borderWidth: 1,
          callbacks: {
            title: (context) => {
              const date = new Date(context[0].parsed.x);
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            },
            label: (context) => {
              const rawData = context.raw as { x: number; y: number; pointData?: LightCurveDataPoint };
              const point = rawData?.pointData;
              const lines = [`Magnitude: ${context.parsed.y.toFixed(2)}`];
              if (point?.observer) {
                lines.push(`Observer: ${point.observer}`);
              }
              if (point?.quality) {
                lines.push(`Quality: ${point.quality}`);
              }
              if (point?.source) {
                lines.push(`Source: ${point.source}`);
              }
              return lines;
            },
          },
        },
        annotation: {
          annotations: {
            ...createStandardAnnotations(blackoutStart, blackoutEnd),
            // Add current position marker
            currentPosition: {
              type: 'line',
              xMin: Date.now(),
              xMax: Date.now(),
              borderColor: hexToRgba(statusColors.success, 0.8),
              borderWidth: 3,
              borderDash: [8, 4],
              label: {
                display: true,
                content: 'NOW',
                position: 'start',
                backgroundColor: hexToRgba(statusColors.success, 0.9),
                color: textColors.primary,
                font: {
                  size: 12,
                  weight: 'bold'
                },
                padding: 6,
                yAdjust: -10
              }
            }
          }
        },
        zoom: enableZoom ? {
          pan: {
            enabled: true,
            mode: 'xy',
            modifierKey: 'shift',
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            pinch: {
              enabled: true,
            },
            mode: 'xy',
          },
          limits: {
            x: {
              min: new Date('2025-06-15').getTime(),
              max: new Date('2025-12-31').getTime(),
            },
            y: {
              min: 11,
              max: 19,
            },
          },
        } : undefined,
      },
      scales: {
        x: {
          type: 'time',
          // Set COBS-style date range (mid-June to December 2025)
          min: new Date('2025-06-15').getTime(),
          max: new Date('2025-12-31').getTime(),
          time: {
            displayFormats: {
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy',
            },
          },
          title: {
            display: true,
            text: 'Date (2025)',
            color: textColors.secondary,
          },
          ticks: {
            color: textColors.tertiary,
          },
          grid: {
            color: borderColors.primary,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Magnitude',
            color: textColors.secondary,
          },
          // COBS-style magnitude scale (19.0 to 11.0, reversed for astronomical convention)
          min: 11,
          max: 19,
          reverse: true, // Brighter objects have lower magnitude numbers
          ticks: {
            color: textColors.tertiary,
            stepSize: 1,
            callback: function(value) {
              return value.toFixed(1);
            },
          },
          grid: {
            color: borderColors.primary,
          },
        },
      },
      onHover: (event, activeElements, chart) => {
        const canvas = chart.canvas;
        canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
      },
      onClick: (event, activeElements, chart) => {
        if (activeElements.length > 0 && onDataPointClick) {
          const datasetIndex = activeElements[0].datasetIndex;
          const index = activeElements[0].index;
          const dataset = chart.data.datasets[datasetIndex];
          const point = dataset.data[index] as { x: number; y: number; pointData?: LightCurveDataPoint };
          if (point?.pointData) {
            onDataPointClick(point.pointData);
          }
        }
      },
    };
  }, [enableZoom, onDataPointClick, blackoutStart, blackoutEnd]);

  // Reset zoom handler
  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  // Real-time update effect
  useEffect(() => {
    if (!realTimeUpdates || !chartRef.current) return;

    const currentTime = Date.now();
    if (currentTime - lastUpdateTime > 1000) { // Throttle updates
      setIsAnimating(true);
      setLastUpdateTime(currentTime);

      setTimeout(() => setIsAnimating(false), 750);

      // Smooth update animation
      chartRef.current.update('active');
    }
  }, [data, realTimeUpdates, lastUpdateTime]);

  return (
    <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-6 ${className}`}>
      {/* Magnitude Scale Reminder - Prominent */}
      <div className="mb-4 p-3 bg-yellow-500/10 border-l-4 border-yellow-500 rounded">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          📊 Magnitude Scale: <span className="text-yellow-600 dark:text-yellow-400">Lower numbers = Brighter comet</span>
        </p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          Scale is logarithmic and reversed (like astronomical tradition). Each whole number represents 2.5x brightness difference.
        </p>
      </div>

      <ExtensionSafeChartContainer className="h-96 relative" aria-label="3I/ATLAS brightness observations light curve">
        <Line ref={chartRef} data={chartData} options={options} />
      </ExtensionSafeChartContainer>
      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 text-sm text-[var(--color-text-tertiary)] space-y-1">
          {enableZoom && (
            <>
              <p>• Scroll to zoom in/out • Shift+drag to pan • Double-click to reset</p>
            </>
          )}
          <p>• Data points: {data.length} observations from global observer network</p>
          <p className="text-[var(--color-text-tertiary)]">• <span className="inline-block w-3 h-3 align-middle mr-1" style={{ backgroundColor: 'var(--color-chart-blackout)', border: '1px solid var(--color-border-primary)' }}></span>Gray shaded area: Not visible from Earth (Oct 1 - Nov 9, 2025)</p>
          {realTimeUpdates && (
            <p className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAnimating ? 'bg-[var(--color-status-success)] animate-pulse' : 'bg-[var(--color-text-tertiary)]'}`}></span>
              Real-time updates {isAnimating ? 'active' : 'enabled'}
            </p>
          )}
          <p>• Red vertical line marks perihelion (October 30, 2025 - closest approach to Sun)</p>
          <p className="text-[var(--color-status-success)]">• <span className="inline-block w-0.5 h-3 bg-[var(--color-status-success)] align-middle mr-1"></span>Green dashed line: Current date</p>
        </div>
        {enableZoom && (
          <button
            onClick={handleResetZoom}
            className="px-4 py-2 bg-[var(--color-interactive-primary)] hover:bg-[var(--color-interactive-primary-hover)] text-white text-sm rounded-md transition-colors"
          >
            Reset Zoom
          </button>
        )}
      </div>
    </div>
  );
});

export default LightCurve;

/**
 * COBS-specific filter utilities
 * Note: These use COBS descriptive names (e.g., "Visual", "CCD") which differ from
 * standard photometric codes in @/constants/observation-filters (e.g., "V", "R", "B")
 */

function groupDataByFilter(data: LightCurveDataPoint[]): Array<{ filterType: string; data: LightCurveDataPoint[] }> {
  const groups = new Map<string, LightCurveDataPoint[]>();

  data.forEach(point => {
    // Standardize filter types to match COBS categories
    let filterType = 'Unknown';
    if (point.filter) {
      const filter = point.filter.toLowerCase();
      if (filter.includes('vis') || filter === 'v' || filter === 'visual') {
        filterType = 'Visual';
      } else if (filter.includes('ccd') || filter === 'c' || filter === 'clear') {
        filterType = 'CCD';
      } else if (filter === 'r' || filter.includes('red')) {
        filterType = 'R (Red)';
      } else if (filter === 'v' || filter.includes('johnson')) {
        filterType = 'V (Johnson)';
      } else if (filter === 'b' || filter.includes('blue')) {
        filterType = 'B (Blue)';
      } else if (filter.includes('uncertain') || filter === '?') {
        filterType = 'Uncertain';
      } else if (filter === 'z' || filter === '&z') {
        filterType = 'z (Sloan)';
      } else if (filter === 'k') {
        filterType = 'K (Infrared)';
      } else if (filter === 'xm' || filter.includes('xm')) {
        filterType = 'Unfiltered';
      } else if (filter === 'i') {
        filterType = 'I (Infrared)';
      } else if (filter === 'g') {
        filterType = 'g (Green)';
      } else {
        filterType = point.filter; // Use original if not recognized
      }
    }

    if (!groups.has(filterType)) {
      groups.set(filterType, []);
    }
    groups.get(filterType)!.push(point);
  });

  return Array.from(groups.entries()).map(([filterType, data]) => ({ filterType, data }));
}

// getFilterColor is now imported from @/utils/chart-theme