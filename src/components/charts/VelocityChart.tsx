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
import { ANALYTICS_DATE_CONFIG } from '@/utils/analytics-config';
import { createPerihelionLineDataset } from '@/utils/chart-helpers';

// Flag to track Chart.js registration
let chartJsRegistered = false;

export interface VelocityDataPoint {
  date: string;
  value: number;
  confidence?: number;
  uncertainty?: number;
  dataPoints?: number;
}

interface VelocityChartProps {
  data: VelocityDataPoint[];
  title: string;
  yAxisLabel: string;
  unit: string;
  color?: string;
  height?: number;
  showTrend?: boolean;
}

export default function VelocityChart({
  data,
  title,
  yAxisLabel,
  unit,
  color = '#10b981',
  height = 400,
  showTrend = true
}: VelocityChartProps) {
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
      <div className="bg-gray-800 rounded-lg p-6" style={{ height: `${height}px` }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">
            {data?.length === 0 ? 'No velocity data available' : 'Loading velocity chart...'}
          </div>
        </div>
      </div>
    );
  }

  // Calculate y-axis range for perihelion line
  const yValues = data.map(point => point.value);
  let yMin = Math.min(...yValues);
  let yMax = Math.max(...yValues);

  // Use smart scaling bounds for acceleration data
  if (yAxisLabel.toLowerCase().includes('acceleration')) {
    yMin = Math.max(0, Math.min(...data.map(d => d.value)) - 0.01);
    yMax = Math.max(...data.map(d => d.value)) + 0.01;
  }

  const chartData: ChartData<'line'> = {
    datasets: [
      {
        label: yAxisLabel,
        data: data.map(point => ({
          x: point.date,
          y: point.value
        })),
        borderColor: color,
        backgroundColor: `${color}20`,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        tension: 0.2,
      }
    ]
  };

  // Add perihelion vertical line
  chartData.datasets.push(createPerihelionLineDataset({ yMin, yMax }));

  // Add trend line if requested and enough data
  if (showTrend && data.length > 3) {
    const trendData = calculateTrendLine(data);
    chartData.datasets.push({
      label: 'Trend',
      data: trendData,
      borderColor: '#f59e0b',
      backgroundColor: 'transparent',
      pointRadius: 0,
      borderDash: [5, 5],
      borderWidth: 2,
      fill: false,
      tension: 0
    });
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      point: {
        radius: typeof window !== 'undefined' && window.innerWidth < 768 ? 4 : 3,
        hitRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 10 : 5,
        hoverRadius: typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 5,
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
        borderColor: color,
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            const point = data[context.dataIndex];
            const lines = [`${value.toFixed(3)} ${unit}`];
            if (point?.confidence) {
              lines.push(`Confidence: ${(point.confidence * 100).toFixed(1)}%`);
            }
            if (point?.dataPoints) {
              lines.push(`Data points: ${point.dataPoints}`);
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
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: '#9ca3af'
        },
        min: ANALYTICS_DATE_CONFIG.START_DATE,
        max: ANALYTICS_DATE_CONFIG.END_DATE
      },
      y: {
        title: {
          display: true,
          text: `${yAxisLabel} (${unit})`,
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: '#9ca3af'
        },
        // Smart scaling for acceleration data
        ...(yAxisLabel.toLowerCase().includes('acceleration') && {
          min: Math.max(0, Math.min(...data.map(d => d.value)) - 0.01),
          max: Math.max(...data.map(d => d.value)) + 0.01,
          ticks: {
            color: '#9ca3af',
            stepSize: 0.005
          }
        })
      }
    },
    interaction: {
      mode: 'nearest',
      intersect: false
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div style={{ height: `${height}px`, width: '100%' }}>
        <Line data={chartData} options={options} />
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex justify-between text-sm text-gray-400">
          <span>
            Range: {Math.min(...data.map(d => d.value)).toFixed(3)} - {Math.max(...data.map(d => d.value)).toFixed(3)} {unit}
          </span>
          <span>
            Data points: {data.length}
          </span>
        </div>
      </div>
    </div>
  );
}

function calculateTrendLine(data: VelocityDataPoint[]): Array<{ x: string; y: number }> {
  if (data.length < 2) return [];

  const points = data.map((point, index) => ({
    x: index,
    y: point.value,
  }));

  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return [
    { x: data[0].date, y: intercept },
    { x: data[data.length - 1].date, y: slope * (n - 1) + intercept }
  ];
}