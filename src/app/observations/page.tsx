'use client';

import React, { useState, useEffect } from 'react';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import DataSourcesSection from '../../components/common/DataSourcesSection';
import PageNavigation from '../../components/common/PageNavigation';
import AppHeader from '../../components/common/AppHeader';
import DataAttribution from '../../components/common/DataAttribution';
import { APIErrorBoundary } from '../../components/common/ErrorBoundary';
import TableSkeleton, { TableSkeletonMobile } from '../../components/common/TableSkeleton';
import CardSkeleton from '../../components/common/CardSkeleton';
import ObserverPerformanceDashboard from '../../components/analytics/ObserverPerformanceDashboard';
import ScrollHashUpdater from '../../components/common/ScrollHashUpdater';

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

// Available comets for observation
const AVAILABLE_COMETS = [
  { designation: '3I', name: '3I/ATLAS', color: '#FF8C00' },
  { designation: 'C/2025 R2', name: 'SWAN', color: '#00CED1' },
  { designation: 'C/2025 A6', name: 'Lemmon', color: '#32CD32' },
  { designation: 'C/2025 K1', name: 'K1 ATLAS', color: '#9370DB' },
  { designation: 'C/2024 E1', name: 'Wierzchos', color: '#FF1493' },
];

export default function ObservationsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [observationsExpanded, setObservationsExpanded] = useState(false);
  const [observersExpanded, setObserversExpanded] = useState(false);
  const [selectedComet, setSelectedComet] = useState('3I'); // Default to 3I/ATLAS

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Use multi-comet API for non-3I comets, original API for 3I
        const apiUrl = selectedComet === '3I'
          ? '/api/comet-data?limit=1000'
          : `/api/multi-comet-observations?comet=${encodeURIComponent(selectedComet)}`;

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();

        // Transform multi-comet API response to match expected format
        if (selectedComet !== '3I' && result.success) {
          const cometInfo = AVAILABLE_COMETS.find(c => c.designation === selectedComet);
          setData({
            success: true,
            data: {
              comet: {
                name: cometInfo?.name || selectedComet,
                designation: selectedComet,
                currentMagnitude: result.data.statistics?.currentMagnitude || 0,
                perihelionDate: result.data.statistics?.observationDateRange?.latest || '',
                observations: result.data.observations || []
              },
              stats: {
                totalObservations: result.data.statistics?.totalObservations || 0,
                activeObservers: result.data.statistics?.activeObservers || 0,
                currentMagnitude: result.data.statistics?.currentMagnitude || 0,
                daysUntilPerihelion: result.data.statistics?.daysUntilPerihelion || 0,
              }
            },
            metadata: {
              totalObservations: result.metadata?.observation_count || 0,
              totalObservers: result.metadata?.observer_count || 0,
            }
          });
        } else {
          setData(result);
        }
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
  }, [selectedComet]); // Re-fetch when comet selection changes

  const filteredObservations = data?.data?.comet?.observations?.filter(obs =>
    obs.observer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obs.observer.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obs.filter?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
          {/* Header */}
          <AppHeader />

          {/* Navigation */}
          <PageNavigation />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Summary Widget Skeleton */}
            <div className="bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] rounded-lg p-6 border border-[var(--color-border-secondary)] mb-8 animate-pulse">
              <div className="h-6 w-64 bg-[var(--color-bg-tertiary)] rounded mb-2"></div>
              <div className="h-4 w-96 bg-[var(--color-bg-tertiary)] rounded mb-6"></div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
                    <div className="h-8 w-8 bg-[var(--color-bg-tertiary)] rounded mx-auto mb-2"></div>
                    <div className="h-6 w-16 bg-[var(--color-bg-tertiary)] rounded mx-auto mb-2"></div>
                    <div className="h-3 w-24 bg-[var(--color-bg-tertiary)] rounded mx-auto mb-1"></div>
                    <div className="h-3 w-20 bg-[var(--color-bg-tertiary)] rounded mx-auto"></div>
                  </div>
                ))}
              </div>

              <div className="h-12 bg-[var(--color-bg-tertiary)] rounded"></div>
            </div>

            {/* Observations Table Skeleton */}
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8 animate-pulse">
              <div className="h-6 w-48 bg-[var(--color-bg-tertiary)] rounded mb-2"></div>
              <div className="h-4 w-80 bg-[var(--color-bg-tertiary)] rounded mb-4"></div>

              <div className="hidden md:block">
                <TableSkeleton rows={15} columns={9} />
              </div>

              <div className="md:hidden">
                <TableSkeletonMobile rows={15} />
              </div>
            </div>

            {/* Filter Key Skeleton */}
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8 animate-pulse">
              <div className="h-6 w-56 bg-[var(--color-bg-tertiary)] rounded mb-2"></div>
              <div className="h-4 w-96 bg-[var(--color-bg-tertiary)] rounded mb-6"></div>
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
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex items-center justify-center">
          <div className="text-[var(--color-status-error)]">Error: {error}</div>
        </div>
      </ExtensionSafeWrapper>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        {/* Automatic hash navigation */}
        <ScrollHashUpdater />

        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--color-chart-primary)] via-[var(--color-chart-secondary)] to-[var(--color-chart-tertiary)] bg-clip-text text-transparent mb-3">
              Observation Database
            </h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
              Every brightness measurement reported by astronomers worldwide. Real-time data from the global observer network.
            </p>
          </div>

          <APIErrorBoundary>
            {/* Comet Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
                Select Comet
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {AVAILABLE_COMETS.map((comet) => (
                  <button
                    key={comet.designation}
                    onClick={() => setSelectedComet(comet.designation)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                      selectedComet === comet.designation
                        ? 'bg-[var(--color-chart-primary)] border-[var(--color-chart-primary)] text-white shadow-lg scale-105'
                        : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-chart-primary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: comet.color }}
                      ></div>
                      <span className="text-sm">{comet.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Widget */}
            <section id="observation-summary" className="bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] rounded-lg p-6 border border-[var(--color-border-secondary)] mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    📋 {data?.data?.comet?.name || 'Comet'} Observation Records
                  </h2>
                  <p className="text-[var(--color-text-tertiary)] text-sm">
                    Every brightness measurement reported by astronomers worldwide
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
                {/* Total Measurements */}
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xl font-bold text-[var(--color-chart-primary)]">
                    {data?.metadata?.totalObservations || 0}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Total Measurements</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Since discovery</div>
                </div>

                {/* Contributing Astronomers */}
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">👥</div>
                  <div className="text-xl font-bold text-[var(--color-status-success)]">
                    {data?.metadata?.totalObservers || 0}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Contributing Astronomers</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Worldwide network</div>
                </div>

                {/* Date Range */}
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">📅</div>
                  <div className="text-xl font-bold text-[var(--color-chart-quaternary)]">
                    {data?.data?.comet?.observations && data.data.comet.observations.length > 0 ? (
                      <>
                        {new Date(data.data.comet.observations[data.data.comet.observations.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(data.data.comet.observations[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </>
                    ) : 'N/A'}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Observation Period</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Date range</div>
                </div>

                {/* Most Recent */}
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🕐</div>
                  <div className="text-xl font-bold text-[var(--color-chart-senary)]">
                    {data?.data?.comet?.observations && data.data.comet.observations.length > 0 ? (
                      (() => {
                        const latest = new Date(data.data.comet.observations[0].date);
                        const now = new Date();
                        const hoursAgo = Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60));
                        return hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`;
                      })()
                    ) : 'N/A'}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Most Recent</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Latest observation</div>
                </div>
              </div>

              {/* Search Bar */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Search Observations</label>
                <input
                  type="text"
                  placeholder="Search by observer name, location, or filter type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:ring-2 focus:ring-[var(--color-chart-primary)] focus:border-transparent"
                />
                {searchTerm && (
                  <div className="mt-2 text-sm text-[var(--color-text-tertiary)]">
                    Showing {filteredObservations.length} of {data?.metadata?.totalObservations || 0} observations
                  </div>
                )}
              </div>
            </section>

          {/* Observations Table Section - Collapsible */}
          <section id="observation-table" className="bg-[var(--color-bg-secondary)] rounded-lg mb-8">
            {/* Header - Always visible, clickable */}
            <button
              onClick={() => setObservationsExpanded(!observationsExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-[var(--color-bg-tertiary)]/30 transition-colors rounded-lg"
            >
              <div className="text-left">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                  📊 Detailed Observation Log
                  <span className="text-sm font-normal text-[var(--color-text-tertiary)]">
                    ({filteredObservations.length} {searchTerm ? 'filtered' : 'total'})
                  </span>
                </h3>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Complete record of all brightness measurements with observer details and equipment specifications
                </p>
              </div>
              <svg
                className={`w-6 h-6 text-[var(--color-text-secondary)] transition-transform ${observationsExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable Content */}
            {observationsExpanded && (
            <div className="px-6 pb-6">{/* <- Add padding wrapper */}

            {/* Table - Desktop */}
            <div className="hidden md:block bg-[var(--color-bg-tertiary)] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-bg-tertiary)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)]">Date & Time (UTC)</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)]">Magnitude</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)]">Observer</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)]">Filter</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)] hidden xl:table-cell">Telescope</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)]">Quality</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">Aperture</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-text-secondary)] hidden xl:table-cell">Coma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-primary)]">
                  {filteredObservations.map((obs, index) => (
                    <tr key={index} className="hover:bg-[var(--color-bg-tertiary)]/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                        {new Date(obs.date).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'UTC'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-[var(--color-text-primary)]">
                        {obs.magnitude.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                        {obs.observer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] hidden lg:table-cell">
                        {obs.observer.location.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-chart-primary)]/20 text-[var(--color-chart-primary)]">
                          {obs.filter || 'Visual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] hidden xl:table-cell">
                        {obs.observer.telescope || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          obs.quality === 'excellent' ? 'bg-[var(--color-status-success)]/20 text-[var(--color-status-success)]' :
                          obs.quality === 'good' ? 'bg-[var(--color-status-info)]/20 text-[var(--color-status-info)]' :
                          obs.quality === 'fair' ? 'bg-[var(--color-status-warning)]/20 text-[var(--color-status-warning)]' :
                          obs.quality === 'poor' ? 'bg-[var(--color-status-error)]/20 text-[var(--color-status-error)]' :
                          'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                        }`}>
                          {obs.quality || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] hidden lg:table-cell">
                        {obs.aperture ? `${obs.aperture}"` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] hidden xl:table-cell">
                        {obs.coma ? `${obs.coma}'` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>{/* End overflow wrapper */}
            </div>{/* End desktop table wrapper */}

            {/* Cards - Mobile */}
            <div className="md:hidden space-y-3">
              {filteredObservations.map((obs, index) => (
                <div key={index} className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 space-y-3 border border-[var(--color-border-secondary)] hover:border-[var(--color-chart-primary)] transition-colors">
                {/* Header Row */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-[var(--color-status-success)] font-mono">
                      {obs.magnitude.toFixed(1)}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-1 whitespace-nowrap">
                      {new Date(obs.date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC'
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-chart-primary)]/20 text-[var(--color-chart-primary)]">
                      {obs.filter || 'Visual'}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      obs.quality === 'excellent' ? 'bg-[var(--color-status-success)]/20 text-[var(--color-status-success)]' :
                      obs.quality === 'good' ? 'bg-[var(--color-status-info)]/20 text-[var(--color-status-info)]' :
                      obs.quality === 'fair' ? 'bg-[var(--color-status-warning)]/20 text-[var(--color-status-warning)]' :
                      obs.quality === 'poor' ? 'bg-[var(--color-status-error)]/20 text-[var(--color-status-error)]' :
                      'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'
                    }`}>
                      {obs.quality || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Observer Info */}
                <div className="border-t border-[var(--color-border-primary)] pt-3">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-0.5">{obs.observer.name}</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">{obs.observer.location.name}</div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-2 gap-3 text-xs border-t border-[var(--color-border-primary)] pt-3">
                  <div className="space-y-1">
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">Telescope:</span>
                      <div className="text-[var(--color-text-primary)] font-medium mt-0.5">
                        {obs.observer.telescope || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div>
                      <span className="text-[var(--color-text-tertiary)]">Aperture:</span>
                      <div className="text-[var(--color-text-primary)] font-medium mt-0.5">
                        {obs.aperture ? `${obs.aperture}"` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  {obs.coma && (
                    <div className="col-span-2 pt-2 border-t border-[var(--color-border-secondary)]">
                      <span className="text-[var(--color-text-tertiary)]">Coma Diameter: </span>
                      <span className="text-[var(--color-text-primary)] font-medium">{obs.coma}&apos; (arcminutes)</span>
                    </div>
                  )}
                </div>
                </div>
              ))}
            </div>
            </div>
            )}
          </section>{/* End collapsible observations section */}

          {/* Observer Performance Section - Collapsible */}
          <section id="observer-performance" className="bg-[var(--color-bg-secondary)] rounded-lg mb-8">
            {/* Header - Always visible, clickable */}
            <button
              onClick={() => setObserversExpanded(!observersExpanded)}
              className="w-full p-6 flex items-center justify-between hover:bg-[var(--color-bg-tertiary)]/30 transition-colors rounded-lg"
            >
              <div className="text-left">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                  👥 Observer Network & Performance
                  <span className="text-sm font-normal text-[var(--color-text-tertiary)]">
                    ({data?.metadata?.totalObservers || 0} observers)
                  </span>
                </h3>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Global network statistics, leaderboards, and regional analysis of contributing astronomers
                </p>
              </div>
              <svg
                className={`w-6 h-6 text-[var(--color-text-secondary)] transition-transform ${observersExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable Content */}
            {observersExpanded && (
              <div className="px-6 pb-6">
                <ObserverPerformanceDashboard />
              </div>
            )}
          </section>{/* End collapsible observers section */}

          {/* Filter & Quality Guide - CRITICAL for amateur astronomers */}
          <section id="filter-quality-guide" className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">📖 Understanding Observation Filters & Quality</h3>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                Filters help scientists analyze different wavelengths of light from the comet. Each filter reveals different information about the comet&apos;s composition and activity.
              </p>
            </div>

            {/* Filter Explanations - Expanded */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
                <h4 className="font-semibold text-[var(--color-chart-primary)] mb-3 flex items-center gap-2">
                  <span>🔬</span> Common Observation Filters
                </h4>
                <div className="text-sm space-y-2">
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <strong className="text-[var(--color-text-primary)]">Visual</strong>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Naked eye or unfiltered telescope observations - what you see directly through the eyepiece</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <strong className="text-[var(--color-text-primary)]">V (Johnson V-band)</strong>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Standard yellow-green filter matching human eye sensitivity peak. Most common scientific filter for brightness measurements.</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <strong className="text-[var(--color-text-primary)]">R (Red filter)</strong>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Isolates red wavelengths (600-750nm) - useful for studying dust emission and color analysis</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <strong className="text-[var(--color-text-primary)]">B (Blue filter)</strong>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Isolates blue wavelengths (400-500nm) - useful for gas emission analysis and color comparison</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <strong className="text-[var(--color-text-primary)]">z (Sloan z-band)</strong>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Near-infrared filter (800-900nm) - part of the Sloan Digital Sky Survey filter set, useful for thermal emission studies</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <strong className="text-[var(--color-text-primary)]">Clear/CCD</strong>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Unfiltered digital camera observation - captures full visible spectrum with CCD sensor</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <strong className="text-[var(--color-text-primary)]">I (Infrared)</strong>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Infrared filter - captures heat radiation and penetrates dust clouds</p>
                  </div>
                  <div>
                    <strong className="text-[var(--color-text-primary)]">M (Miscellaneous)</strong>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Mixed filter configuration or custom filter setup - varies by observer</p>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4">
                <h4 className="font-semibold text-[var(--color-status-info)] mb-3 flex items-center gap-2">
                  <span>📊</span> Quality Ratings Explained
                </h4>
                <div className="text-sm space-y-2">
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <span className="text-[var(--color-status-success)] font-bold">Excellent</span>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">High precision measurement with uncertainty &lt;0.1 magnitude. Professional-grade equipment and conditions.</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <span className="text-[var(--color-status-info)] font-bold">Good</span>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Standard precision with 0.1-0.3 magnitude uncertainty. Typical for experienced amateur astronomers.</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <span className="text-[var(--color-status-warning)] font-bold">Fair</span>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Moderate precision with 0.3-0.5 magnitude uncertainty. Acceptable for tracking general brightness trends.</p>
                  </div>
                  <div className="border-b border-[var(--color-border-primary)] pb-2">
                    <span className="text-[var(--color-status-error)] font-bold">Poor</span>
                    <p className="text-[var(--color-text-tertiary)] text-xs mt-1">Low precision with &gt;0.5 magnitude uncertainty. Often due to challenging conditions or equipment limitations.</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)]">
                  <h4 className="font-semibold text-[var(--color-text-secondary)] mb-2 text-xs">Additional Measurements:</h4>
                  <div className="text-xs space-y-2">
                    <div>
                      <strong className="text-[var(--color-text-primary)]">Aperture (&quot;)</strong>
                      <p className="text-[var(--color-text-tertiary)] text-[11px] mt-1">Telescope aperture diameter in inches. Larger apertures collect more light and allow fainter objects to be observed.</p>
                    </div>
                    <div>
                      <strong className="text-[var(--color-text-primary)]">Coma (&apos;)</strong>
                      <p className="text-[var(--color-text-tertiary)] text-[11px] mt-1">Visible coma (fuzzy cloud) size in arcminutes. Grows as comet activity increases closer to the Sun.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Reference Card */}
            <div className="bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-chart-primary)]/30">
              <h4 className="font-semibold text-[var(--color-text-primary)] mb-2 text-sm flex items-center gap-2">
                <span>💡</span> Why Different Filters Matter
              </h4>
              <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
                Different filters reveal different aspects of comet behavior. Blue (B) filters show gas emissions,
                red (R) filters emphasize dust, and visual (V) provides the standard &quot;total brightness&quot; that most people report.
                Comparing measurements across filters helps scientists understand the comet&apos;s composition and activity level.
                That&apos;s why you&apos;ll see the same comet observed with multiple filters on the same night!
              </p>
            </div>
          </section>

          {/* Data Sources & Attribution */}
          <DataSourcesSection />
          </APIErrorBoundary>
        </div>

        {/* Data Attribution Footer */}
        <DataAttribution full={true} />
      </div>
    </ExtensionSafeWrapper>
  );
}