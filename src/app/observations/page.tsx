'use client';

import React, { useState, useEffect } from 'react';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import DataSourcesSection from '../../components/common/DataSourcesSection';
import PageNavigation from '../../components/common/PageNavigation';
import AppHeader from '../../components/common/AppHeader';

interface ObservationData {
  id: string;
  date: string;
  magnitude: number;
  uncertainty?: number;
  observer: {
    id: string;
    name: string;
    location: {
      name: string;
      lat?: number;
      lng?: number;
    };
    telescope: string;
    observationCount: number;
  };
  filter: string;
  aperture: number;
  coma?: number;
  notes: string;
  source: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ApiResponse {
  success: boolean;
  data: {
    comet: {
      name: string;
      designation: string;
      currentMagnitude: number;
      perihelionDate: string;
      observations: ObservationData[];
    };
    stats: {
      totalObservations: number;
      activeObservers: number;
      currentMagnitude: number;
      daysUntilPerihelion: number;
    };
  };
  metadata: {
    totalObservations: number;
    totalObservers: number;
  };
}

export default function ObservationsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/comet-data');
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData(); // Initial fetch

    const interval = setInterval(() => {
      // Only fetch when page is visible
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 300000); // Changed from 30s to 5min (300000ms)

    return () => clearInterval(interval);
  }, []);

  const filteredObservations = data?.data?.comet?.observations?.filter(obs =>
    obs.observer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obs.observer.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obs.filter?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-2xl">Loading observations...</div>
        </div>
      </ExtensionSafeWrapper>
    );
  }

  if (error) {
    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </ExtensionSafeWrapper>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="container mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Observation Records</h2>
            <p className="text-gray-400">Detailed view of all 3I/ATLAS observations with search and filtering</p>
          </div>

          {/* Search and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-1">
              <input
                type="text"
                placeholder="Search observer, location, filter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-blue-400">{data?.metadata?.totalObservations || 0}</div>
              <div className="text-gray-300 text-sm">Total Observations</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-green-400">{filteredObservations.length}</div>
              <div className="text-gray-300 text-sm">Filtered Results</div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-purple-400">{data?.data?.comet?.currentMagnitude?.toFixed(1) || 'N/A'}</div>
              <div className="text-gray-300 text-sm">Latest Magnitude</div>
            </div>
          </div>

          {/* Observations Table */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Magnitude</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Observer</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Filter</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Telescope</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Quality</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Aperture</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Coma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredObservations.map((obs, index) => (
                    <tr key={index} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-white">
                        {new Date(obs.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-white">
                        {obs.magnitude.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {obs.observer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {obs.observer.location.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {obs.filter || 'Visual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {obs.observer.telescope || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          obs.quality === 'excellent' ? 'bg-green-100 text-green-800' :
                          obs.quality === 'good' ? 'bg-yellow-100 text-yellow-800' :
                          obs.quality === 'fair' ? 'bg-orange-100 text-orange-800' :
                          obs.quality === 'poor' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {obs.quality || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {obs.aperture ? `${obs.aperture}"` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {obs.coma ? `${obs.coma}'` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Filter Key */}
          <div className="mt-8 bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Filter & Quality Guide</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Common Filters:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Visual:</strong> Naked eye or unfiltered observations</div>
                  <div><strong>V:</strong> Johnson V-band (visual magnitude)</div>
                  <div><strong>R:</strong> Red filter observations</div>
                  <div><strong>B:</strong> Blue filter observations</div>
                  <div><strong>Clear/CCD:</strong> Unfiltered CCD observations</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-300 mb-2">Quality Ratings:</h4>
                <div className="text-sm space-y-1">
                  <div><span className="text-green-400">Excellent:</span> High precision (&lt;0.1 mag uncertainty)</div>
                  <div><span className="text-yellow-400">Good:</span> Standard precision (0.1-0.3 mag uncertainty)</div>
                  <div><span className="text-orange-400">Fair:</span> Moderate precision (0.3-0.5 mag uncertainty)</div>
                  <div><span className="text-red-400">Poor:</span> Low precision (&gt;0.5 mag uncertainty)</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <h4 className="font-semibold text-gray-300 mb-2">Additional Data:</h4>
              <div className="text-sm space-y-1">
                <div><strong>Aperture:</strong> Telescope aperture size in inches (&quot;)</div>
                <div><strong>Coma:</strong> Visible coma size in arcminutes (&apos;)</div>
              </div>
            </div>
          </div>

          {/* Data Sources & Attribution */}
          <DataSourcesSection />
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}