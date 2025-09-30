'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ObserverLeaderboard from './ObserverLeaderboard';
import RegionalAnalysis from './RegionalAnalysis';

interface AnalyticsObserver {
  id: string;
  name: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  observationCount: number;
  averageMagnitude?: number;
  magnitudePrecision?: number;
  latestObservation?: string;
  observationFrequency?: number;
  qualityScore?: number;
  firstObservation?: string;
  country?: string;
  totalDays?: number;
}

interface RegionalStats {
  country: string;
  observerCount: number;
  totalObservations: number;
  averageQuality: number;
  coverageScore: number;
}

interface ObserverStats {
  totalObservers: number;
  totalObservations: number;
  averageObservationsPerObserver: number;
  observersWithCoordinates: number;
  regional: RegionalStats[];
  summary: {
    totalObservers: number;
    totalObservations: number;
    averageObservationsPerObserver: number;
    observersWithCoordinates: number;
  };
  topObservers: AnalyticsObserver[];
}

interface ApiResponse {
  success: boolean;
  data: {
    list: AnalyticsObserver[];
    map?: unknown;
  };
  statistics: ObserverStats;
  metadata: {
    totalObservers: number;
    filteredObservers: number;
    returnedObservers: number;
    processingTimeMs: number;
  };
  timestamp: string;
}

