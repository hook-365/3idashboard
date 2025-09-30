'use client';

import React, { useState, useMemo } from 'react';

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

interface ObserverLeaderboardProps {
  observers: AnalyticsObserver[];
}

type SortField = 'name' | 'location' | 'observationCount' | 'averageMagnitude' |
                'magnitudePrecision' | 'latestObservation' | 'observationFrequency' | 'qualityScore';

type SortDirection = 'asc' | 'desc';

export default function ObserverLeaderboard({ observers }: ObserverLeaderboardProps) {
  const [sortField, setSortField] = useState<SortField>('observationCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObserver, setSelectedObserver] = useState<AnalyticsObserver | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filterByCountry, setFilterByCountry] = useState('');

  // Get unique countries for filter
  const countries = useMemo(() => {
    const countrySet = new Set(observers.map(obs => obs.country).filter(Boolean));
    return Array.from(countrySet).sort();
  }, [observers]);

  // Filter and search observers
  const filteredObservers = useMemo(() => {
    return observers.filter(observer => {
      const matchesSearch = !searchTerm ||
        observer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        observer.location.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCountry = !filterByCountry || observer.country === filterByCountry;

      return matchesSearch && matchesCountry;
    });
  }, [observers, searchTerm, filterByCountry]);

  // Sort observers
  const sortedObservers = useMemo(() => {
    return [...filteredObservers].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested location object
      if (sortField === 'location') {
        aValue = a.location.name;
        bValue = b.location.name;
      }

      // Handle undefined values
      if (aValue === undefined) aValue = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bValue === undefined) bValue = sortDirection === 'asc' ? Infinity : -Infinity;

      // Handle dates
      if (sortField === 'latestObservation') {
        aValue = aValue ? new Date(aValue as string).getTime() : 0;
        bValue = bValue ? new Date(bValue as string).getTime() : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [filteredObservers, sortField, sortDirection]);

  // Paginate results
  const paginatedObservers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedObservers.slice(start, end);
  }, [sortedObservers, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedObservers.length / pageSize);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return '↕️';
    return sortDirection === 'asc' ? '⬆️' : '⬇️';
  };

  const getQualityBadge = (score?: number) => {
    if (!score) return { text: 'Unknown', class: 'bg-gray-600' };

    if (score >= 90) return { text: 'Excellent', class: 'bg-green-600' };
    if (score >= 75) return { text: 'Good', class: 'bg-blue-600' };
    if (score >= 50) return { text: 'Fair', class: 'bg-yellow-600' };
    return { text: 'Basic', class: 'bg-red-600' };
  };

  const getFrequencyDescription = (frequency?: number) => {
    if (!frequency) return 'Unknown';
    if (frequency > 1) return 'Daily';
    if (frequency > 0.5) return 'Every 2 days';
    if (frequency > 0.2) return 'Weekly';
    if (frequency > 0.1) return 'Bi-weekly';
    return 'Monthly';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1">Search Observers</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or location..."
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Filter by Country</label>
            <select
              value={filterByCountry}
              onChange={(e) => {
                setFilterByCountry(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Results per Page</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-400">
          Showing {paginatedObservers.length} of {sortedObservers.length} observers
          {searchTerm && ` matching "${searchTerm}"`}
          {filterByCountry && ` from ${filterByCountry}`}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Rank
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  Observer {getSortIcon('name')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('location')}
                >
                  Location {getSortIcon('location')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('observationCount')}
                >
                  Observations {getSortIcon('observationCount')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('observationFrequency')}
                >
                  Frequency {getSortIcon('observationFrequency')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('averageMagnitude')}
                >
                  Avg Mag {getSortIcon('averageMagnitude')}
                </th>
                <th
                  className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('qualityScore')}
                >
                  Quality {getSortIcon('qualityScore')}
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                  onClick={() => handleSort('latestObservation')}
                >
                  Latest {getSortIcon('latestObservation')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {paginatedObservers.map((observer, index) => {
                const rank = (currentPage - 1) * pageSize + index + 1;
                const qualityBadge = getQualityBadge(observer.qualityScore);

                return (
                  <tr
                    key={observer.id}
                    className="hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {rank <= 3 && (
                          <span className="mr-2">
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                          </span>
                        )}
                        <span className="text-gray-300 font-medium">#{rank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-white">{observer.name}</div>
                        <div className="text-xs text-gray-400">{observer.country}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {observer.location.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {observer.location.lat.toFixed(2)}°, {observer.location.lng.toFixed(2)}°
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-white">
                        {observer.observationCount.toLocaleString()}
                      </div>
                      {observer.totalDays && (
                        <div className="text-xs text-gray-400">
                          over {observer.totalDays} days
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-300">
                        {observer.observationFrequency?.toFixed(2) || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getFrequencyDescription(observer.observationFrequency)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-300">
                        {observer.averageMagnitude?.toFixed(2) || 'N/A'}m
                      </div>
                      {observer.magnitudePrecision && (
                        <div className="text-xs text-gray-500">
                          ±{observer.magnitudePrecision.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${qualityBadge.class}`}>
                        {qualityBadge.text}
                      </span>
                      {observer.qualityScore && (
                        <div className="text-xs text-gray-500 mt-1">
                          {observer.qualityScore.toFixed(0)}/100
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-300">
                        {formatDate(observer.latestObservation)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => setSelectedObserver(observer)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                        title="View Details"
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-700 px-4 py-3 flex items-center justify-between border-t border-gray-600">
            <div className="text-sm text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded"
              >
                Previous
              </button>

              {/* Page numbers */}
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded ${
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Observer Details Modal */}
      {selectedObserver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedObserver.name}</h2>
                  <p className="text-gray-400">{selectedObserver.location.name}</p>
                </div>
                <button
                  onClick={() => setSelectedObserver(null)}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-300 mb-2">Observation Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total Observations:</span>
                        <span className="font-medium">{selectedObserver.observationCount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Observation Frequency:</span>
                        <span className="font-medium">{getFrequencyDescription(selectedObserver.observationFrequency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality Score:</span>
                        <span className="font-medium">{selectedObserver.qualityScore?.toFixed(0) || 'N/A'}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Magnitude:</span>
                        <span className="font-medium">{selectedObserver.averageMagnitude?.toFixed(2) || 'N/A'}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-green-300 mb-2">Location Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Country:</span>
                        <span className="font-medium">{selectedObserver.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Coordinates:</span>
                        <span className="font-medium font-mono">
                          {selectedObserver.location.lat.toFixed(4)}°, {selectedObserver.location.lng.toFixed(4)}°
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-300 mb-2">Activity Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Latest Observation:</span>
                        <span className="font-medium">{formatDate(selectedObserver.latestObservation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>First Observation:</span>
                        <span className="font-medium">{formatDate(selectedObserver.firstObservation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Active Period:</span>
                        <span className="font-medium">{selectedObserver.totalDays || 'N/A'} days</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-300 mb-2">Observer Ranking</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Global Rank:</span>
                        <span className="font-medium">#{sortedObservers.findIndex(obs => obs.id === selectedObserver.id) + 1}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Country Rank:</span>
                        <span className="font-medium">
                          #{sortedObservers.filter(obs => obs.country === selectedObserver.country)
                            .findIndex(obs => obs.id === selectedObserver.id) + 1}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality Level:</span>
                        <span className={`font-medium px-2 py-1 rounded text-xs ${getQualityBadge(selectedObserver.qualityScore).class}`}>
                          {getQualityBadge(selectedObserver.qualityScore).text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-600">
                <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-300 mb-2">Contribution Impact</h4>
                  <p className="text-sm text-gray-300">
                    This observer has contributed {selectedObserver.observationCount} observations to the global
                    tracking effort for comet 3I/ATLAS, helping maintain continuous monitoring from {selectedObserver.country}.
                    Their {getQualityBadge(selectedObserver.qualityScore).text.toLowerCase()} quality observations
                    contribute to the scientific understanding of this rare interstellar visitor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}