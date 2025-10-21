'use client';

import { useEffect, useState, memo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartOptions, ChartData } from 'chart.js';
import { ANALYTICS_DATE_CONFIG } from '@/utils/analytics-config';
import { createPerihelionAnnotation } from '@/utils/chart-annotations';
import { getTextColors, getBackgroundColors, getBorderColors, getChartColors, getStatusColors, hexToRgba } from '@/utils/chart-theme';

// Import global Chart.js setup (registers all components once)
import '@/lib/chartjs-setup';

export interface OrbitalVelocityDataPoint {
  date: string;
  heliocentric_velocity: number;
  geocentric_velocity?: number;
  uncertainty?: number;
  source?: string;
}

interface OrbitalVelocityChartProps {
  data: OrbitalVelocityDataPoint[];
  title?: string;
  showMultipleVelocities?: boolean;
  showTrendLine?: boolean;
}

const OrbitalVelocityChart = memo(function OrbitalVelocityChart({
  data,
  title = "Orbital Velocity Evolution",
  showMultipleVelocities = true,
  showTrendLine = false
}: OrbitalVelocityChartProps) {
  const [isClient, setIsClient] = useState(false);

  // Get theme colors
  const chartColors = getChartColors();
  const statusColors = getStatusColors();
  const textColors = getTextColors();
  const bgColors = getBackgroundColors();
  const borderColors = getBorderColors();

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !data || data.length === 0) {
    return (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6" style={{ height: '400px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-[var(--color-text-tertiary)]">
            {data?.length === 0 ? 'No orbital velocity data available' : 'Loading orbital velocity chart...'}
          </div>
        </div>
      </div>
    );
  }

  // Calculate theoretical Keplerian velocity curve for comparison
  const calculateKeplerianVelocity = (heliocentric_distance_au: number): number => {
    // Simplified: v = sqrt(GM/r) where GM ≈ 1.327e20 m³/s² for Sun
    const GM_SUN = 1.327e20; // m³/s²
    const distance_m = heliocentric_distance_au * 1.496e11; // Convert AU to meters

    if (distance_m <= 0) return 0;

    const velocity_ms = Math.sqrt(GM_SUN / distance_m);
    return velocity_ms / 1000; // Convert m/s to km/s
  };

  // Generate theoretical curve based on current distance range
  const generateTheoreticalCurve = () => {
    // Estimate distance range (for 3I/ATLAS approaching perihelion)
    return data.map((point) => {
      // Approximate distance based on time to perihelion
      const perihelion = new Date('2025-10-30T00:00:00Z');
      const pointDate = new Date(point.date);
      const daysToPerih = (perihelion.getTime() - pointDate.getTime()) / (1000 * 60 * 60 * 24);

      // Rough approximation: distance decreases as comet approaches
      const estimated_distance = Math.max(1.8, 3.0 - (90 - daysToPerih) * 0.015); // AU
      const theoretical_velocity = calculateKeplerianVelocity(estimated_distance);

      return {
        x: new Date(point.date).getTime(),
        y: theoretical_velocity
      };
    });
  };

  const datasets = [];

  // Split data by source type: JPL/Real observations vs Calculated/Predicted
  const realObservationsData = data.filter(point =>
    point.source?.includes('JPL') ||
    point.source?.includes('Real observations') ||
    point.source?.includes('Real-time')
  );
  const calculatedData = data.filter(point =>
    point.source?.includes('Calculated') ||
    point.source?.includes('Predicted') ||
    point.source?.includes('orbital mechanics')
  );

  // If no source filtering matched, use all data as real observations
  const dataToUse = realObservationsData.length > 0 || calculatedData.length > 0
    ? realObservationsData
    : data;

  // Real observations heliocentric velocity (JPL Horizons data)
  if (dataToUse.length > 0) {
    datasets.push({
      label: 'Heliocentric Velocity',
      data: dataToUse.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.heliocentric_velocity
      })),
      borderColor: chartColors.primary,
      backgroundColor: hexToRgba(chartColors.primary, 0.1),
      pointBackgroundColor: chartColors.primary,
      pointBorderColor: textColors.primary,
      pointBorderWidth: 1,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: false,
      tension: 0.2,
      borderWidth: 2,
    });
  }

  // Calculated/Predicted heliocentric velocity (if available)
  if (calculatedData.length > 0) {
    datasets.push({
      label: 'Heliocentric (Predicted)',
      data: calculatedData.map(point => ({
        x: new Date(point.date).getTime(),
        y: point.heliocentric_velocity
      })),
      borderColor: chartColors.quaternary,
      backgroundColor: hexToRgba(chartColors.quaternary, 0.1),
      pointBackgroundColor: chartColors.quaternary,
      pointBorderColor: textColors.primary,
      pointBorderWidth: 1,
      pointRadius: 2,
      pointHoverRadius: 4,
      fill: false,
      tension: 0.2,
      borderWidth: 2,
      borderDash: [5, 5],
    });
  }

  // Geocentric velocity (if available and requested)
  if (showMultipleVelocities && data.some(d => d.geocentric_velocity)) {
    // Real observations geocentric
    if (dataToUse.length > 0) {
      datasets.push({
        label: 'Geocentric Velocity',
        data: dataToUse.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.geocentric_velocity || 0
        })).filter(point => point.y > 0),
        borderColor: chartColors.secondary,
        backgroundColor: hexToRgba(chartColors.secondary, 0.1),
        pointBackgroundColor: chartColors.secondary,
        pointBorderColor: textColors.primary,
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        tension: 0.2,
        borderWidth: 2,
      });
    }

    // Calculated geocentric (if available)
    if (calculatedData.length > 0 && calculatedData.some(d => d.geocentric_velocity)) {
      datasets.push({
        label: 'Geocentric (Predicted)',
        data: calculatedData.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.geocentric_velocity || 0
        })).filter(point => point.y > 0),
        borderColor: chartColors.quaternary,
        backgroundColor: hexToRgba(chartColors.quaternary, 0.1),
        pointBackgroundColor: chartColors.quaternary,
        pointBorderColor: textColors.primary,
        pointBorderWidth: 1,
        pointRadius: 2,
        pointHoverRadius: 4,
        fill: false,
        tension: 0.2,
        borderWidth: 2,
        borderDash: [5, 5],
      });
    }
  }

  // Theoretical Keplerian curve
  if (showTrendLine) {
    datasets.push({
      label: 'Keplerian Model',
      data: generateTheoreticalCurve(),
      borderColor: chartColors.quinary,
      backgroundColor: hexToRgba(chartColors.quinary, 0.05),
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      tension: 0.1,
      borderDash: [8, 4],
      borderWidth: 1.5,
    });
  }

  const chartData: ChartData<'line'> = { datasets };

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
          usePointStyle: true,
          padding: 15,
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
            return `${context.dataset.label}: ${value.toFixed(2)} km/s`;
          },
          afterBody: (tooltipItems) => {
            const dataPoint = data[tooltipItems[0].dataIndex];
            const extras = [];
            if (dataPoint?.source) {
              extras.push(`Source: ${dataPoint.source}`);
            }
            if (dataPoint?.uncertainty) {
              extras.push(`Uncertainty: ±${dataPoint.uncertainty.toFixed(2)} km/s`);
            }
            return extras;
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
            borderColor: statusColors.success,
            borderWidth: 2,
            borderDash: [8, 4],
            label: {
              display: true,
              content: 'NOW',
              position: 'start',
              backgroundColor: hexToRgba(statusColors.success, 0.9),
              color: textColors.primary,
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
          text: 'Velocity (km/s)',
          color: textColors.secondary
        },
        grid: {
          color: borderColors.primary
        },
        ticks: {
          color: textColors.tertiary,
          callback: function(value) {
            return `${value} km/s`;
          }
        },
        beginAtZero: false
      }
    },
    interaction: {
      mode: 'nearest',
      intersect: false
    }
  };

  // Calculate stats
  const velocities = data.map(d => d.heliocentric_velocity).filter(v => v > 0);
  const minVelocity = Math.min(...velocities);
  const maxVelocity = Math.max(...velocities);
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
      <div style={{ height: '400px', width: '100%' }} aria-label={`${title} orbital velocity chart`}>
        <Line data={chartData} options={options} />
      </div>

      {/* Velocity statistics */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border-primary)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-[var(--color-text-tertiary)]">
            <span className="text-blue-400 font-medium">Range:</span> {minVelocity.toFixed(1)} - {maxVelocity.toFixed(1)} km/s
          </div>
          <div className="text-[var(--color-text-tertiary)]">
            <span className="text-green-400 font-medium">Average:</span> {avgVelocity.toFixed(1)} km/s
          </div>
          <div className="text-[var(--color-text-tertiary)]">
            <span className="text-purple-400 font-medium">Data points:</span> {data.length}
          </div>
        </div>

        {/* Physical interpretation */}
        <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">
          <strong>Physical Context:</strong> Interstellar object 3I/ATLAS accelerates as it approaches perihelion (Oct 30, 2025).
          Heliocentric velocity increases due to Sun&apos;s gravitational acceleration following Kepler&apos;s laws.
        </div>
      </div>

      {/* Data Source Disclaimer */}
      <div className="mt-4 p-3 bg-blue-500/10 border-l-4 border-blue-500 rounded text-sm">
        <p className="font-semibold text-[var(--color-text-primary)] mb-1">
          📊 Data Source Information
        </p>
        <p className="text-[var(--color-text-secondary)]">
          <span className="font-medium">Latest point:</span> Real-time calculation using current position from TheSkyLive
          <br />
          <span className="font-medium">Historical points:</span> Calculated daily using Kepler&apos;s laws of orbital mechanics and published 3I/ATLAS orbital elements
          <br />
          <span className="text-xs text-[var(--color-text-tertiary)]">Note: NASA/JPL Horizons does not currently track 3I/ATLAS. All velocities calculated using vis-viva equation with IAU/MPC orbital elements.</span>
        </p>
      </div>
    </div>
  );
});

export default OrbitalVelocityChart;