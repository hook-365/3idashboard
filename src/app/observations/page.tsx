'use client';

import React, { useState, useEffect } from 'react';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import DataSourcesSection from '../../components/common/DataSourcesSection';
import PageNavigation from '../../components/common/PageNavigation';
import AppHeader from '../../components/common/AppHeader';
import { APIErrorBoundary } from '../../components/common/ErrorBoundary';
import TableSkeleton, { TableSkeletonMobile } from '../../components/common/TableSkeleton';
import CardSkeleton from '../../components/common/CardSkeleton';

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
        const response = await fetch('/api/comet-data?limit=1000'); // Get all observations for detailed view
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
    }, 900000); // 15min refresh - COBS data updates ~hourly, not every 5min

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
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Header */}
          <AppHeader />

          {/* Navigation */}
          <PageNavigation />

          <div className="container mx-auto px-6 py-8">
            {/* Summary Widget Skeleton */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600 mb-8 animate-pulse">
              <div className="h-6 w-64 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-96 bg-gray-700 rounded mb-6"></div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-gray-700 rounded-lg p-4">
                    <div className="h-8 w-8 bg-gray-600 rounded mx-auto mb-2"></div>
                    <div className="h-6 w-16 bg-gray-600 rounded mx-auto mb-2"></div>
                    <div className="h-3 w-24 bg-gray-600 rounded mx-auto mb-1"></div>
                    <div className="h-3 w-20 bg-gray-600 rounded mx-auto"></div>
                  </div>
                ))}
              </div>

              <div className="h-12 bg-gray-700 rounded"></div>
            </div>

            {/* Observations Table Skeleton */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8 animate-pulse">
              <div className="h-6 w-48 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-80 bg-gray-700 rounded mb-4"></div>

              <div className="hidden md:block">
                <TableSkeleton rows={15} columns={9} />
              </div>

              <div className="md:hidden">
                <TableSkeletonMobile rows={15} />
              </div>
            </div>

            {/* Filter Key Skeleton */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8 animate-pulse">
              <div className="h-6 w-56 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-96 bg-gray-700 rounded mb-6"></div>
              <CardSkeleton height={250} />
            </div>
          </div>
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
          <APIErrorBoundary>
            {/* Summary Widget */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📋 Community Observation Records
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Every brightness measurement reported by astronomers worldwide
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
                {/* Total Measurements */}
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xl font-bold text-blue-400">
                    {data?.metadata?.totalObservations || 0}
                  </div>
                  <div className="text-xs text-gray-400">Total Measurements</div>
                  <div className="text-xs text-gray-500">Since discovery</div>
                </div>

                {/* Contributing Astronomers */}
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">👥</div>
                  <div className="text-xl font-bold text-green-400">
                    {data?.metadata?.totalObservers || 0}
                  </div>
                  <div className="text-xs text-gray-400">Contributing Astronomers</div>
                  <div className="text-xs text-gray-500">Worldwide network</div>
                </div>

                {/* Date Range */}
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">📅</div>
                  <div className="text-xl font-bold text-purple-400">
                    {data?.data?.comet?.observations && data.data.comet.observations.length > 0 ? (
                      <>
                        {new Date(data.data.comet.observations[data.data.comet.observations.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(data.data.comet.observations[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </>
                    ) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-400">Observation Period</div>
                  <div className="text-xs text-gray-500">Date range</div>
                </div>

                {/* Most Recent */}
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🕐</div>
                  <div className="text-xl font-bold text-cyan-400">
                    {data?.data?.comet?.observations && data.data.comet.observations.length > 0 ? (
                      (() => {
                        const latest = new Date(data.data.comet.observations[0].date);
                        const now = new Date();
                        const hoursAgo = Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60));
                        return hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
                      })()
                    ) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-400">Most Recent</div>
                  <div className="text-xs text-gray-500">Latest observation</div>
                </div>
              </div>

              {/* Search Bar */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Search Observations</label>
                <input
                  type="text"
                  placeholder="Search by observer name, location, or filter type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <div className="mt-2 text-sm text-gray-400">
                    Showing {filteredObservations.length} of {data?.metadata?.totalObservations || 0} observations
                  </div>
                )}
              </div>
            </div>

          {/* Observations Table Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">📊 Detailed Observation Log</h3>
              <p className="text-sm text-gray-400">Complete record of all brightness measurements with observer details and equipment specifications</p>
            </div>

            {/* Table - Desktop */}
            <div className="hidden md:block bg-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Date & Time (UTC)</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Magnitude</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Observer</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 hidden lg:table-cell">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Filter</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 hidden xl:table-cell">Telescope</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Quality</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 hidden lg:table-cell">Aperture</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 hidden xl:table-cell">Coma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredObservations.map((obs, index) => (
                    <tr key={index} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-white">
                        {new Date(obs.date).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-white">
                        {obs.magnitude.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {obs.observer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 hidden lg:table-cell">
                        {obs.observer.location.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {obs.filter || 'Visual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 hidden xl:table-cell">
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
                      <td className="px-6 py-4 text-sm text-gray-300 hidden lg:table-cell">
                        {obs.aperture ? `${obs.aperture}"` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 hidden xl:table-cell">
                        {obs.coma ? `${obs.coma}'` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards - Mobile */}
          <div className="md:hidden space-y-4">
            {filteredObservations.map((obs, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4 space-y-3">
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xl font-bold text-white font-mono">
                      {obs.magnitude.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(obs.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC'
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {obs.filter || 'Visual'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      obs.quality === 'excellent' ? 'bg-green-100 text-green-800' :
                      obs.quality === 'good' ? 'bg-yellow-100 text-yellow-800' :
                      obs.quality === 'fair' ? 'bg-orange-100 text-orange-800' :
                      obs.quality === 'poor' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {obs.quality || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Observer Info */}
                <div className="border-t border-gray-700 pt-3">
                  <div className="text-sm font-medium text-white">{obs.observer.name}</div>
                  <div className="text-xs text-gray-400">{obs.observer.location.name}</div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-gray-700 pt-3">
                  <div>
                    <span className="text-gray-400">Telescope:</span>
                    <span className="ml-1 text-white">{obs.observer.telescope || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Aperture:</span>
                    <span className="ml-1 text-white">{obs.aperture ? `${obs.aperture}"` : 'N/A'}</span>
                  </div>
                  {obs.coma && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Coma:</span>
                      <span className="ml-1 text-white">{obs.coma}&apos;</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* Filter & Quality Guide */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">📖 Understanding the Data</h3>
              <p className="text-sm text-gray-400">Learn what the different filters and quality ratings mean in the observation records</p>
            </div>

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
          </APIErrorBoundary>
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}