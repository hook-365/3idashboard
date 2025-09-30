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

export default function OrbitalVelocityChart({
  data,
  title = "Orbital Velocity Evolution",
  showMultipleVelocities = true,
  showTrendLine = false
}: OrbitalVelocityChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6" style={{ height: '400px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">
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
        x: point.date,
        y: theoretical_velocity
      };
    });
  };

  const datasets = [];

  // Split data at discovery date (July 1, 2025)
  const DISCOVERY_DATE = new Date('2025-07-01T00:00:00.000Z');
  const preDiscoveryData = data.filter(point => new Date(point.date) < DISCOVERY_DATE);
  const postDiscoveryData = data.filter(point => new Date(point.date) >= DISCOVERY_DATE);

  // Pre-discovery heliocentric velocity (dashed - simulated)
  if (preDiscoveryData.length > 0) {
    datasets.push({
      label: 'Heliocentric (Pre-discovery simulation)',
      data: preDiscoveryData.map(point => ({
        x: point.date,
        y: point.heliocentric_velocity
      })),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1,
      pointRadius: 2,
      pointHoverRadius: 4,
      fill: false,
      tension: 0.2,
      borderDash: [8, 4], // Dashed line for simulated data
      borderWidth: 1.5,
    });
  }

  // Post-discovery heliocentric velocity (solid - real data)
  if (postDiscoveryData.length > 0) {
    datasets.push({
      label: 'Heliocentric Velocity (km/s)',
      data: postDiscoveryData.map(point => ({
        x: point.date,
        y: point.heliocentric_velocity
      })),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1,
      pointRadius: 4,
      pointHoverRadius: 6,
      fill: false,
      tension: 0.2,
      borderWidth: 2,
    });
  }

  // Geocentric velocity (if available and requested)
  if (showMultipleVelocities && data.some(d => d.geocentric_velocity)) {
    // Pre-discovery geocentric (dashed)
    if (preDiscoveryData.length > 0) {
      datasets.push({
        label: 'Geocentric (Pre-discovery simulation)',
        data: preDiscoveryData.map(point => ({
          x: point.date,
          y: point.geocentric_velocity || 0
        })).filter(point => point.y > 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        pointRadius: 2,
        pointHoverRadius: 4,
        fill: false,
        tension: 0.2,
        borderDash: [8, 4],
        borderWidth: 1.5,
      });
    }

    // Post-discovery geocentric (solid)
    if (postDiscoveryData.length > 0) {
      datasets.push({
        label: 'Geocentric Velocity (km/s)',
        data: postDiscoveryData.map(point => ({
          x: point.date,
          y: point.geocentric_velocity || 0
        })).filter(point => point.y > 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        tension: 0.2,
        borderWidth: 2,
      });
    }
  }


  // Calculate y-axis range for perihelion line
  const allVelocities = data.flatMap(point => [
    point.heliocentric_velocity,
    ...(point.geocentric_velocity ? [point.geocentric_velocity] : [])
  ]);
  const yMin = Math.min(...allVelocities);
  const yMax = Math.max(...allVelocities);

  // Add perihelion vertical line
  datasets.push(createPerihelionLineDataset({ yMin, yMax }));

  // Theoretical Keplerian curve
  if (showTrendLine) {
    datasets.push({
      label: 'Keplerian Model',
      data: generateTheoreticalCurve(),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.05)',
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
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          padding: 15,
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
        borderColor: '#3b82f6',
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
          text: 'Velocity (km/s)',
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return `${value} km/s`;
          }
        },
        beginAtZero: false
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

  // Calculate stats
  const velocities = data.map(d => d.heliocentric_velocity).filter(v => v > 0);
  const minVelocity = Math.min(...velocities);
  const maxVelocity = Math.max(...velocities);
  const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div style={{ height: '400px', width: '100%' }}>
        <Line data={chartData} options={options} />
      </div>

      {/* Velocity statistics */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-gray-400">
            <span className="text-blue-400 font-medium">Range:</span> {minVelocity.toFixed(1)} - {maxVelocity.toFixed(1)} km/s
          </div>
          <div className="text-gray-400">
            <span className="text-green-400 font-medium">Average:</span> {avgVelocity.toFixed(1)} km/s
          </div>
          <div className="text-gray-400">
            <span className="text-purple-400 font-medium">Data points:</span> {data.length}
          </div>
        </div>

        {/* Physical interpretation */}
        <div className="mt-2 text-xs text-gray-500">
          <strong>Physical Context:</strong> Interstellar comet 3I/ATLAS accelerates as it approaches perihelion (Oct 30, 2025).
          Heliocentric velocity increases due to Sun&apos;s gravitational acceleration following Kepler&apos;s laws.
        </div>
      </div>
    </div>
  );
}