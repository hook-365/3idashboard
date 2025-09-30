'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export interface ComaDataPoint {
  date: string;
  comaSize: number;
  uncertainty?: number;
  observationCount?: number;
  observer?: string;
  filter?: string;
  telescope?: string;
}

interface ComaScatterChartProps {
  data: ComaDataPoint[];
  title?: string;
}

export default function ComaScatterChart({
  data,
  title = "Coma Diameter Observations"
}: ComaScatterChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6" style={{ height: '400px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">
            {data?.length === 0 ? 'No coma data available' : 'Loading coma scatter plot...'}
          </div>
        </div>
      </div>
    );
  }

  // Group data by observation type like COBS
  const getObservationType = () => {
    // Temporarily classify everything as CCD to debug
    return 'CCD';

    // Original logic (commented out for debugging)
    /*
    if (point.filter) {
      if (['V', 'R', 'I', 'B', 'g', 'r', 'i', 'z', 'Z', 'C', 'CR', 'CV', '&Z', 'xM'].includes(point.filter)) {
        return 'CCD';
      }
    }
    return 'Visual';
    */
  };

  // Debug: log data breakdown
  console.log('🔍 ComaScatterChart data:', data.length, 'points');
  if (data.length > 0) {
    console.log('🔍 First 3 points:', data.slice(0, 3));
    console.log('🔍 Filters found:', [...new Set(data.map(d => d.filter))]);
    console.log('🔍 Sample point classification:', data.slice(0, 3).map(p => ({
      filter: p.filter,
      classified: getObservationType(p)
    })));
  }

  const getPointStyle = (obsType: string) => {
    switch (obsType) {
      case 'CCD':
        return {
          backgroundColor: '#10b981', // Bright green
          borderColor: '#ffffff',
          pointStyle: 'circle', // Simple circle for now
          radius: 6 // Larger for visibility
        };
      case 'Visual':
        return {
          backgroundColor: '#6b7280', // Gray
          borderColor: '#ffffff',
          pointStyle: 'circle',
          radius: 6
        };
      default:
        return {
          backgroundColor: '#ef4444', // Red
          borderColor: '#ffffff',
          pointStyle: 'circle',
          radius: 6
        };
    }
  };

  // Separate datasets by observation type
  const ccdData = data.filter(point => getObservationType(point) === 'CCD');
  const visualData = data.filter(point => getObservationType(point) === 'Visual');

  console.log('🔍 Data breakdown:', {
    total: data.length,
    ccd: ccdData.length,
    visual: visualData.length,
    sampleCCD: ccdData[0],
    sampleVisual: visualData[0]
  });

  const chartData: ChartData<'scatter'> = {
    datasets: [
      // CCD observations (most common)
      {
        label: 'CCD',
        data: ccdData.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.comaSize
        })),
        ...getPointStyle('CCD'),
        borderWidth: 1,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#34d399',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      },
      // Visual observations
      {
        label: 'Visual',
        data: visualData.map(point => ({
          x: new Date(point.date).getTime(),
          y: point.comaSize
        })),
        ...getPointStyle('Visual'),
        borderWidth: 1,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#6c757d',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      }
    ]
  };

  console.log('🔍 Chart data points:', chartData.datasets[0].data.length);
  console.log('🔍 First 3 chart points:', chartData.datasets[0].data.slice(0, 3));

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyle: 'circle'
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
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
          },
          label: (context) => {
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label;
            return `${datasetLabel}: ${value.toFixed(2)} arcminutes`;
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
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        title: {
          display: true,
          text: 'Observation Date',
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
          text: 'Coma Diameter (arcminutes)',
          color: '#9ca3af'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          color: '#9ca3af'
        },
        beginAtZero: true,
        max: 6.5 // Match COBS range showing 0-6+ arcminutes
      }
    },
    interaction: {
      mode: 'point',
      intersect: true
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div style={{ height: '400px', width: '100%' }}>
        <Scatter data={chartData} options={options} />
      </div>

      {/* Scatter plot stats */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-400">
          <div>
            <span className="text-white font-semibold">Range:</span> {Math.min(...data.map(d => d.comaSize)).toFixed(1)} - {Math.max(...data.map(d => d.comaSize)).toFixed(1)} arcminutes
          </div>
          <div>
            <span className="text-white font-semibold">Total:</span> {data.length} observations
          </div>
          <div>
            <span className="text-white font-semibold">CCD:</span> {ccdData.length} points
          </div>
          <div>
            <span className="text-white font-semibold">Visual:</span> {visualData.length} points
          </div>
        </div>
      </div>
    </div>
  );
}