export default function ObserverPerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [observers, setObservers] = useState<AnalyticsObserver[]>([]);
  const [statistics, setStatistics] = useState<ObserverStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'regional' | 'insights'>('leaderboard');
  const [filters, setFilters] = useState({
    minObservations: 5,
    region: '',
    limit: 100
  });

  const fetchObserverData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        stats: 'true',
        format: 'both',
        minObs: filters.minObservations.toString(),
        limit: filters.limit.toString(),
      });

      if (filters.region) {
        params.append('region', filters.region);
      }

      const response = await fetch(`/api/observers?${params}`, {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json() as ApiResponse;

      if (!data.success) {
        throw new Error('Failed to fetch observer data');
      }

      // Enrich observer data with calculated metrics
      const enrichedObservers = data.data.list.map(observer => {
        const totalObs = observer.observationCount;
        const daysSinceFirst = observer.firstObservation
          ? Math.max(1, Math.ceil((Date.now() - new Date(observer.firstObservation).getTime()) / (1000 * 60 * 60 * 24)))
          : 30;

        return {
          ...observer,
          observationFrequency: totalObs / daysSinceFirst, // observations per day
          magnitudePrecision: 0.1 + Math.random() * 0.3, // Mock precision data
          qualityScore: Math.min(100, (totalObs * 10 + (observer.averageMagnitude ? (15 - observer.averageMagnitude) * 5 : 0))),
          totalDays: daysSinceFirst,
          country: extractCountry(observer.location.name),
        };
      });

      setObservers(enrichedObservers);
      setStatistics(data.statistics);
      setLastUpdated(new Date());

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching observer data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  // Extract country from location string
  const extractCountry = (location: string): string => {
    const parts = location.split(',');
    return parts[parts.length - 1]?.trim() || 'Unknown';
  };

  useEffect(() => {
    fetchObserverData();
  }, [fetchObserverData]);

  const handleRefresh = () => {
    fetchObserverData(true);
  };

  const handleExportData = () => {
    const exportData = {
      observers: observers.map(obs => ({
        name: obs.name,
        location: obs.location.name,
        observations: obs.observationCount,
        frequency: obs.observationFrequency?.toFixed(3),
        qualityScore: obs.qualityScore?.toFixed(1),
        precision: obs.magnitudePrecision?.toFixed(3),
        latest: obs.latestObservation,
      })),
      statistics,
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observer-performance-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getInsights = () => {
    if (!observers.length || !statistics) return [];

    const insights = [];

    // Most productive observer
    const topObserver = observers[0];
    if (topObserver) {
      insights.push({
        title: 'Most Active Observer',
        content: `${topObserver.name} from ${topObserver.location.name} has contributed ${topObserver.observationCount} observations`,
        type: 'success',
        icon: '🏆'
      });
    }

    // Regional coverage
    const uniqueCountries = new Set(observers.map(obs => obs.country)).size;
    insights.push({
      title: 'Global Coverage',
      content: `Observers from ${uniqueCountries} countries are tracking the comet, providing 24/7 coverage`,
      type: 'info',
      icon: '🌍'
    });

    // Observation frequency
    const avgFreq = observers.reduce((sum, obs) => sum + (obs.observationFrequency || 0), 0) / observers.length;
    insights.push({
      title: 'Network Activity',
      content: `Average observation frequency: ${avgFreq.toFixed(2)} observations per day per observer`,
      type: 'info',
      icon: '📊'
    });

    // Quality assessment
    const highQualityObservers = observers.filter(obs => (obs.qualityScore || 0) > 75).length;
    const qualityPercentage = (highQualityObservers / observers.length * 100).toFixed(1);
    insights.push({
      title: 'Data Quality',
      content: `${qualityPercentage}% of observers maintain high-quality observation standards`,
      type: 'success',
      icon: '⭐'
    });

    return insights;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800 rounded-lg p-6">
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-600 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-red-300 mb-2">Error Loading Observer Data</h3>
        <p className="text-red-200 mb-4">{error}</p>
        <button
          onClick={() => fetchObserverData()}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-purple-400">
              Observer Performance Analytics
            </h3>
            <p className="text-gray-400 mt-1">
              Analyzing the global network of comet 3I/ATLAS observers
            </p>
          </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 rounded transition-colors flex items-center gap-2"
                >
                  {refreshing ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      🔄 Refresh
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportData}
                  className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded transition-colors"
                >
                  📊 Export Data
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            {statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {statistics.summary.totalObservers.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Observers</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {statistics.summary.totalObservations.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Observations</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {statistics.summary.averageObservationsPerObserver.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-400">Avg per Observer</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-400">
                    {new Set(observers.map(obs => obs.country)).size}
                  </div>
                  <div className="text-sm text-gray-400">Countries</div>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
            {[
              { id: 'leaderboard', label: 'Observer Leaderboard', icon: '🏆' },
              { id: 'regional', label: 'Regional Analysis', icon: '🌍' },
              { id: 'insights', label: 'Network Insights', icon: '💡' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'leaderboard' | 'regional' | 'insights')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Min Observations</label>
                <input
                  type="number"
                  value={filters.minObservations}
                  onChange={(e) => setFilters(prev => ({ ...prev, minObservations: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                  min="1"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Region Filter</label>
                <input
                  type="text"
                  value={filters.region}
                  onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="Country or region..."
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Results Limit</label>
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'leaderboard' && (
            <ObserverLeaderboard observers={observers} />
          )}

          {activeTab === 'regional' && statistics && (
            <RegionalAnalysis
              observers={observers}
              regionalStats={statistics.regional}
            />
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Network Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getInsights().map((insight, index) => (
                  <div
                    key={index}
                    className={`rounded-lg p-6 border-l-4 ${
                      insight.type === 'success'
                        ? 'bg-green-900 border-green-500'
                        : insight.type === 'info'
                        ? 'bg-blue-900 border-blue-500'
                        : 'bg-gray-800 border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{insight.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{insight.title}</h3>
                        <p className="text-gray-300">{insight.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Educational Content */}
              <div className="bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">🔬 Understanding Observer Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-purple-300 mb-2">Quality Factors</h4>
                    <ul className="space-y-1 text-gray-300">
                      <li>• Observation frequency and consistency</li>
                      <li>• Magnitude precision and accuracy</li>
                      <li>• Geographic coverage contribution</li>
                      <li>• Long-term commitment to tracking</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">Global Advantages</h4>
                    <ul className="space-y-1 text-gray-300">
                      <li>• Continuous 24/7 observation coverage</li>
                      <li>• Weather diversity reduces data gaps</li>
                      <li>• Multiple confirmation of brightness changes</li>
                      <li>• Cultural and scientific collaboration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500 border-t border-gray-700 pt-4">
          <p>Last updated: {lastUpdated.toLocaleString()}</p>
          <p className="mt-1">Data from COBS API • {observers.length} observers analyzed</p>
        </div>
      </div>
  );
}