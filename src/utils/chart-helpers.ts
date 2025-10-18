/**
 * Shared Chart.js utilities and helpers
 * Consolidates common chart functionality to reduce duplication
 */

import { ANALYTICS_DATE_CONFIG } from './analytics-config';

export interface PerihelionLineOptions {
  yMin: number;
  yMax: number;
  label?: string;
  color?: string;
  yAxisID?: string;
}

/**
 * Creates a standardized perihelion marker line dataset for Chart.js
 * Used across multiple chart components to show Oct 30, 2025 perihelion date
 *
 * @deprecated Use the Chart.js annotation plugin instead via `createPerihelionAnnotation()` from '@/utils/chart-annotations'
 * The annotation plugin provides better performance, theme support, and visual consistency.
 * This function is kept for backward compatibility but will be removed in a future version.
 *
 * @example Migration example:
 * ```typescript
 * // Old approach (deprecated):
 * import { createPerihelionLineDataset } from '@/utils/chart-helpers';
 * const datasets = [myDataset, createPerihelionLineDataset({ yMin, yMax })];
 *
 * // New approach (recommended):
 * import annotationPlugin from 'chartjs-plugin-annotation';
 * import { createPerihelionAnnotation } from '@/utils/chart-annotations';
 * ChartJS.register(annotationPlugin);
 * const options = {
 *   plugins: {
 *     annotation: {
 *       annotations: {
 *         perihelion: createPerihelionAnnotation()
 *       }
 *     }
 *   }
 * };
 * ```
 *
 * @param options Configuration for the perihelion line
 * @returns Chart.js dataset object for the perihelion vertical line
 */
export function createPerihelionLineDataset(options: PerihelionLineOptions) {
  const {
    yMin,
    yMax,
    label = 'Perihelion (Oct 30, 2025)',
    color = '#ef4444',
    yAxisID = 'y'
  } = options;

  return {
    label,
    data: [
      { x: ANALYTICS_DATE_CONFIG.PERIHELION_DATE, y: yMin },
      { x: ANALYTICS_DATE_CONFIG.PERIHELION_DATE, y: yMax }
    ],
    borderColor: color,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderDash: [5, 5] as [number, number],
    pointRadius: 0,
    showLine: true,
    fill: false,
    yAxisID
  };
}

/**
 * Calculate y-axis range with padding for perihelion lines
 * Ensures the perihelion marker spans the full visible chart height
 *
 * @param values Array of y-axis values from the dataset
 * @param paddingPercent Percentage of range to add as padding (default 10%)
 * @returns Object with yMin, yMax, and yPadding values
 */
export function calculateYAxisRange(values: number[], paddingPercent: number = 0.1) {
  if (values.length === 0) {
    return { yMin: 0, yMax: 100, yPadding: 10 };
  }

  const yMin = Math.min(...values);
  const yMax = Math.max(...values);
  const yRange = yMax - yMin;
  const yPadding = yRange * paddingPercent;

  return { yMin, yMax, yPadding };
}