/**
 * Universal chart hook for consistent configuration across all 3I/ATLAS charts
 * Provides standardized scales, date ranges, perihelion markers, and styling
 */

import { ChartOptions } from 'chart.js';
import { ANALYTICS_DATE_CONFIG } from '../utils/analytics-config';

// Standard chart configuration interface
interface StandardChartConfig {
  title?: string;
  yAxisLabel?: string;
  yAxisUnit?: string;
  reverseY?: boolean;
  showPerihelion?: boolean;
  perihelionYRange?: [number, number];
  secondaryYAxis?: {
    label: string;
    unit?: string;
    min?: number;
    max?: number;
  };
}

// Standard color palette
export const CHART_COLORS = {
  primary: '#3b82f6',      // Blue
  secondary: '#10b981',    // Green
  accent: '#f59e0b',       // Orange
  danger: '#ef4444',       // Red
  purple: '#8b5cf6',       // Purple
  gray: '#6b7280',         // Gray
  perihelion: '#ef4444',   // Red for perihelion markers
  background: {
    primary: 'rgba(59, 130, 246, 0.1)',
    secondary: 'rgba(16, 185, 129, 0.1)',
    accent: 'rgba(245, 158, 11, 0.1)',
    danger: 'rgba(239, 68, 68, 0.1)',
    purple: 'rgba(139, 92, 246, 0.1)',
  }
};

/**
 * Create standardized chart configuration
 */
export function useStandardizedChart(config: StandardChartConfig) {

  // Standard time scale configuration
  const getTimeScale = () => ({
    type: 'time' as const,
    time: {
      displayFormats: {
        day: 'MMM dd',
        week: 'MMM dd',
        month: 'MMM yyyy'
      }
    },
    min: ANALYTICS_DATE_CONFIG.START_DATE,
    max: ANALYTICS_DATE_CONFIG.END_DATE,
    title: {
      display: true,
      text: 'Date (2025)',
      color: '#9ca3af'
    },
    grid: {
      color: 'rgba(156, 163, 175, 0.2)'
    },
    ticks: {
      color: '#9ca3af'
    }
  });

  // Standard Y-axis configuration
  const getYScale = (reverse = false) => ({
    type: 'linear' as const,
    display: true,
    position: 'left' as const,
    title: {
      display: true,
      text: config.yAxisLabel || 'Value',
      color: '#9ca3af'
    },
    grid: {
      color: 'rgba(156, 163, 175, 0.2)'
    },
    ticks: {
      color: '#9ca3af',
      callback: function(value: string | number) {
        const unit = config.yAxisUnit || '';
        return `${value}${unit}`;
      }
    },
    reverse: reverse
  });

  // Secondary Y-axis configuration
  const getSecondaryYScale = () => config.secondaryYAxis ? {
    type: 'linear' as const,
    display: true,
    position: 'right' as const,
    title: {
      display: true,
      text: config.secondaryYAxis.label,
      color: '#9ca3af'
    },
    grid: {
      drawOnChartArea: false,
    },
    ticks: {
      color: '#9ca3af',
      callback: function(value: string | number) {
        const unit = config.secondaryYAxis?.unit || '';
        return `${value}${unit}`;
      }
    },
    min: config.secondaryYAxis.min,
    max: config.secondaryYAxis.max,
  } : {};

  // Standard perihelion marker
  const getPerihelionMarker = (yMin?: number, yMax?: number) => {
    if (!config.showPerihelion) return null;

    const [defaultMin, defaultMax] = config.perihelionYRange || [0, 100];

    return {
      label: '🎯 Perihelion (Oct 30, 2025)',
      data: [
        { x: new Date(ANALYTICS_DATE_CONFIG.PERIHELION_DATE).getTime(), y: yMin ?? defaultMin },
        { x: new Date(ANALYTICS_DATE_CONFIG.PERIHELION_DATE).getTime(), y: yMax ?? defaultMax }
      ],
      borderColor: CHART_COLORS.perihelion,
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [10, 5],
      pointRadius: 0,
      fill: false,
      tension: 0,
      showLine: true,
    };
  };

  // Standard chart options
  const getStandardOptions = (): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb',
          font: { size: 12 },
          filter: (item) => {
            return item.text && item.text !== 'undefined' && item.text !== '';
          },
        },
      },
      title: {
        display: !!config.title,
        text: config.title,
        color: '#ffffff',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: CHART_COLORS.primary,
        borderWidth: 1,
      },
    },
    scales: {
      x: getTimeScale(),
      y: getYScale(config.reverseY),
      ...(config.secondaryYAxis && { y1: getSecondaryYScale() })
    },
  });

  // Filter data to standard date range
  const filterToDateRange = <T extends { date: string | Date }>(data: T[]): T[] => {
    const startTime = new Date(ANALYTICS_DATE_CONFIG.START_DATE).getTime();
    const endTime = new Date(ANALYTICS_DATE_CONFIG.END_DATE).getTime();

    return data.filter(point => {
      const pointTime = new Date(point.date).getTime();
      return pointTime >= startTime && pointTime <= endTime;
    });
  };

  // Generate extended data to fill the full date range
  const extendToDateRange = <T extends { date: string | Date }>(
    data: T[],
    fillValue: Partial<T> = {}
  ): T[] => {
    if (!data.length) return data;

    const startDate = new Date(ANALYTICS_DATE_CONFIG.START_DATE);
    const endDate = new Date(ANALYTICS_DATE_CONFIG.END_DATE);

    // Find data boundaries
    const dataTimes = data.map(d => new Date(d.date).getTime());
    const dataStart = Math.min(...dataTimes);
    const dataEnd = Math.max(...dataTimes);

    const extendedData = [...data];

    // Add points at the beginning if needed
    if (dataStart > startDate.getTime()) {
      extendedData.unshift({
        ...fillValue,
        date: startDate.toISOString()
      } as T);
    }

    // Add points at the end if needed
    if (dataEnd < endDate.getTime()) {
      extendedData.push({
        ...fillValue,
        date: endDate.toISOString()
      } as T);
    }

    return extendedData;
  };

  return {
    colors: CHART_COLORS,
    getStandardOptions,
    getPerihelionMarker,
    filterToDateRange,
    extendToDateRange,
    getTimeScale,
    getYScale,
    getSecondaryYScale
  };
}

export default useStandardizedChart;