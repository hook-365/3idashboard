/**
 * Chart Theme Utilities
 * Provides theme-aware color and style utilities for Chart.js components
 */

import { ThemeMode } from '@/styles/themes';

/**
 * Get CSS variable value from document root
 */
export function getCSSVariable(variable: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

/**
 * Get chart colors based on current theme
 */
export function getChartColors() {
  return {
    primary: getCSSVariable('--color-chart-primary') || '#3b82f6',
    secondary: getCSSVariable('--color-chart-secondary') || '#10b981',
    tertiary: getCSSVariable('--color-chart-tertiary') || '#ef4444',
    quaternary: getCSSVariable('--color-chart-quaternary') || '#a855f7',
    quinary: getCSSVariable('--color-chart-quinary') || '#f59e0b',
    senary: getCSSVariable('--color-chart-senary') || '#06b6d4',
    perihelion: getCSSVariable('--color-chart-perihelion') || '#ef4444',
    blackout: getCSSVariable('--color-chart-blackout') || 'rgba(239, 68, 68, 0.15)',
  };
}

/**
 * Get text colors based on current theme
 */
export function getTextColors() {
  return {
    primary: getCSSVariable('--color-text-primary') || '#ededed',
    secondary: getCSSVariable('--color-text-secondary') || '#e5e7eb',
    tertiary: getCSSVariable('--color-text-tertiary') || '#9ca3af',
    heading: getCSSVariable('--color-text-heading') || '#f9fafb',
  };
}

/**
 * Get background colors based on current theme
 */
export function getBackgroundColors() {
  return {
    primary: getCSSVariable('--color-bg-primary') || '#0a0a0a',
    secondary: getCSSVariable('--color-bg-secondary') || '#1f2937',
    tertiary: getCSSVariable('--color-bg-tertiary') || '#374151',
  };
}

/**
 * Get border colors based on current theme
 */
export function getBorderColors() {
  return {
    primary: getCSSVariable('--color-border-primary') || '#374151',
    secondary: getCSSVariable('--color-border-secondary') || '#6b7280',
  };
}

/**
 * Get point style based on theme and index
 * For high-contrast mode, use different shapes for accessibility
 */
export function getChartPointStyle(index: number): string {
  const themeMode = document.documentElement.getAttribute('data-theme') as ThemeMode;

  if (themeMode === 'high-contrast') {
    const styles = ['circle', 'triangle', 'rect', 'rectRot', 'star', 'cross'];
    return styles[index % styles.length];
  }

  return 'circle';
}

/**
 * Get line width based on theme
 * High-contrast mode uses thicker lines
 */
export function getChartLineWidth(): number {
  const themeMode = document.documentElement.getAttribute('data-theme') as ThemeMode;
  return themeMode === 'high-contrast' ? 3 : 2;
}

/**
 * Get point radius based on theme
 * High-contrast mode uses larger points
 */
export function getChartPointRadius(): number {
  const themeMode = document.documentElement.getAttribute('data-theme') as ThemeMode;
  return themeMode === 'high-contrast' ? 6 : 5;
}

/**
 * Get filter-specific color with theme awareness
 */
export function getFilterColor(filterType: string, alpha = 1): string {
  const chartColors = getChartColors();

  const filterColorMap: Record<string, string> = {
    'Visual': chartColors.primary,
    'CCD': chartColors.secondary,
    'R (Red)': chartColors.tertiary,
    'V (Johnson)': chartColors.quaternary,
    'B (Blue)': chartColors.primary,
    'z (Sloan)': chartColors.quinary,
    'K (Infrared)': chartColors.tertiary,
    'Unfiltered': chartColors.quaternary,
    'I (Infrared)': chartColors.tertiary,
    'g (Green)': chartColors.secondary,
    'Uncertain': getCSSVariable('--color-text-tertiary') || '#9ca3af',
    'Unknown': getCSSVariable('--color-text-tertiary') || '#6b7280',
  };

  const baseColor = filterColorMap[filterType] || getCSSVariable('--color-text-tertiary') || '#6b7280';

  // If alpha is 1, return the color as-is
  if (alpha === 1) return baseColor;

  // Convert hex to rgba
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get status colors based on current theme
 */
export function getStatusColors() {
  return {
    success: getCSSVariable('--color-status-success') || '#10b981',
    warning: getCSSVariable('--color-status-warning') || '#f59e0b',
    error: getCSSVariable('--color-status-error') || '#ef4444',
    info: getCSSVariable('--color-status-info') || '#3b82f6',
  };
}

/**
 * Get activity level color based on theme
 */
export function getActivityLevelColor(level: 'low' | 'moderate' | 'high' | 'extreme'): string {
  const chartColors = getChartColors();

  const levelColorMap: Record<string, string> = {
    'low': chartColors.secondary,
    'moderate': chartColors.quinary,
    'high': chartColors.tertiary,
    'extreme': chartColors.quaternary,
  };

  return levelColorMap[level] || chartColors.primary;
}

/**
 * Get trend color based on direction
 */
export function getTrendColor(trend: string): string {
  const statusColors = getStatusColors();

  switch (trend.toLowerCase()) {
    case 'brightening':
    case 'accelerating':
    case 'increasing':
      return statusColors.success;
    case 'dimming':
    case 'decelerating':
    case 'decreasing':
      return statusColors.error;
    case 'stable':
      return statusColors.info;
    default:
      return statusColors.warning;
  }
}

/**
 * Convert hex color to rgba with alpha
 */
export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
