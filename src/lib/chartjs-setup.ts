/**
 * Global Chart.js Setup
 *
 * Centralized registration of all Chart.js components and plugins.
 * Import this file in any component that uses Chart.js to ensure
 * all plugins are registered exactly once.
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  LogarithmicScale,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

// Global flag to ensure we only register once
let chartJsInitialized = false;

/**
 * Initialize Chart.js with all necessary components and plugins
 */
export function initializeChartJS() {
  if (chartJsInitialized) {
    return; // Already initialized
  }

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    LogarithmicScale,
    Filler,
    annotationPlugin,
    zoomPlugin
  );

  chartJsInitialized = true;
}

// Auto-initialize on import
initializeChartJS();

export { ChartJS };
