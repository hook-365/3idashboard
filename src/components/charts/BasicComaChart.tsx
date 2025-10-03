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
      <div className="bg-gray-800 rounded-lg p-6" style={{ height: '400px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">
            {data?.length === 0 ? 'No coma data available' : 'Loading coma chart...'}
          </div>
        </div>
      </div>
    );
  }

  const chartData: ChartData<'line'> = {
    datasets: [
      {
        label: 'Coma Size (arcminutes)',
        data: data.map(point => ({
          x: point.date,
          y: point.comaSize
        })),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
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
          color: '#9ca3af'
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
        borderColor: '#10b981',
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
        title: {
          display: true,
          text: 'Coma Size (arcminutes)',
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: '#9ca3af'
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
        <Line data={chartData} options={options} />
      </div>

      {/* Simple stats */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex justify-between text-sm text-gray-400">
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