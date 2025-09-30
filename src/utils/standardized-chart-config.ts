/**
 * Standardized chart configuration for consistent date ranges and perihelion markers
 * All charts should use these utilities for consistency
 */

import { ChartOptions } from 'chart.js';
import { ANALYTICS_DATE_CONFIG } from './analytics-config';

// Standard date range for all charts
export const STANDARD_CHART_CONFIG = {
  // Date range: July 1, 2025 to December 31, 2025
  START_DATE: ANALYTICS_DATE_CONFIG.START_DATE,
  END_DATE: ANALYTICS_DATE_CONFIG.END_DATE,
  PERIHELION_DATE: ANALYTICS_DATE_CONFIG.PERIHELION_DATE,

  // X-axis configuration for time scale
  timeScale: {
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
  },

  // Standard perihelion marker data points
  getPerihelionMarker: (yMin: number = 8, yMax: number = 20) => ({
    label: '🎯 Perihelion (Oct 30, 2025)',
    data: [
      { x: new Date(ANALYTICS_DATE_CONFIG.PERIHELION_DATE).getTime(), y: yMin },
      { x: new Date(ANALYTICS_DATE_CONFIG.PERIHELION_DATE).getTime(), y: yMax }
    ],
    borderColor: '#ef4444', // Standard red color
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderDash: [10, 5],
    pointRadius: 0,
    fill: false,
    tension: 0,
    showLine: true,
  }),

  // Standard colors for consistency
  colors: {
    primary: '#3b82f6',      // Blue
    secondary: '#10b981',    // Green
    accent: '#f59e0b',       // Orange
    danger: '#ef4444',       // Red (perihelion)
    purple: '#8b5cf6',       // Purple
    gray: '#6b7280',         // Gray
    perihelion: '#ef4444'    // Red for perihelion markers
  }
};

/**
 * Filter data to the standard date range
 * @param data Array of data points with date property
 * @returns Filtered data within standard range
 */
export function filterToStandardDateRange<T extends { date: string | Date }>(data: T[]): T[] {
  const startTime = new Date(STANDARD_CHART_CONFIG.START_DATE).getTime();
  const endTime = new Date(STANDARD_CHART_CONFIG.END_DATE).getTime();

  return data.filter(point => {
    const pointTime = new Date(point.date).getTime();
    return pointTime >= startTime && pointTime <= endTime;
  });
}

/**
 * Ensure data extends to standard date range by adding empty points if needed
 * @param data Array of data points
 * @param fillValue Value to use for missing data points
 * @returns Data extended to full range
 */
export function extendToStandardDateRange<T extends { date: string | Date }>(
  data: T[],
  fillValue: Partial<T> = {}
): T[] {
  if (!data.length) return data;

  const startDate = new Date(STANDARD_CHART_CONFIG.START_DATE);
  const endDate = new Date(STANDARD_CHART_CONFIG.END_DATE);

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
}

/**
 * Creates base Chart.js options with standard styling and configuration
 * Reduces duplication across chart components
 *
 * @param overrides Specific chart options to override defaults
 * @returns Complete ChartOptions object
 */
export function createBaseChartOptions<T extends 'line' | 'scatter' | 'bar'>(
  chartType: T,
  overrides?: Partial<ChartOptions<T>>
): ChartOptions<T> {
  const baseOptions: ChartOptions<T> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#d1d5db',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#d1d5db',
        borderColor: '#374151',
        borderWidth: 1,
        padding: 12,
        displayColors: true
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 8
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        },
        min: ANALYTICS_DATE_CONFIG.START_DATE,
        max: ANALYTICS_DATE_CONFIG.END_DATE
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  } as ChartOptions<T>;

  // Deep merge overrides
  if (overrides) {
    return mergeChartOptions(baseOptions, overrides);
  }

  return baseOptions;
}

/**
 * Deep merge chart options helper
 */
function mergeChartOptions<T extends 'line' | 'scatter' | 'bar'>(
  base: ChartOptions<T>,
  overrides: Partial<ChartOptions<T>>
): ChartOptions<T> {
  return {
    ...base,
    ...overrides,
    plugins: {
      ...base.plugins,
      ...overrides.plugins
    },
    scales: {
      ...base.scales,
      ...overrides.scales
    }
  };
}

export default STANDARD_CHART_CONFIG;