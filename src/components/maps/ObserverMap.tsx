'use client';

import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import dynamic from 'next/dynamic';
import ExtensionSafeWrapper from '../ExtensionSafeWrapper';
import 'leaflet/dist/leaflet.css';

// Dynamic imports for Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

// Leaflet types and icons - properly typed for client-side usage
let L: typeof import('leaflet');
let DefaultIcon: string;
let MarkerIcon: string;

// Initialize Leaflet only on client-side
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  L = require('leaflet');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DefaultIcon = require('leaflet/dist/images/marker-icon.png');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  MarkerIcon = require('leaflet/dist/images/marker-icon-2x.png');

  // Fix default markers
  delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: MarkerIcon,
    iconUrl: DefaultIcon,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  });
}

export interface ObserverLocation {
  id: string;
  name: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  observationCount: number;
  latestObservation?: string;
  averageMagnitude: number;
  telescope?: string;
}

interface ObserverMapProps {
  observers: ObserverLocation[];
  className?: string;
  height?: string;
  onObserverClick?: (observer: ObserverLocation) => void;
  showClusters?: boolean;
  colorBy?: 'count' | 'quality' | 'recent';
  realTimeUpdates?: boolean;
}

// Create custom marker icons based on observation data
const createCustomIcon = (observer: ObserverLocation, colorBy: string): import('leaflet').DivIcon | null => {
  if (typeof window === 'undefined' || !L) return null;

  let color = '#3b82f6'; // default blue
  let size = 25; // default size

  switch (colorBy) {
    case 'count':
      if (observer.observationCount > 20) {
        color = '#dc2626'; // red for high activity
        size = 35;
      } else if (observer.observationCount > 10) {
        color = '#f59e0b'; // amber for medium activity
        size = 30;
      } else if (observer.observationCount > 5) {
        color = '#10b981'; // green for some activity
        size = 25;
      } else {
        color = '#6b7280'; // gray for low activity
        size = 20;
      }
      break;

    case 'quality':
      if (observer.averageMagnitude < 12.0) {
        color = '#059669'; // excellent quality (brighter)
        size = 30;
      } else if (observer.averageMagnitude < 13.0) {
        color = '#0891b2'; // good quality
        size = 25;
      } else {
        color = '#7c3aed'; // fair quality
        size = 20;
      }
      break;

    case 'recent':
      if (observer.latestObservation) {
        const daysSinceLastObs = Math.floor(
          (Date.now() - new Date(observer.latestObservation).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceLastObs < 1) {
          color = '#dc2626'; // red for today
          size = 35;
        } else if (daysSinceLastObs < 7) {
          color = '#f59e0b'; // amber for this week
          size = 30;
        } else if (daysSinceLastObs < 30) {
          color = '#10b981'; // green for this month
          size = 25;
        } else {
          color = '#6b7280'; // gray for older
          size = 20;
        }
      }
      break;
  }

  return new L.DivIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        font-size: ${Math.max(10, size * 0.4)}px;
        color: white;
        font-weight: bold;
      ">
        ${observer.observationCount}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const ObserverMap = memo(function ObserverMap({
  observers = [],
  className = '',
  height = '500px',
  onObserverClick,
  colorBy = 'count',
  realTimeUpdates = false,
}: ObserverMapProps) {
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [selectedObserver, setSelectedObserver] = useState<ObserverLocation | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter observers with valid coordinates
  const validObservers = useMemo(() => {
    return observers.filter(observer =>
      observer.location.lat !== undefined &&
      observer.location.lng !== undefined &&
      !isNaN(observer.location.lat) &&
      !isNaN(observer.location.lng)
    );
  }, [observers]);

  // Calculate map bounds to fit all observers
  const mapBounds = useMemo(() => {
    if (validObservers.length === 0) return null;

    const lats = validObservers.map(obs => obs.location.lat);
    const lngs = validObservers.map(obs => obs.location.lng);

    return [
      [Math.min(...lats) - 5, Math.min(...lngs) - 5],
      [Math.max(...lats) + 5, Math.max(...lngs) + 5],
    ];
  }, [validObservers]);

  // Handle observer selection
  const handleObserverClick = (observer: ObserverLocation) => {
    setSelectedObserver(observer);
    onObserverClick?.(observer);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No recent observations';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Get color explanation text
  const getColorExplanation = () => {
    switch (colorBy) {
      case 'count':
        return {
          title: 'Colored by Observation Count',
          legend: [
            { color: '#dc2626', label: '20+ observations', size: 35 },
            { color: '#f59e0b', label: '10-20 observations', size: 30 },
            { color: '#10b981', label: '5-10 observations', size: 25 },
            { color: '#6b7280', label: '<5 observations', size: 20 },
          ]
        };
      case 'quality':
        return {
          title: 'Colored by Average Magnitude Quality',
          legend: [
            { color: '#059669', label: 'Excellent (<12.0m)', size: 30 },
            { color: '#0891b2', label: 'Good (12.0-13.0m)', size: 25 },
            { color: '#7c3aed', label: 'Fair (>13.0m)', size: 20 },
          ]
        };
      case 'recent':
        return {
          title: 'Colored by Recent Activity',
          legend: [
            { color: '#dc2626', label: 'Today', size: 35 },
            { color: '#f59e0b', label: 'This week', size: 30 },
            { color: '#10b981', label: 'This month', size: 25 },
            { color: '#6b7280', label: 'Older', size: 20 },
          ]
        };
      default:
        return { title: '', legend: [] };
    }
  };

  const colorInfo = getColorExplanation();

  if (!isClient) {
    return (
      <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-6 ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-[var(--color-text-tertiary)]">Loading world map...</div>
        </div>
      </div>
    );
  }

  if (validObservers.length === 0) {
    return (
      <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-6 ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-[var(--color-text-tertiary)]">
            <div className="text-xl mb-2">🌍</div>
            <div>No observer locations available</div>
            <div className="text-sm mt-1">Waiting for observation data with coordinates...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className={`bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden ${className}`}>
        {/* Header with controls */}
        <div className="p-4 border-b border-[var(--color-border-primary)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Global Observer Network</h3>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                {validObservers.length} active observers worldwide
                {realTimeUpdates && (
                  <span className="ml-2 inline-flex items-center">
                    <span className="animate-pulse w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                    Live
                  </span>
                )}
              </p>
            </div>

            {/* Color mode selector */}
            <div className="flex gap-2">
              {['count', 'quality', 'recent'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => {}}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    colorBy === mode
                      ? 'bg-blue-600 text-[var(--color-text-primary)]'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ height: height }} className="relative">
          <MapContainer
            ref={mapRef}
            bounds={mapBounds as [[number, number], [number, number]] || [[0, 0], [0, 0]]}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Note: Clustering temporarily disabled due to React 19 compatibility */}
            {validObservers.map((observer) => (
              <Marker
                key={observer.id}
                position={[observer.location.lat, observer.location.lng]}
                icon={createCustomIcon(observer, colorBy) || undefined}
                eventHandlers={{
                  click: () => handleObserverClick(observer),
                }}
              >
                <Popup>
                  <div className="max-w-xs">
                    <h4 className="font-semibold text-gray-900 mb-2">{observer.name}</h4>
                    <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                      <p><strong>Location:</strong> {observer.location.name}</p>
                      <p><strong>Observations:</strong> {observer.observationCount}</p>
                      <p><strong>Avg Magnitude:</strong> {observer.averageMagnitude.toFixed(2)}m</p>
                      <p><strong>Last Observed:</strong> {formatDate(observer.latestObservation)}</p>
                      {observer.telescope && (
                        <p><strong>Telescope:</strong> {observer.telescope}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleObserverClick(observer)}
                      className="mt-2 w-full bg-blue-600 text-[var(--color-text-primary)] px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">{colorInfo.title}</h4>
              <div className="flex flex-wrap gap-3">
                {colorInfo.legend.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div
                      style={{
                        width: `${Math.min(item.size, 20)}px`,
                        height: `${Math.min(item.size, 20)}px`,
                        backgroundColor: item.color,
                        borderRadius: '50%',
                        border: '1px solid white',
                      }}
                    />
                    <span className="text-xs text-[var(--color-text-secondary)]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-[var(--color-text-tertiary)]">
                <p>• Click markers for observer details</p>
                <p>• Individual markers (clustering unavailable)</p>
                <p>• Numbers show observation count</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selected observer details modal/panel */}
        {selectedObserver && (
          <div className="absolute top-4 right-4 bg-[var(--color-bg-primary)] rounded-lg p-4 shadow-lg border border-[var(--color-border-secondary)] max-w-xs z-10">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-[var(--color-text-primary)]">{selectedObserver.name}</h4>
              <button
                onClick={() => setSelectedObserver(null)}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] ml-2"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
              <p><strong>Location:</strong> {selectedObserver.location.name}</p>
              <p><strong>Coordinates:</strong> {selectedObserver.location.lat.toFixed(4)}, {selectedObserver.location.lng.toFixed(4)}</p>
              <p><strong>Total Observations:</strong> {selectedObserver.observationCount}</p>
              <p><strong>Average Magnitude:</strong> {selectedObserver.averageMagnitude.toFixed(2)}m</p>
              <p><strong>Last Active:</strong> {formatDate(selectedObserver.latestObservation)}</p>
            </div>
          </div>
        )}
      </div>
    </ExtensionSafeWrapper>
  );
});

export default ObserverMap;