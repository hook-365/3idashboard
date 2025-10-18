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
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import { ExtensionSafeChartContainer } from '../ExtensionSafeComponents';
import { ANALYTICS_DATE_CONFIG } from '@/utils/analytics-config';
import { createPerihelionAnnotation } from '@/utils/chart-annotations';
import { getTextColors, getBackgroundColors, getBorderColors, getChartColors, getStatusColors, getActivityLevelColor, hexToRgba } from '@/utils/chart-theme';

// Flag to track Chart.js registration
let chartJsRegistered = false;

export interface ActivityDataPoint {
  date: string | Date;
  activityIndex: number; // 0-100 scale
  comaContribution: number; // 0-100 contribution from coma size
  brightnessContribution: number; // 0-100 contribution from brightness change
  confidence: number; // 0-1 confidence level
  comaSize?: number; // Original coma size in arcminutes
  brightnessVelocity?: number; // Magnitude change per day
  heliocentrieDistance?: number; // Distance from sun if available
  correlation: number; // Correlation between coma and brightness (-1 to 1)
}

// Keep backwards compatibility
export type ActivityIndexDataPoint = ActivityDataPoint;

export interface ActivityLevel {
  level: 'low' | 'moderate' | 'high' | 'extreme';
  threshold: number;
  description: string;
  color: string;
}

export interface ActivityPeriod {
  startDate: string;
  endDate: string;
  peakDate: string;
  peakActivityIndex: number;
  averageActivityIndex: number;
  level: ActivityLevel['level'];
  duration: number; // days
  comaGrowthRate: number; // arcminutes per day
  brightnessChangeRate: number; // magnitude change per day
}

interface ActivityLevelChartProps {
  data: ActivityDataPoint[];
  className?: string;
  showComponents?: boolean; // Show coma and brightness contributions
  realTimeUpdates?: boolean;
  onDataPointClick?: (point: ActivityDataPoint) => void;
  enableZoom?: boolean;
  enablePan?: boolean;
  showLegend?: boolean;
  activityLevels?: ActivityLevel[];
  peakPeriods?: ActivityPeriod[];
}

const getDefaultActivityLevels = (): ActivityLevel[] => {
  const chartColors = getChartColors();

  return [
    {
      level: 'low',
      threshold: 25,
      description: 'Minimal cometary activity - stable coma and brightness',
      color: chartColors.secondary // Green
    },
    {
      level: 'moderate',
      threshold: 50,
      description: 'Moderate activity - noticeable coma growth or brightness changes',
      color: chartColors.quinary // Yellow
    },
    {
      level: 'high',
      threshold: 75,
      description: 'High activity - rapid coma expansion and significant brightening',
      color: chartColors.tertiary // Red
    },
    {
      level: 'extreme',
      threshold: 100,
      description: 'Extreme activity - dramatic outbursts and rapid evolution',
      color: chartColors.quaternary // Purple
    }
  ];
};

