'use client';

import React, { useState, useMemo } from 'react';
import { List } from 'react-window';

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

const ObserverLeaderboard = React.memo(function ObserverLeaderboard({ observers }: ObserverLeaderboardProps) {
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

  const getQualityBadge = React.useCallback((score?: number) => {
    if (!score) return { text: 'Unknown', class: 'bg-[var(--color-bg-tertiary)]' };

    if (score >= 90) return { text: 'Excellent', class: 'bg-green-600' };
    if (score >= 75) return { text: 'Good', class: 'bg-blue-600' };
    if (score >= 50) return { text: 'Fair', class: 'bg-yellow-600' };
    return { text: 'Basic', class: 'bg-red-600' };
  }, []);

  const getFrequencyDescription = React.useCallback((frequency?: number) => {
    if (!frequency) return 'Unknown';
    if (frequency > 1) return 'Daily';
    if (frequency > 0.5) return 'Every 2 days';
    if (frequency > 0.2) return 'Weekly';
    if (frequency > 0.1) return 'Bi-weekly';
    return 'Monthly';
  }, []);

  const formatDate = React.useCallback((dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
  }, []);

  // Row component for virtual scrolling
  const VirtualRow = React.useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const observer = paginatedObservers[index];
    const rank = (currentPage - 1) * pageSize + index + 1;
    const qualityBadge = getQualityBadge(observer.qualityScore);

    return (
      <div
        style={style}
        className="grid grid-cols-[80px_150px_180px_140px_120px_120px_120px_120px_120px] lg:grid-cols-[80px_200px_220px_140px_120px_120px_120px_120px_120px] gap-4 items-center border-b border-[var(--color-border-primary)] hover:bg-[var(--color-bg-tertiary)] transition-colors bg-[var(--color-bg-secondary)]"
      >
        <div className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {rank <= 3 && (
              <span className="mr-2">
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
              </span>
            )}
            <span className="text-[var(--color-text-secondary)] font-medium">#{rank}</span>
          </div>
        </div>
        <div className="px-4 py-4">
          <div>
            <div className="text-sm font-medium text-[var(--color-text-primary)] break-words">{observer.name}</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">{observer.country}</div>
          </div>
        </div>
        <div className="hidden lg:block px-4 py-4">
          <div className="text-sm text-[var(--color-text-secondary)] break-words">
            {observer.location.name}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">
            {observer.location.lat.toFixed(2)}°, {observer.location.lng.toFixed(2)}°
          </div>
        </div>
        <div className="px-4 py-4 whitespace-nowrap text-right">
          <div className="text-sm font-medium text-[var(--color-text-primary)]">
            {observer.observationCount.toLocaleString()}
          </div>
          {observer.totalDays && (
            <div className="text-xs text-[var(--color-text-tertiary)]">
              over {observer.totalDays} days
            </div>
          )}
        </div>
        <div className="hidden lg:block px-4 py-4 whitespace-nowrap text-right">
          <div className="text-sm text-[var(--color-text-secondary)]">
            {observer.observationFrequency?.toFixed(2) || 'N/A'}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">
            {getFrequencyDescription(observer.observationFrequency)}
          </div>
        </div>
        <div className="hidden lg:block px-4 py-4 whitespace-nowrap text-right">
          <div className="text-sm text-[var(--color-text-secondary)]">
            {observer.averageMagnitude?.toFixed(2) || 'N/A'}m
          </div>
          {observer.magnitudePrecision && (
            <div className="text-xs text-[var(--color-text-tertiary)]">
              ±{observer.magnitudePrecision.toFixed(2)}
            </div>
          )}
        </div>
        <div className="px-4 py-4 whitespace-nowrap text-center">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-[var(--color-text-primary)] ${qualityBadge.class}`}>
            {qualityBadge.text}
          </span>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-1 hidden xl:block">
            {observer.qualityScore?.toFixed(0) || 'N/A'}/100
          </div>
        </div>
        <div className="hidden lg:block px-4 py-4 whitespace-nowrap text-right">
          <div className="text-sm text-[var(--color-text-secondary)]">
            {formatDate(observer.latestObservation)}
          </div>
        </div>
        <div className="px-4 py-4 whitespace-nowrap text-center">
          <button
            onClick={() => setSelectedObserver(observer)}
            className="text-blue-400 hover:text-blue-300 text-sm min-h-[48px] px-3 md:min-h-0"
            title="View Details"
          >
            👁️ View
          </button>
        </div>
      </div>
    );
  }, [paginatedObservers, currentPage, pageSize, getQualityBadge, getFrequencyDescription, formatDate]);

  const handleSort = React.useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [sortField, sortDirection]);

  const getSortIcon = React.useCallback((field: SortField) => {
    if (field !== sortField) return '↕️';
    return sortDirection === 'asc' ? '⬆️' : '⬇️';
  }, [sortField, sortDirection]);

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm text-[var(--color-text-tertiary)] mb-1">Search Observers</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or location..."
              className="w-full px-3 py-3 md:py-2 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-secondary)] focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-tertiary)] mb-1">Filter by Country</label>
            <select
              value={filterByCountry}
              onChange={(e) => {
                setFilterByCountry(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-3 md:py-2 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-secondary)] focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-tertiary)] mb-1">Results per Page</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-3 md:py-2 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-secondary)] focus:border-blue-500 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-[var(--color-text-tertiary)]">
          Showing {paginatedObservers.length} of {sortedObservers.length} observers
          {searchTerm && ` matching "${searchTerm}"`}
          {filterByCountry && ` from ${filterByCountry}`}
        </div>
      </div>

      {/* Leaderboard - Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {paginatedObservers.map((observer, index) => {
          const rank = (currentPage - 1) * pageSize + index + 1;
          const qualityBadge = getQualityBadge(observer.qualityScore);

          return (
            <div
              key={observer.id}
              className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-3"
            >
              {/* Header with Rank and Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {rank <= 3 ? (
                      <span className="text-3xl">
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <div className="w-12 h-12 bg-[var(--color-bg-tertiary)] rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-[var(--color-text-secondary)]">#{rank}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{observer.name}</h3>
                    <p className="text-sm text-[var(--color-text-tertiary)]">{observer.country}</p>
                  </div>
                </div>
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full text-[var(--color-text-primary)] ${qualityBadge.class}`}>
                  {qualityBadge.text}
                </span>
              </div>

              {/* Observation Count - Prominent */}
              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {observer.observationCount.toLocaleString()}
                </div>
                <div className="text-sm text-[var(--color-text-tertiary)] mt-1">
                  Observations
                  {observer.totalDays && ` over ${observer.totalDays} days`}
                </div>
              </div>

              {/* Key Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm">
                <div className="bg-[var(--color-bg-tertiary)] rounded p-3">
                  <div className="text-[var(--color-text-tertiary)] mb-1">Location</div>
                  <div className="text-[var(--color-text-primary)] font-medium">{observer.location.name}</div>
                </div>
                <div className="bg-[var(--color-bg-tertiary)] rounded p-3">
                  <div className="text-[var(--color-text-tertiary)] mb-1">Frequency</div>
                  <div className="text-[var(--color-text-primary)] font-medium">{getFrequencyDescription(observer.observationFrequency)}</div>
                </div>
                <div className="bg-[var(--color-bg-tertiary)] rounded p-3">
                  <div className="text-[var(--color-text-tertiary)] mb-1">Avg Magnitude</div>
                  <div className="text-[var(--color-text-primary)] font-medium">{observer.averageMagnitude?.toFixed(2) || 'N/A'}m</div>
                </div>
                <div className="bg-[var(--color-bg-tertiary)] rounded p-3">
                  <div className="text-[var(--color-text-tertiary)] mb-1">Latest</div>
                  <div className="text-[var(--color-text-primary)] font-medium">{formatDate(observer.latestObservation)}</div>
                </div>
              </div>

              {/* View Details Button */}
              <button
                onClick={() => setSelectedObserver(observer)}
                className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 text-[var(--color-text-primary)] font-medium rounded-lg py-3 transition-colors"
              >
                View Details
              </button>
            </div>
          );
        })}
      </div>

      {/* Leaderboard - Tablet/Desktop Table */}
      <div className="hidden md:block bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {/* Table Header */}
          <div className="bg-[var(--color-bg-tertiary)] grid grid-cols-[80px_150px_180px_140px_120px_120px_120px_120px_120px] lg:grid-cols-[80px_200px_220px_140px_120px_120px_120px_120px_120px] gap-4">
            <div className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Rank
            </div>
            <div
              className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => handleSort('name')}
            >
              Observer {getSortIcon('name')}
            </div>
            <div
              className="hidden lg:block px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => handleSort('location')}
            >
              Location {getSortIcon('location')}
            </div>
            <div
              className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => handleSort('observationCount')}
            >
              Observations {getSortIcon('observationCount')}
            </div>
            <div
              className="hidden lg:block px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => handleSort('observationFrequency')}
            >
              Frequency {getSortIcon('observationFrequency')}
            </div>
            <div
              className="hidden lg:block px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => handleSort('averageMagnitude')}
            >
              Avg Mag {getSortIcon('averageMagnitude')}
            </div>
            <div
              className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => handleSort('qualityScore')}
            >
              Quality {getSortIcon('qualityScore')}
            </div>
            <div
              className="hidden lg:block px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-[var(--color-bg-tertiary)]"
              onClick={() => handleSort('latestObservation')}
            >
              Latest {getSortIcon('latestObservation')}
            </div>
            <div className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
              Actions
            </div>
          </div>

          {/* Virtualized Table Body */}
          {paginatedObservers.length > 0 ? (
            <List
              defaultHeight={720}
              rowCount={paginatedObservers.length}
              rowHeight={72}
              rowComponent={VirtualRow}
              rowProps={{} as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              style={{ width: '100%' }}
            />
          ) : (
            <div className="text-center py-12 text-[var(--color-text-tertiary)]">
              No observers found
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-[var(--color-bg-tertiary)] px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-[var(--color-border-secondary)]">
            <div className="text-sm text-[var(--color-text-tertiary)]">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="min-h-[48px] md:min-h-0 px-4 md:px-3 py-3 md:py-1 text-sm bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 rounded"
              >
                Previous
              </button>

              {/* Page numbers */}
              {Array.from(new Set([...Array(Math.min(5, totalPages))].map((_, i) => {
                return Math.max(1, Math.min(totalPages, currentPage - 2 + i));
              }))).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-h-[48px] md:min-h-0 px-4 md:px-3 py-3 md:py-1 text-sm rounded ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="min-h-[48px] md:min-h-0 px-4 md:px-3 py-3 md:py-1 text-sm bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="md:hidden bg-[var(--color-bg-secondary)] rounded-lg p-4">
          <div className="text-sm text-[var(--color-text-tertiary)] text-center mb-4">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="min-h-[48px] px-6 py-3 text-sm bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 rounded-lg font-medium"
            >
              Previous
            </button>

            {/* Page numbers */}
            {Array.from(new Set([...Array(Math.min(5, totalPages))].map((_, i) => {
              return Math.max(1, Math.min(totalPages, currentPage - 2 + i));
            }))).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`min-h-[48px] min-w-[48px] py-3 text-sm rounded-lg font-medium ${
                  pageNum === currentPage
                    ? 'bg-blue-600 text-[var(--color-text-primary)]'
                    : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="min-h-[48px] px-6 py-3 text-sm bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 rounded-lg font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Observer Details Modal */}
      {selectedObserver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 md:p-6 z-50 overflow-y-auto">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg max-w-2xl w-full my-auto max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-4 md:mb-6">
                <div className="flex-1 mr-4">
                  <h2 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">{selectedObserver.name}</h2>
                  <p className="text-sm md:text-base text-[var(--color-text-tertiary)]">{selectedObserver.location.name}</p>
                </div>
                <button
                  onClick={() => setSelectedObserver(null)}
                  className="flex-shrink-0 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] text-2xl md:text-xl min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 flex items-center justify-center"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-3 md:space-y-4">
                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 md:p-4">
                    <h3 className="font-semibold text-blue-300 mb-2 text-sm md:text-base">Observation Statistics</h3>
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Total Observations:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{selectedObserver.observationCount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Observation Frequency:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{getFrequencyDescription(selectedObserver.observationFrequency)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Quality Score:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{selectedObserver.qualityScore?.toFixed(0) || 'N/A'}/100</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Average Brightness:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{selectedObserver.averageMagnitude?.toFixed(2) || 'N/A'}m</span>
                      </div>
                      {selectedObserver.magnitudePrecision && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--color-text-secondary)]">Precision:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">±{selectedObserver.magnitudePrecision.toFixed(2)}m</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 md:p-4">
                    <h3 className="font-semibold text-green-300 mb-2 text-sm md:text-base">Location Details</h3>
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Location:</span>
                        <span className="font-medium text-[var(--color-text-primary)] break-words text-right">{selectedObserver.location.name}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Country:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{selectedObserver.country}</span>
                      </div>
                      {selectedObserver.location.lat !== 0 && selectedObserver.location.lng !== 0 && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--color-text-secondary)]">Coordinates:</span>
                          <span className="font-medium font-mono text-[var(--color-text-primary)] text-xs">
                            {selectedObserver.location.lat.toFixed(4)}°, {selectedObserver.location.lng.toFixed(4)}°
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 md:p-4">
                    <h3 className="font-semibold text-purple-300 mb-2 text-sm md:text-base">Activity Timeline</h3>
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Most Recent:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{formatDate(selectedObserver.latestObservation)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">First Recorded:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{formatDate(selectedObserver.firstObservation)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Tracking Duration:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">{selectedObserver.totalDays || 'N/A'} days</span>
                      </div>
                      {selectedObserver.observationCount && selectedObserver.totalDays && (
                        <div className="flex justify-between gap-2">
                          <span className="text-[var(--color-text-secondary)]">Rate:</span>
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {(selectedObserver.observationCount / selectedObserver.totalDays).toFixed(2)} obs/day
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-3 md:p-4">
                    <h3 className="font-semibold text-yellow-300 mb-2 text-sm md:text-base">Observer Ranking</h3>
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Global Rank:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">#{sortedObservers.findIndex(obs => obs.id === selectedObserver.id) + 1}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-[var(--color-text-secondary)]">Country Rank:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          #{sortedObservers.filter(obs => obs.country === selectedObserver.country)
                            .findIndex(obs => obs.id === selectedObserver.id) + 1}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2 items-center">
                        <span className="text-[var(--color-text-secondary)]">Quality Level:</span>
                        <span className={`font-medium px-2 py-1 rounded text-xs text-[var(--color-text-primary)] ${getQualityBadge(selectedObserver.qualityScore).class}`}>
                          {getQualityBadge(selectedObserver.qualityScore).text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 md:mt-6 pt-4 border-t border-[var(--color-border-secondary)]">
                <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-3 md:p-4">
                  <h4 className="font-semibold text-blue-300 mb-2 text-sm md:text-base">Contribution Summary</h4>
                  <p className="text-xs md:text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    <strong>{selectedObserver.name}</strong> has contributed {selectedObserver.observationCount} brightness measurements
                    to the global tracking effort for comet 3I/ATLAS from {selectedObserver.location.name}.
                    Their observations, averaging {selectedObserver.averageMagnitude?.toFixed(1) || 'N/A'}m in brightness,
                    help astronomers monitor the comet&apos;s activity and behavior as it approaches perihelion.
                    {selectedObserver.observationFrequency && selectedObserver.observationFrequency > 0.5 &&
                      ' This observer provides frequent, consistent data that is valuable for tracking daily changes.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ObserverLeaderboard;