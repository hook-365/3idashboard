'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
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
import { ExtensionSafeChartContainer } from '../ExtensionSafeComponents';
import { ANALYTICS_DATE_CONFIG } from '@/utils/analytics-config';
import { createPerihelionLineDataset, calculateYAxisRange } from '@/utils/chart-helpers';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

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

const DEFAULT_ACTIVITY_LEVELS: ActivityLevel[] = [
  {
    level: 'low',
    threshold: 25,
    description: 'Minimal cometary activity - stable coma and brightness',
    color: '#10b981' // Green
  },
  {
    level: 'moderate',
    threshold: 50,
    description: 'Moderate activity - noticeable coma growth or brightness changes',
    color: '#f59e0b' // Yellow
  },
  {
    level: 'high',
    threshold: 75,
    description: 'High activity - rapid coma expansion and significant brightening',
    color: '#ef4444' // Red
  },
  {
    level: 'extreme',
    threshold: 100,
    description: 'Extreme activity - dramatic outbursts and rapid evolution',
    color: '#8b5cf6' // Purple
  }
];

export default function ActivityLevelChart({
  data,
  className = '',
  showComponents = false,
  realTimeUpdates = false,
  onDataPointClick,
  enableZoom = true,
  showLegend = true,
  activityLevels = DEFAULT_ACTIVITY_LEVELS,
}: ActivityLevelChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [isAnimating, setIsAnimating] = useState(false);

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

  // Calculate y-axis range for perihelion line - Memoized
  const yAxisRange = useMemo(() => {
    const allActivityValues = data.map(point => point.activityIndex);
    return calculateYAxisRange(allActivityValues, 0.1);
  }, [data]);

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
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderColor: '#8b5cf6',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointBackgroundColor: data.map(point => getPointActivityLevel(point.activityIndex).color),
        pointBorderColor: '#ffffff',
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
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderColor: '#10b981',
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
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: '#ef4444',
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
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderColor: '#9ca3af',
          fill: false,
          tension: 0.1,
          pointRadius: 1,
          pointHoverRadius: 3,
          yAxisID: 'y1'
        }
      ] : []),
      // Add perihelion vertical line
      createPerihelionLineDataset({
        yMin: yAxisRange.yMin - yAxisRange.yPadding,
        yMax: yAxisRange.yMax + yAxisRange.yPadding,
        yAxisID: 'y'
      })
    ],
  };
  }, [data, showComponents, yAxisRange, activityLevels]);

  // Chart options
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: isAnimating ? 0 : 750,
      easing: 'easeInOutQuart',
    },
    plugins: {
      title: {
        display: true,
        text: 'Combined Activity Index',
        color: '#ffffff',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      legend: {
        display: showLegend,
        labels: {
          color: '#d1d5db',
          filter: function(item) {
            return item.text !== undefined;
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
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
          color: '#9ca3af',
          maxTicksLimit: 8,
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
        min: ANALYTICS_DATE_CONFIG.START_DATE,
        max: ANALYTICS_DATE_CONFIG.END_DATE
      },
      y: {
        position: 'left',
        title: {
          display: true,
          text: 'Activity Index (0-100)',
          color: '#d1d5db',
        },
        min: 0,
        max: 100,
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return value + '';
          },
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)',
        },
      },
      ...(showComponents ? {
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Component Contributions (%)',
            color: '#d1d5db',
          },
          min: 0,
          max: 100,
          ticks: {
            color: '#9ca3af',
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      } : {})
    },
    interaction: {
      intersect: false,
      mode: 'index',
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
      <ExtensionSafeChartContainer className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-400">
          <div className="text-xl mb-2">📊</div>
          <div>No Activity Data Available</div>
          <div className="text-sm mt-1">Waiting for coma and brightness correlation data</div>
        </div>
      </ExtensionSafeChartContainer>
    );
  }

  return (
    <ExtensionSafeChartContainer className={`bg-gray-800 rounded-lg p-6 space-y-4 ${className}`}>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-400">Current Activity</div>
          <div className="text-xl font-bold" style={{ color: currentLevel.color }}>
            {stats.current.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">{currentLevel.level.toUpperCase()}</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-400">Average</div>
          <div className="text-xl font-bold text-blue-400">
            {stats.average.toFixed(1)}
          </div>
        </div>
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-400">Peak Activity</div>
          <div className="text-xl font-bold" style={{ color: peakLevel.color }}>
            {stats.peak.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">{peakLevel.level.toUpperCase()}</div>
        </div>
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className="text-sm text-gray-400">Trend</div>
          <div className={`text-xl font-bold ${
            stats.trend === 'increasing' ? 'text-green-400' :
            stats.trend === 'decreasing' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {stats.trend === 'increasing' ? '↗' : stats.trend === 'decreasing' ? '↘' : '→'}
          </div>
          <div className="text-xs text-gray-500 capitalize">{stats.trend}</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '400px' }}>
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
        />
      </div>

      {/* Real-time indicator */}
      {realTimeUpdates && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Real-time activity monitoring active
        </div>
      )}
    </ExtensionSafeChartContainer>
  );
}