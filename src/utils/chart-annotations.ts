/**
 * Chart.js Annotation Plugin Utilities
 * Provides standardized annotation helpers for perihelion markers and Earth blackout periods
 */

import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { ANALYTICS_DATE_CONFIG } from './analytics-config';
import { getCSSVariable } from './chart-theme';

/**
 * Creates a vertical line annotation for perihelion (Oct 30, 2025)
 * Uses SOLID red line to distinguish from dashed Earth blackout borders
 *
 * @returns Chart.js annotation configuration for perihelion vertical line
 *
 * @example
 * ```typescript
 * const options: ChartOptions<'line'> = {
 *   plugins: {
 *     annotation: {
 *       annotations: {
 *         perihelion: createPerihelionAnnotation()
 *       }
 *     }
 *   }
 * };
 * ```
 */
export function createPerihelionAnnotation(): AnnotationOptions<'line'> {
  // Resolve CSS variables for Chart.js canvas rendering
  const perihelionColor = getCSSVariable('--color-chart-perihelion') || '#ef4444';

  return {
    type: 'line',
    xMin: ANALYTICS_DATE_CONFIG.PERIHELION_DATE,
    xMax: ANALYTICS_DATE_CONFIG.PERIHELION_DATE,
    borderColor: perihelionColor,
    borderWidth: 3, // Increased from 2 for better visibility
    label: {
      display: true,
      content: 'Perihelion',
      position: 'start',
      backgroundColor: perihelionColor,
      color: '#ffffff', // Force white text for maximum contrast
      font: {
        size: 11,
        weight: 'bold'
      },
      padding: 4
    }
  };
}

/**
 * Creates a box annotation for Earth visibility blackout period
 * Uses subtle gray filled region behind other chart elements
 *
 * @param startDate - Start date of blackout period (ISO string or timestamp)
 * @param endDate - End date of blackout period (ISO string or timestamp)
 * @returns Chart.js annotation configuration for Earth visibility blackout region
 *
 * @example
 * ```typescript
 * const options: ChartOptions<'line'> = {
 *   plugins: {
 *     annotation: {
 *       annotations: {
 *         blackout: createEarthBlackoutAnnotation(
 *           '2025-10-01T00:00:00Z',
 *           '2025-11-09T00:00:00Z'
 *         )
 *       }
 *     }
 *   }
 * };
 * ```
 */
export function createEarthBlackoutAnnotation(
  startDate: string | number,
  endDate: string | number
): AnnotationOptions<'box'> {
  // Resolve CSS variables for Chart.js canvas rendering
  const blackoutBg = getCSSVariable('--color-chart-blackout') || 'rgba(100, 100, 100, 0.1)';
  const borderColor = getCSSVariable('--color-border-primary') || '#475569';
  const labelBg = getCSSVariable('--color-bg-secondary') || '#2a1f3d';

  return {
    type: 'box',
    xMin: startDate,
    xMax: endDate,
    backgroundColor: blackoutBg,
    borderColor: borderColor,
    borderWidth: 1,
    drawTime: 'beforeDatasetsDraw', // Draw BEHIND datasets and other annotations
    label: {
      display: true,
      content: 'Not Visible from Earth',
      position: 'center',
      backgroundColor: labelBg,
      color: '#ffffff', // Force white text for maximum contrast (like perihelion)
      font: {
        size: 11,
        weight: 'bold'
      },
      padding: 4
    }
  };
}

/**
 * Creates annotations object with both perihelion and blackout
 * Convenience function for charts that need both annotations
 *
 * @param blackoutStart - Start date of Earth blackout period (ISO string or timestamp)
 * @param blackoutEnd - End date of Earth blackout period (ISO string or timestamp)
 * @returns Object with both annotation configurations
 *
 * @example
 * ```typescript
 * const options: ChartOptions<'line'> = {
 *   plugins: {
 *     annotation: {
 *       annotations: createStandardAnnotations(
 *         '2025-10-01T00:00:00Z',
 *         '2025-11-09T00:00:00Z'
 *       )
 *     }
 *   }
 * };
 * ```
 */
export function createStandardAnnotations(
  blackoutStart: string | number,
  blackoutEnd: string | number
) {
  return {
    perihelion: createPerihelionAnnotation(),
    earthBlackout: createEarthBlackoutAnnotation(blackoutStart, blackoutEnd)
  };
}
