'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions, ChartData } from 'chart.js';
import { ANALYTICS_DATE_CONFIG } from '@/utils/analytics-config';
import { createPerihelionAnnotation } from '@/utils/chart-annotations';
import { getTextColors, getBackgroundColors, getBorderColors, getStatusColors, hexToRgba } from '@/utils/chart-theme';

// Import global Chart.js setup (registers all components once)
import '@/lib/chartjs-setup';

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

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !data || data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6" style={{ height: `${height}px` }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-[var(--color-text-tertiary)]">
            {data?.length === 0 ? 'No velocity data available' : 'Loading velocity chart...'}
          </div>
        </div>
      </div>
    );
  }

  const chartData: ChartData<'line'> = {
    datasets: [
      {
        label: yAxisLabel,
        data: data.map(point => ({
          x: new Date(point.date).getTime(),
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

  const textColors = getTextColors();
  const bgColors = getBackgroundColors();
  const borderColors = getBorderColors();

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 300
    },
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
            const point = data[context.dataIndex];
            // Use scientific notation for very small values
            const formattedValue = Math.abs(value) < 0.001
              ? value.toExponential(3)
              : value.toFixed(3);
            const lines = [`${formattedValue} ${unit}`];
            if (point?.confidence) {
              lines.push(`Confidence: ${(point.confidence * 100).toFixed(1)}%`);
            }
            if (point?.dataPoints) {
              lines.push(`Data points: ${point.dataPoints}`);
            }
            return lines;
          }
        }
      },
      annotation: {
        annotations: {
          perihelion: createPerihelionAnnotation(),
          currentTime: {
            type: 'line',
            xMin: new Date().toISOString(),
            xMax: new Date().toISOString(),
            borderColor: getStatusColors().success,
            borderWidth: 2,
            borderDash: [8, 4],
            label: {
              display: true,
              content: 'NOW',
              position: 'start',
              backgroundColor: hexToRgba(getStatusColors().success, 0.9),
              color: getTextColors().primary,
              font: {
                size: 12,
                weight: 'bold'
              },
              padding: 6,
              yAdjust: -10
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
          color: textColors.secondary
        },
        grid: {
          color: borderColors.primary
        },
        ticks: {
          color: textColors.tertiary
        },
        min: ANALYTICS_DATE_CONFIG.START_DATE,
        max: ANALYTICS_DATE_CONFIG.END_DATE
      },
      y: {
        title: {
          display: true,
          text: `${yAxisLabel} (${unit})`,
          color: textColors.secondary
        },
        grid: {
          color: borderColors.primary
        },
        ticks: {
          color: textColors.tertiary,
          // Use scientific notation for very small values
          callback: function(value) {
            if (yAxisLabel.toLowerCase().includes('acceleration')) {
              // For acceleration, use scientific notation if values are < 0.001
              const numValue = typeof value === 'number' ? value : 0;
              if (Math.abs(numValue) < 0.001) {
                return numValue.toExponential(2);
              }
            }
            return typeof value === 'number' ? value.toFixed(3) : value;
          }
        },
        // Smart scaling for acceleration data
        ...(yAxisLabel.toLowerCase().includes('acceleration') && {
          // Calculate dynamic padding based on value magnitude
          min: (() => {
            const minVal = Math.min(...data.map(d => d.value));
            const range = Math.max(...data.map(d => d.value)) - minVal;
            return Math.max(0, minVal - range * 0.1); // 10% padding below minimum
          })(),
          max: (() => {
            const maxVal = Math.max(...data.map(d => d.value));
            const minVal = Math.min(...data.map(d => d.value));
            const range = maxVal - minVal;
            return maxVal + range * 0.1; // 10% padding above maximum
          })()
        })
      }
    },
    interaction: {
      mode: 'nearest',
      intersect: false
    }
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
      <div style={{ height: `${height}px`, width: '100%' }} aria-label={`${title} velocity chart`}>
        <Line data={chartData} options={options} />
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)]">
        <div className="flex justify-between text-sm text-[var(--color-text-tertiary)]">
          <span>
            Range: {(() => {
              const min = Math.min(...data.map(d => d.value));
              const max = Math.max(...data.map(d => d.value));
              const minStr = Math.abs(min) < 0.001 ? min.toExponential(2) : min.toFixed(3);
              const maxStr = Math.abs(max) < 0.001 ? max.toExponential(2) : max.toFixed(3);
              return `${minStr} - ${maxStr} ${unit}`;
            })()}
          </span>
          <span>
            Data points: {data.length}
          </span>
        </div>
      </div>

      {/* Acceleration Data Source Disclaimer */}
      {yAxisLabel.toLowerCase().includes('acceleration') && (
        <div className="mt-4 p-3 bg-orange-500/10 border-l-4 border-orange-500 rounded text-sm">
          <p className="font-semibold text-[var(--color-text-primary)] mb-1">
            📊 Acceleration Data Source
          </p>
          <p className="text-[var(--color-text-secondary)]">
            Calculated using gravitational physics: a = GM/r² where r is the heliocentric distance.
            Shows the magnitude of gravitational acceleration from the Sun. As 3I/ATLAS gets closer to the Sun (smaller r), acceleration increases following inverse-square law.
            <br />
            <span className="text-xs text-[var(--color-text-tertiary)] mt-1 block">Units: km/s² (kilometers per second squared - standard SI-derived acceleration units)</span>
          </p>
        </div>
      )}
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
    { x: new Date(data[0].date).getTime(), y: intercept },
    { x: new Date(data[data.length - 1].date).getTime(), y: slope * (n - 1) + intercept }
  ];
}