const ActivityLevelChart = memo(function ActivityLevelChart({
  data,
  className = '',
  showComponents = false,
  realTimeUpdates = false,
  onDataPointClick,
  enableZoom = true,
  showLegend = true,
  activityLevels = getDefaultActivityLevels(),
}: ActivityLevelChartProps) {
  const chartColors = getChartColors();
  const statusColors = getStatusColors();
  const textColors = getTextColors();
  const bgColors = getBackgroundColors();
  const borderColors = getBorderColors();
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [isAnimating, setIsAnimating] = useState(false);

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
        TimeScale,
        Filler,
        annotationPlugin
      );
      chartJsRegistered = true;
    }
  }, []);

  // Get activity level for a given index value
  const getActivityLevel = (activityIndex: number): ActivityLevel => {
    if (activityIndex >= 75) return activityLevels.find(l => l.level === 'extreme') || activityLevels[3];
    if (activityIndex >= 50) return activityLevels.find(l => l.level === 'high') || activityLevels[2];
    if (activityIndex >= 25) return activityLevels.find(l => l.level === 'moderate') || activityLevels[1];
    return activityLevels.find(l => l.level === 'low') || activityLevels[0];
  };

  // Calculate statistics - Memoized to prevent recalculation
  const stats = useMemo(() => ({
    current: data.length > 0 ? data[data.length - 1].activityIndex : 0,
    average: data.length > 0 ? data.reduce((sum, d) => sum + d.activityIndex, 0) / data.length : 0,
    peak: data.length > 0 ? Math.max(...data.map(d => d.activityIndex)) : 0,
    peakDate: data.length > 0 ? data.find(d => d.activityIndex === Math.max(...data.map(p => p.activityIndex)))?.date : null,
    trend: data.length >= 2 ?
      (data[data.length - 1].activityIndex > data[0].activityIndex ? 'increasing' :
       data[data.length - 1].activityIndex < data[0].activityIndex ? 'decreasing' : 'stable') : 'stable'
  }), [data]);

  const currentLevel = useMemo(() => {
    const current = stats.current;
    if (current >= 75) return activityLevels.find(l => l.level === 'extreme') || activityLevels[3];
    if (current >= 50) return activityLevels.find(l => l.level === 'high') || activityLevels[2];
    if (current >= 25) return activityLevels.find(l => l.level === 'moderate') || activityLevels[1];
    return activityLevels.find(l => l.level === 'low') || activityLevels[0];
  }, [stats, activityLevels]);

  const peakLevel = useMemo(() => {
    const peak = stats.peak;
    if (peak >= 75) return activityLevels.find(l => l.level === 'extreme') || activityLevels[3];
    if (peak >= 50) return activityLevels.find(l => l.level === 'high') || activityLevels[2];
    if (peak >= 25) return activityLevels.find(l => l.level === 'moderate') || activityLevels[1];
    return activityLevels.find(l => l.level === 'low') || activityLevels[0];
  }, [stats, activityLevels]);

  // Prepare chart data - Memoized to prevent recalculation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartData: any = useMemo(() => {
    const getPointActivityLevel = (activityIndex: number): ActivityLevel => {
      if (activityIndex >= 75) return activityLevels.find(l => l.level === 'extreme') || activityLevels[3];
      if (activityIndex >= 50) return activityLevels.find(l => l.level === 'high') || activityLevels[2];
      if (activityIndex >= 25) return activityLevels.find(l => l.level === 'moderate') || activityLevels[1];
      return activityLevels.find(l => l.level === 'low') || activityLevels[0];
    };

    return {
    labels: data.map(point => point.date),
    datasets: [
      {
        label: 'Activity Index',
        data: data.map(point => ({
          x: point.date,
          y: point.activityIndex,
        })),
        backgroundColor: hexToRgba(chartColors.quaternary, 0.1),
        borderColor: chartColors.quaternary,
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: data.map(point => getPointActivityLevel(point.activityIndex).color),
        pointBorderColor: textColors.primary,
        pointBorderWidth: 2,
        yAxisID: 'y'
      },
      ...(showComponents ? [
        {
          label: 'Coma Contribution',
          data: data.map(point => ({
            x: point.date,
            y: point.comaContribution,
          })),
          backgroundColor: hexToRgba(chartColors.secondary, 0.1),
          borderColor: chartColors.secondary,
          fill: false,
          tension: 0.2,
          pointRadius: 2,
          pointHoverRadius: 5,
          yAxisID: 'y1'
        },
        {
          label: 'Brightness Contribution',
          data: data.map(point => ({
            x: point.date,
            y: point.brightnessContribution,
          })),
          backgroundColor: hexToRgba(chartColors.tertiary, 0.1),
          borderColor: chartColors.tertiary,
          fill: false,
          tension: 0.2,
          pointRadius: 2,
          pointHoverRadius: 5,
          yAxisID: 'y1'
        },
        {
          label: 'Confidence',
          data: data.map(point => ({
            x: point.date,
            y: point.confidence * 100, // Convert to 0-100 scale
          })),
          backgroundColor: hexToRgba(textColors.tertiary, 0.1),
          borderColor: textColors.tertiary,
          fill: false,
          tension: 0.1,
          pointRadius: 1,
          pointHoverRadius: 3,
          yAxisID: 'y1'
        }
      ] : [])
    ],
  };
  }, [data, showComponents, activityLevels, chartColors, textColors]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isAnimating ? 0 : 300,
      easing: 'easeInOutQuart',
    },
    elements: {
      point: {
        radius: typeof window !== 'undefined' && window.innerWidth < 768 ? 5 : 4,
        hitRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 8,
        hoverRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 9 : 8,
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Combined Activity Index',
        color: textColors.heading,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      legend: {
        display: showLegend,
        labels: {
          color: textColors.secondary,
          font: {
            size: 12
          },
          filter: function(item) {
            return item.text !== undefined;
          },
        },
      },
      tooltip: {
        backgroundColor: bgColors.tertiary,
        titleColor: textColors.primary,
        bodyColor: textColors.secondary,
        borderColor: borderColors.secondary,
        borderWidth: 1,
        callbacks: {
          title: function(context) {
            const point = data[context[0].dataIndex];
            const date = new Date(point.date);
            return `${date.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}`;
          },
          label: function(context) {
            const point = data[context.dataIndex];
            const level = getActivityLevel(point.activityIndex);

            if (context.dataset.label === 'Activity Index') {
              return [
                `Activity Index: ${point.activityIndex.toFixed(1)}`,
                `Level: ${level.level.toUpperCase()} (${level.description})`,
                `Confidence: ${(point.confidence * 100).toFixed(1)}%`,
                `Correlation: ${point.correlation.toFixed(3)}`
              ];
            }
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`;
          },
        },
      },
      annotation: {
        annotations: {
          perihelion: createPerihelionAnnotation(),
          currentTime: {
            type: 'line',
            xMin: new Date().toISOString(),
            xMax: new Date().toISOString(),
            borderColor: statusColors.success,
            borderWidth: 2,
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
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy',
          },
        },
        ticks: {
          color: textColors.tertiary,
          maxTicksLimit: 8,
        },
        grid: {
          color: borderColors.primary,
        },
        min: ANALYTICS_DATE_CONFIG.START_DATE,
        max: ANALYTICS_DATE_CONFIG.END_DATE
      },
      y: {
        position: 'left',
        title: {
          display: true,
          text: 'Activity Index (0-100)',
          color: textColors.secondary,
        },
        min: 0,
        max: 100,
        ticks: {
          color: textColors.tertiary,
          callback: function(value) {
            return value + '';
          },
        },
        grid: {
          color: borderColors.primary,
        },
      },
      ...(showComponents ? {
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Component Contributions (%)',
            color: textColors.secondary,
          },
          min: 0,
          max: 100,
          ticks: {
            color: textColors.tertiary,
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      } : {})
    },
    interaction: {
      intersect: false,
      mode: 'nearest',
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onDataPointClick) {
        const element = elements[0];
        const dataIndex = element.index;
        const clickedPoint = data[dataIndex];
        onDataPointClick(clickedPoint);
      }
    },
    ...(enableZoom ? {
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: 'x' as const,
          },
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: 'x' as const,
          },
        },
      },
    } : {}),
  };

  // Real-time updates
  useEffect(() => {
    if (realTimeUpdates && chartRef.current) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 100);
    }
  }, [data, realTimeUpdates]);

  if (data.length === 0) {
    return (
      <ExtensionSafeChartContainer className={`bg-[var(--color-bg-secondary)] rounded-lg p-6 ${className}`}>
        <div className="text-center text-[var(--color-text-tertiary)]">
          <div className="text-xl mb-2">📊</div>
          <div>No Activity Data Available</div>
          <div className="text-sm mt-1">Waiting for coma and brightness correlation data</div>
        </div>
      </ExtensionSafeChartContainer>
    );
  }

  return (
    <ExtensionSafeChartContainer className={`bg-[var(--color-bg-secondary)] rounded-lg p-6 space-y-4 ${className}`}>
      {/* Activity level indicators */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {activityLevels.map((level) => (
          <div
            key={level.level}
            className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${level.color}20`,
              color: level.color,
              border: `1px solid ${level.color}40`
            }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: level.color }}
            />
            {level.level.toUpperCase()} ({level.threshold}+)
          </div>
        ))}
      </div>

      {/* Current status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
          <div className="text-sm text-[var(--color-text-tertiary)]">Current Activity</div>
          <div className="text-xl font-bold" style={{ color: currentLevel.color }}>
            {stats.current.toFixed(1)}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{currentLevel.level.toUpperCase()}</div>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
          <div className="text-sm text-[var(--color-text-tertiary)]">Average</div>
          <div className="text-xl font-bold text-[var(--color-status-info)]">
            {stats.average.toFixed(1)}
          </div>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
          <div className="text-sm text-[var(--color-text-tertiary)]">Peak Activity</div>
          <div className="text-xl font-bold" style={{ color: peakLevel.color }}>
            {stats.peak.toFixed(1)}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{peakLevel.level.toUpperCase()}</div>
        </div>
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 text-center">
          <div className="text-sm text-[var(--color-text-tertiary)]">Trend</div>
          <div className={`text-xl font-bold ${
            stats.trend === 'increasing' ? 'text-[var(--color-status-success)]' :
            stats.trend === 'decreasing' ? 'text-[var(--color-status-error)]' : 'text-[var(--color-status-warning)]'
          }`}>
            {stats.trend === 'increasing' ? '↗' : stats.trend === 'decreasing' ? '↘' : '→'}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] capitalize">{stats.trend}</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '400px' }} aria-label="Combined activity index chart showing coma and brightness activity levels">
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
        />
      </div>

      {/* Real-time indicator */}
      {realTimeUpdates && (
        <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-tertiary)]">
          <div className="w-2 h-2 bg-[var(--color-status-success)] rounded-full animate-pulse"></div>
          Real-time activity monitoring active
        </div>
      )}
    </ExtensionSafeChartContainer>
  );
});

export default ActivityLevelChart;