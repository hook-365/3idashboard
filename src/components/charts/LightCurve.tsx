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
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import { ExtensionSafeChartContainer } from '../ExtensionSafeComponents';

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
  zoomPlugin
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

export default function LightCurve({
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

  // Add perihelion vertical line data (updated with COBS-style timing)
  const perihelionDate = new Date('2025-10-29T11:35:31Z').getTime(); // COBS exact timing
  const perihelionMarkerData = useMemo(() => [
    { x: perihelionDate, y: 11 }, // Top of chart
    { x: perihelionDate, y: 19 }  // Bottom of chart
  ], [perihelionDate]);

  const chartData: ChartData<'line'> = useMemo(() => ({
    datasets: [
      ...processedData.map((group) => ({
        label: group.filterType,
        data: group.data.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.magnitude, // Use raw magnitude values
          pointData: point, // Store reference to original data
        })),
        borderColor: getFilterColor(group.filterType),
        backgroundColor: getFilterColor(group.filterType),
        borderWidth: 0, // No connecting lines
        pointRadius: 5,
        pointHoverRadius: 7,
        pointStyle: getFilterPointStyle(group.filterType),
        showLine: false, // Disable connecting lines - scatter plot style
        fill: false,
        animation: realTimeUpdates ? {
          duration: 750,
          easing: 'easeInOutQuart' as const
        } : undefined,
      })),
      // Add perihelion vertical line (COBS-style)
      {
        label: '🎯 Perihelion (Oct 30, 2025)',
        data: perihelionMarkerData,
        borderColor: '#ef4444', // Red vertical line like COBS
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        showLine: true,
        fill: false,
      },
    ],
  }), [processedData, perihelionMarkerData, realTimeUpdates]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'nearest',
    },
    elements: {
      point: {
        radius: typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 5,
        hitRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 7,
        hoverRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 8 : 7,
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e5e7eb',
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: '3I/ATLAS Brightness Observations',
        color: '#e5e7eb',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: '#374151',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        borderColor: '#6b7280',
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
          color: '#e5e7eb',
        },
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: '#374151',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Magnitude',
          color: '#e5e7eb',
        },
        // COBS-style magnitude scale (19.0 to 11.0, reversed for astronomical convention)
        min: 11,
        max: 19,
        reverse: true, // Brighter objects have lower magnitude numbers
        ticks: {
          color: '#9ca3af',
          stepSize: 1,
          callback: function(value) {
            return value.toFixed(1);
          },
        },
        grid: {
          color: '#374151',
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
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <ExtensionSafeChartContainer className="h-96 relative">
        <Line ref={chartRef} data={chartData} options={options} />
      </ExtensionSafeChartContainer>
      <div className="mt-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1 text-sm text-gray-400 space-y-1">
          {enableZoom && (
            <>
              <p>• Scroll to zoom in/out • Shift+drag to pan • Double-click to reset</p>
            </>
          )}
          <p>• Higher values on chart indicate brighter appearance</p>
          <p>• Data points: {data.length} observations</p>
          {realTimeUpdates && (
            <p className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAnimating ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
              Real-time updates {isAnimating ? 'active' : 'enabled'}
            </p>
          )}
          <p>• Red dashed vertical line marks perihelion (October 30, 2025)</p>
        </div>
        {enableZoom && (
          <button
            onClick={handleResetZoom}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            Reset Zoom
          </button>
        )}
      </div>
    </div>
  );
}

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

function getFilterColor(filterType: string, alpha = 1): string {
  const filterColors: Record<string, string> = {
    'Visual': `rgba(59, 130, 246, ${alpha})`, // blue
    'CCD': `rgba(16, 185, 129, ${alpha})`, // green
    'R (Red)': `rgba(239, 68, 68, ${alpha})`, // red
    'V (Johnson)': `rgba(168, 85, 247, ${alpha})`, // purple
    'B (Blue)': `rgba(37, 99, 235, ${alpha})`, // dark blue
    'z (Sloan)': `rgba(255, 165, 0, ${alpha})`, // orange
    'K (Infrared)': `rgba(139, 69, 19, ${alpha})`, // brown
    'Unfiltered': `rgba(255, 192, 203, ${alpha})`, // pink
    'I (Infrared)': `rgba(128, 0, 0, ${alpha})`, // maroon
    'g (Green)': `rgba(0, 128, 0, ${alpha})`, // green
    'Uncertain': `rgba(156, 163, 175, ${alpha})`, // gray
    'Unknown': `rgba(107, 114, 128, ${alpha})`, // darker gray
  };
  return filterColors[filterType] || `rgba(107, 114, 128, ${alpha})`;
}

function getFilterPointStyle(filterType: string): string {
  const styleMap: Record<string, string> = {
    'Visual': 'circle',
    'CCD': 'rect',
    'R (Red)': 'triangle',
    'V (Johnson)': 'rectRot',
    'B (Blue)': 'cross',
    'z (Sloan)': 'star',
    'K (Infrared)': 'rectRounded',
    'Unfiltered': 'crossRot',
    'I (Infrared)': 'dash',
    'g (Green)': 'line',
    'Uncertain': 'crossRot',
    'Unknown': 'circle'
  };
  return styleMap[filterType] || 'circle';
}