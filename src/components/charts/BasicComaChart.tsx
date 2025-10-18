'use client';

import { useEffect, useState } from 'react';
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
import { getTextColors, getBackgroundColors, getBorderColors, getChartColors, hexToRgba } from '@/utils/chart-theme';

// Flag to track Chart.js registration
let chartJsRegistered = false;

export interface ComaDataPoint {
  date: string;
  comaSize: number;
  uncertainty?: number;
  observationCount?: number;
}

interface BasicComaChartProps {
  data: ComaDataPoint[];
  title?: string;
}

export default function BasicComaChart({
  data,
  title = "Coma Size Evolution"
}: BasicComaChartProps) {
  const [isClient, setIsClient] = useState(false);

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
            {data?.length === 0 ? 'No coma data available' : 'Loading coma chart...'}
          </div>
        </div>
      </div>
    );
  }

  const textColors = getTextColors();
  const bgColors = getBackgroundColors();
  const borderColors = getBorderColors();
  const chartColors = getChartColors();

  const chartData: ChartData<'line'> = {
    datasets: [
      {
        label: 'Coma Size (arcminutes)',
        data: data.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.comaSize
        })),
        borderColor: chartColors.secondary,
        backgroundColor: hexToRgba(chartColors.secondary, 0.1),
        pointBackgroundColor: chartColors.secondary,
        pointBorderColor: textColors.primary,
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.2,
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300
    },
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
          color: textColors.secondary,
          font: {
            size: 12
          }
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
          label: (context) => {
            const value = context.parsed.y;
            return `${value.toFixed(2)} arcminutes`;
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
          color: textColors.secondary
        },
        grid: {
          color: borderColors.primary
        },
        ticks: {
          color: textColors.tertiary
        }
      },
      y: {
        title: {
          display: true,
          text: 'Coma Size (arcminutes)',
          color: textColors.secondary
        },
        grid: {
          color: borderColors.primary
        },
        ticks: {
          color: textColors.tertiary
        },
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest',
      intersect: false
    }
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
      <div style={{ height: '400px', width: '100%' }} aria-label={`${title} coma size evolution chart`}>
        <Line data={chartData} options={options} />
      </div>

      {/* Simple stats */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)]">
        <div className="flex justify-between text-sm text-[var(--color-text-tertiary)]">
          <span>
            Range: {Math.min(...data.map(d => d.comaSize)).toFixed(1)} - {Math.max(...data.map(d => d.comaSize)).toFixed(1)} arcminutes
          </span>
          <span>
            Data points: {data.length}
          </span>
        </div>
      </div>
    </div>
  );
}