'use client';

import { useEffect, useState, useRef } from 'react';
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
import { Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { getChartColors, getTextColors, getBorderColors, getBackgroundColors, hexToRgba } from '@/utils/chart-theme';

// Flag to track Chart.js registration
let chartJsRegistered = false;

export interface MorphologyDataPoint {
  date: string;
  comaSize?: number;      // arcminutes
  tailLength?: number;    // degrees
  observer?: {
    name: string;
    telescope: string;
    location: string;
  };
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ComaAndTailChartProps {
  data: MorphologyDataPoint[];
  title?: string;
}

export default function ComaAndTailChart({
  data,
  title = "Coma & Tail Evolution"
}: ComaAndTailChartProps) {
  const [isClient, setIsClient] = useState(false);
  const chartRef = useRef<ChartJS<'scatter'>>(null);

  // Get theme colors
  const chartColors = getChartColors();
  const textColors = getTextColors();
  const borderColors = getBorderColors();
  const bgColors = getBackgroundColors();

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
        TimeScale
      );
      chartJsRegistered = true;
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !data || data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6" style={{ height: '400px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-[var(--color-text-tertiary)]">
            {data?.length === 0 ? 'No morphology data available' : 'Loading chart...'}
          </div>
        </div>
      </div>
    );
  }

  // Filter data points that have at least coma or tail
  const comaData = data.filter(d => d.comaSize !== undefined && d.comaSize !== null);
  const tailData = data.filter(d => d.tailLength !== undefined && d.tailLength !== null);

  if (comaData.length === 0 && tailData.length === 0) {
    return (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6" style={{ height: '400px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-[var(--color-text-tertiary)]">No coma or tail measurements available</div>
        </div>
      </div>
    );
  }

  const datasets = [];

  // Add coma dataset if we have data
  if (comaData.length > 0) {
    datasets.push({
      label: 'Coma Size (arcminutes)',
      data: comaData.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.comaSize!,  // We filtered for non-null values above
        pointData: point  // Store full point data for tooltip
      })),
      borderColor: chartColors.secondary,
      backgroundColor: chartColors.secondary,
      pointBackgroundColor: chartColors.secondary,
      pointBorderColor: textColors.primary,
      pointBorderWidth: 1,
      pointRadius: 5,
      pointHoverRadius: 7,
      showLine: false,
      yAxisID: 'y',
    });
  }

  // Add tail dataset if we have data
  if (tailData.length > 0) {
    datasets.push({
      label: 'Tail Length (degrees)',
      data: tailData.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.tailLength!,  // We filtered for non-null values above
        pointData: point  // Store full point data for tooltip
      })),
      borderColor: chartColors.quinary,
      backgroundColor: chartColors.quinary,
      pointBackgroundColor: chartColors.quinary,
      pointBorderColor: textColors.primary,
      pointBorderWidth: 1,
      pointRadius: 5,
      pointHoverRadius: 7,
      showLine: false,
      yAxisID: 'y1',
    });
  }

  const chartData: ChartData<'scatter'> = { datasets };

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      point: {
        radius: typeof window !== 'undefined' && window.innerWidth < 768 ? 5 : 4,
        hitRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 6,
        hoverRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 7 : 6,
      },
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: textColors.tertiary,
          usePointStyle: true,
        }
      },
      title: {
        display: true,
        text: title,
        color: textColors.heading,
        font: {
          size: 16,
          weight: 'bold'
        }
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
            const rawData = context.raw as { x: number; y: number; pointData?: MorphologyDataPoint };
            const point = rawData?.pointData;
            const value = context.parsed.y;
            const label = context.dataset.label || '';

            const lines = [];

            // Measurement value
            if (label.includes('Coma')) {
              lines.push(`Coma: ${value.toFixed(2)} arcminutes`);
              // Show tail if available on same observation
              if (point?.tailLength) {
                lines.push(`Tail: ${point.tailLength.toFixed(2)} degrees`);
              }
            } else {
              lines.push(`Tail: ${value.toFixed(2)} degrees`);
              // Show coma if available on same observation
              if (point?.comaSize) {
                lines.push(`Coma: ${point.comaSize.toFixed(2)} arcminutes`);
              }
            }

            // Observer info
            if (point?.observer) {
              lines.push(`Observer: ${point.observer.name}`);
              if (point.observer.telescope) {
                lines.push(`Telescope: ${point.observer.telescope}`);
              }
              if (point.observer.location) {
                lines.push(`Location: ${point.observer.location}`);
              }
            }

            // Quality
            if (point?.quality) {
              lines.push(`Quality: ${point.quality}`);
            }

            return lines;
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
            week: 'MMM dd'
          }
        },
        title: {
          display: true,
          text: 'Date',
          color: textColors.tertiary
        },
        grid: {
          color: hexToRgba(borderColors.primary, 0.2)
        },
        ticks: {
          color: textColors.tertiary
        }
      },
      y: {
        type: 'linear',
        display: comaData.length > 0,
        position: 'left',
        title: {
          display: true,
          text: 'Coma Size (arcminutes)',
          color: chartColors.secondary
        },
        grid: {
          color: hexToRgba(borderColors.primary, 0.2)
        },
        ticks: {
          color: chartColors.secondary
        },
        beginAtZero: true,
        max: 10
      },
      y1: {
        type: 'linear',
        display: tailData.length > 0,
        position: 'right',
        title: {
          display: true,
          text: 'Tail Length (degrees)',
          color: chartColors.quinary
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: chartColors.quinary
        },
        beginAtZero: true,
        max: 10
      }
    },
    interaction: {
      mode: 'nearest',
      intersect: false
    }
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
      <div style={{ height: '400px', width: '100%' }}>
        <Scatter ref={chartRef} data={chartData} options={options} />
      </div>

      {/* Simple stats */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[var(--color-text-tertiary)]">
          {comaData.length > 0 && (
            <div>
              <span className="text-[var(--color-chart-secondary)]">Coma Size:</span> {Math.min(...comaData.map(d => d.comaSize!)).toFixed(1)} - {Math.max(...comaData.map(d => d.comaSize!)).toFixed(1)} arcminutes
              <span className="ml-2">({comaData.length} measurements)</span>
            </div>
          )}
          {tailData.length > 0 && (
            <div>
              <span className="text-[var(--color-chart-quinary)]">Tail Length:</span> {Math.min(...tailData.map(d => d.tailLength!)).toFixed(1)} - {Math.max(...tailData.map(d => d.tailLength!)).toFixed(1)} degrees
              <span className="ml-2">({tailData.length} measurements)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
