'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    minObservations: 1,
    region: '',
    limit: 100
  });

  // Extract country from location string - memoized to avoid recreation
  const extractCountry = useCallback((location: string): string => {
    const parts = location.split(',');
    return parts[parts.length - 1]?.trim() || 'Unknown';
  }, []);

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
  }, [filters, extractCountry]);

  useEffect(() => {
    fetchObserverData();
  }, [fetchObserverData]);

  const handleRefresh = useCallback(() => {
    fetchObserverData(true);
  }, [fetchObserverData]);

  const handleExportData = useCallback(() => {
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
  }, [observers, statistics]);

  const getInsights = useMemo(() => {
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
  }, [observers, statistics]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Summary Widget Skeleton */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600 animate-pulse">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="h-6 w-64 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-96 bg-gray-700 rounded"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-24 bg-gray-700 rounded"></div>
              <div className="h-10 w-24 bg-gray-700 rounded"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-700 rounded-lg p-4">
                <div className="h-8 w-8 bg-gray-600 rounded mx-auto mb-2"></div>
                <div className="h-6 w-16 bg-gray-600 rounded mx-auto mb-2"></div>
                <div className="h-3 w-24 bg-gray-600 rounded mx-auto mb-1"></div>
                <div className="h-3 w-20 bg-gray-600 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
          <div className="h-6 w-48 bg-gray-700 rounded mb-4"></div>
          <div className="h-12 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-600 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-red-300 mb-2">⚠️ Unable to Load Observer Data</h3>
        <p className="text-red-200 mb-4">{error}</p>
        <button
          onClick={() => fetchObserverData()}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Widget */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              👥 Worldwide Observer Network
            </h2>
            <p className="text-gray-400 text-sm">
              Amateur and professional astronomers tracking the comet from around the globe
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg transition-colors flex items-center gap-2 text-sm"
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
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition-colors text-sm"
            >
              📊 Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">👨‍🔬</div>
              <div className="text-xl font-bold text-blue-400">
                {statistics.summary.totalObservers.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Contributing Astronomers</div>
              <div className="text-xs text-gray-500">Worldwide network</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-xl font-bold text-green-400">
                {statistics.summary.totalObservations.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">Total Measurements</div>
              <div className="text-xs text-gray-500">Since discovery</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">📈</div>
              <div className="text-xl font-bold text-purple-400">
                {statistics.summary.averageObservationsPerObserver.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400">Average per Person</div>
              <div className="text-xs text-gray-500">Measurements</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl mb-1">🌍</div>
              <div className="text-xl font-bold text-yellow-400">
                {new Set(observers.map(obs => obs.country)).size}
              </div>
              <div className="text-xs text-gray-400">Countries Participating</div>
              <div className="text-xs text-gray-500">Global coverage</div>
            </div>
          </div>
        )}
      </div>

          {/* Tab Navigation */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-2">🔍 Explore the Network</h3>
              <p className="text-sm text-gray-400">View rankings, regional breakdowns, and collaboration insights</p>
            </div>
            <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
              {[
                { id: 'leaderboard', label: 'Top Contributors', icon: '🏆' },
                { id: 'regional', label: 'By Country', icon: '🌍' },
                { id: 'insights', label: 'Network Stats', icon: '💡' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'leaderboard' | 'regional' | 'insights')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-600'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold mb-3 text-gray-300">Filter Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Minimum Measurements</label>
                <input
                  type="number"
                  value={filters.minObservations}
                  onChange={(e) => setFilters(prev => ({ ...prev, minObservations: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-white"
                  min="1"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Filter by Country</label>
                <input
                  type="text"
                  value={filters.region}
                  onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="e.g., USA, France, Japan..."
                  className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Show Top</label>
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 focus:outline-none text-white"
                >
                  <option value={50}>50 people</option>
                  <option value={100}>100 people</option>
                  <option value={200}>200 people</option>
                  <option value={500}>500 people</option>
                </select>
              </div>
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
            <div className="bg-gray-800 rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">📊 Network Highlights</h2>
                <p className="text-sm text-gray-400">Key statistics about the worldwide observation network</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getInsights.map((insight, index) => (
                  <div
                    key={index}
                    className={`rounded-lg p-6 border-l-4 ${
                      insight.type === 'success'
                        ? 'bg-green-900/30 border-green-500'
                        : insight.type === 'info'
                        ? 'bg-blue-900/30 border-blue-500'
                        : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{insight.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold mb-2 text-white">{insight.title}</h3>
                        <p className="text-gray-300 text-sm">{insight.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Educational Content */}
              <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-lg p-6 border border-purple-500/30">
                <h3 className="text-xl font-semibold mb-4 text-white">💡 Why Global Collaboration Matters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-purple-300 mb-2">What Makes a Good Observer</h4>
                    <ul className="space-y-1 text-gray-300">
                      <li>• Regular and consistent measurements</li>
                      <li>• Careful attention to accuracy</li>
                      <li>• Coverage from different locations</li>
                      <li>• Long-term commitment to tracking</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">Benefits of Worldwide Network</h4>
                    <ul className="space-y-1 text-gray-300">
                      <li>• Someone is always watching (24/7 coverage)</li>
                      <li>• Bad weather in one place? Others can observe</li>
                      <li>• Multiple people confirm the same changes</li>
                      <li>• Shared knowledge across cultures</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Footer */}
        <div className="bg-gray-800 rounded-lg p-4 text-center text-sm text-gray-400">
          <p>Last updated: {lastUpdated.toLocaleString()}</p>
          <p className="mt-1">Data from COBS • {observers.length} astronomers contributing</p>
        </div>
      </div>
  );
}