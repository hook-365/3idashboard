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
import { Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Flag to track Chart.js registration
let chartJsRegistered = false;

export interface MorphologyDataPoint {
  date: string;
  comaSize?: number;      // arcminutes
  tailLength?: number;    // degrees
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
      <div className="bg-gray-800 rounded-lg p-6" style={{ height: '400px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">
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
      <div className="bg-gray-800 rounded-lg p-6" style={{ height: '400px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">No coma or tail measurements available</div>
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
        x: point.date,
        y: point.comaSize
      })),
      borderColor: '#10b981',
      backgroundColor: '#10b981',
      pointBackgroundColor: '#10b981',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1,
      pointRadius: 4,
      pointHoverRadius: 6,
      showLine: true,
      borderWidth: 2,
      tension: 0.1,
      yAxisID: 'y',
    });
  }

  // Add tail dataset if we have data
  if (tailData.length > 0) {
    datasets.push({
      label: 'Tail Length (degrees)',
      data: tailData.map(point => ({
        x: point.date,
        y: point.tailLength
      })),
      borderColor: '#f59e0b',
      backgroundColor: '#f59e0b',
      pointBackgroundColor: '#f59e0b',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1,
      pointRadius: 4,
      pointHoverRadius: 6,
      showLine: true,
      borderWidth: 2,
      tension: 0.1,
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
          color: '#9ca3af',
          usePointStyle: true,
        }
      },
      title: {
        display: true,
        text: title,
        color: '#ffffff',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#6366f1',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            const label = context.dataset.label || '';
            if (label.includes('Coma')) {
              return `${label}: ${value.toFixed(2)} arcminutes`;
            } else {
              return `${label}: ${value.toFixed(2)} degrees`;
            }
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
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      y: {
        type: 'linear',
        display: comaData.length > 0,
        position: 'left',
        title: {
          display: true,
          text: 'Coma Size (arcminutes)',
          color: '#10b981'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: '#10b981'
        },
        beginAtZero: true
      },
      y1: {
        type: 'linear',
        display: tailData.length > 0,
        position: 'right',
        title: {
          display: true,
          text: 'Tail Length (degrees)',
          color: '#3b82f6'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#3b82f6'
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
    <div className="bg-gray-800 rounded-lg p-4">
      <div style={{ height: '400px', width: '100%' }}>
        <Scatter data={chartData} options={options} />
      </div>

      {/* Simple stats */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-400">
          {comaData.length > 0 && (
            <div>
              <span className="text-green-400">Coma Size:</span> {Math.min(...comaData.map(d => d.comaSize!)).toFixed(1)} - {Math.max(...comaData.map(d => d.comaSize!)).toFixed(1)} arcminutes
              <span className="ml-2">({comaData.length} measurements)</span>
            </div>
          )}
          {tailData.length > 0 && (
            <div>
              <span className="text-blue-400">Tail Length:</span> {Math.min(...tailData.map(d => d.tailLength!)).toFixed(1)} - {Math.max(...tailData.map(d => d.tailLength!)).toFixed(1)} degrees
              <span className="ml-2">({tailData.length} measurements)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
