'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import MissionStatusWidget, { MissionStatusData } from '../components/charts/MissionStatusWidget';
import ExtensionSafeWrapper from '../components/ExtensionSafeWrapper';
import PageNavigation from '../components/common/PageNavigation';
import AppHeader from '../components/common/AppHeader';
import DataAttribution from '../components/common/DataAttribution';
import { calculateActivityFromAPIData } from '../utils/activity-calculator';
import { APIErrorBoundary, VisualizationErrorBoundary } from '../components/common/ErrorBoundary';
import { MissionStatusSkeleton } from '../components/common/CardSkeleton';
import { CollaborationStatsSkeleton } from '../components/common/StatsSkeleton';
import TableSkeleton, { TableSkeletonMobile } from '../components/common/TableSkeleton';
import WhereToLookCard from '../components/common/WhereToLookCard';
import CanISeeItBanner from '../components/common/CanISeeItBanner';
import EquipmentGuide from '../components/common/EquipmentGuide';
import { calculateObservability } from '../utils/formatCoordinates';
import ChartSkeleton from '../components/common/ChartSkeleton';
import { useCometData } from '@/hooks';

// Dynamically import 3D visualization
const ModernSolarSystem = dynamic(() => import('../components/visualization/ModernSolarSystem'), {
  loading: () => <ChartSkeleton height={600} showLegend={true} />,
  ssr: false
});

// Define observation interface for type safety
interface Observation {
  id: string;
  date: string;
  magnitude: number;
  filter?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  observer?: {
    name?: string;
    location?: string;
  };
}

// Enhanced Latest Observations Component with rich visual display
function LatestObservationsCollapsible({ observations }: { observations: Observation[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayedObservations = isExpanded ? observations.slice(0, 5) : observations.slice(0, 1);

  const getQualityBadge = (quality?: string) => {
    if (!quality) return null;
    const colors = {
      excellent: 'bg-green-500/20 text-green-400 border-green-500/30',
      good: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      fair: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      poor: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${colors[quality as keyof typeof colors] || colors.fair}`}>
        {quality}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return '< 1 hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[var(--color-text-heading)] flex items-center gap-2">
          <span>🔭</span> Latest Observations
        </h3>
        <a
          href="/observations"
          className="text-sm text-[var(--color-chart-primary)] hover:opacity-80 transition-opacity"
        >
          View all observations →
        </a>
      </div>

      {/* Rich card-based layout */}
      <div className="space-y-3">
        {displayedObservations.map((obs, idx) => (
          <div
            key={obs.id}
            className={`bg-[var(--color-bg-tertiary)] rounded-lg p-4 border border-[var(--color-border-primary)] hover:border-[var(--color-chart-primary)] transition-all ${idx === 0 ? 'ring-2 ring-[var(--color-chart-primary)]/30' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: Observer Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-chart-primary)] to-[var(--color-chart-secondary)] flex items-center justify-center text-white font-bold text-sm">
                    {obs.observer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--color-text-primary)]">{obs.observer.name}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{obs.observer.location?.name || 'Unknown location'}</div>
                  </div>
                </div>

                {/* Observation Details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)] ml-10">
                  <div className="flex items-center gap-1">
                    <span className="text-[var(--color-text-tertiary)]">📅</span>
                    <span>{formatDate(obs.date)}</span>
                  </div>
                  {obs.aperture && (
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--color-text-tertiary)]">🔭</span>
                      <span>{obs.aperture}mm aperture</span>
                    </div>
                  )}
                  {obs.coma && (
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--color-text-tertiary)]">☁️</span>
                      <span>Coma: {obs.coma.toFixed(1)}'</span>
                    </div>
                  )}
                  {obs.filter && (
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--color-text-tertiary)]">🎨</span>
                      <span>Filter: {obs.filter}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Magnitude & Quality */}
              <div className="text-right flex flex-col items-end gap-2">
                <div>
                  <div className="text-2xl font-bold font-mono text-[var(--color-status-success)]">
                    {obs.magnitude.toFixed(2)}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">mag</div>
                </div>
                {obs.quality && getQualityBadge(obs.quality)}
                {idx === 0 && (
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-chart-primary)]/20 text-[var(--color-chart-primary)] border border-[var(--color-chart-primary)]/30">
                    Latest
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {observations.length > 1 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 w-full py-2 px-4 rounded bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-sm text-[var(--color-chart-primary)] hover:opacity-80 transition-all flex items-center justify-center gap-2"
        >
          {isExpanded ? (
            <>
              <span>▲</span> Show less
            </>
          ) : (
            <>
              <span>▼</span> Show {Math.min(4, observations.length - 1)} more recent observation{observations.length - 1 === 1 ? '' : 's'}
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface ObserverInfo {
  id: string;
  name: string;
  location: {
    name: string;
    lat?: number;
    lng?: number;
  };
}

interface ObservationData {
  id: string;
  date: string;
  magnitude: number;
  observer: ObserverInfo;
  filter?: string;
  aperture?: number;
  coma?: number;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

interface LightCurveData {
  date: string;
  magnitude: number;
  source?: string;
  observer?: string;
  filter?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

interface CometStats {
  totalObservations: number;
  activeObservers: number;
  currentMagnitude: number;
  daysUntilPerihelion: number;
  trend?: {
    direction: 'brightening' | 'dimming' | 'stable';
    rate: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

interface CometInfo {
  name: string;
  designation: string;
  magnitude: number;
  perihelion_date: string;
  lightCurve?: LightCurveData[];
  observations?: ObservationData[];
  individualObservations?: LightCurveData[];
}

interface CometData {
  comet: CometInfo;
  stats: CometStats;
  observers: ObserverInfo[];
  source_status?: {
    cobs?: { active: boolean; last_updated: string; error?: string };
    jpl_horizons?: { active: boolean; last_updated: string; error?: string };
    theskylive?: { active: boolean; last_updated: string; error?: string };
    mpc?: { active: boolean; last_updated: string; error?: string };
  };
  jpl_ephemeris?: {
    current_position?: {
      ra: number;
      dec: number;
      magnitude: number;
      last_updated: string;
    };
    time_series?: Array<{
      date: string;
      ra: number;
      dec: number;
      delta: number;
      r: number;
      magnitude: number;
    }>;
  };
}

export default function Home() {
  // 🚀 SWR automatically caches, deduplicates, and revalidates data
  const { data, isLoading, error } = useCometData({
    smooth: true,
    predict: true,
    limit: 200,
    trendDays: 30,
  });

  // Calculate mission status from SWR data (memoized for performance)
  const missionStatus = useMemo(() => {
    if (!data) return null;

    // Check if we have enhanced data with orbital_mechanics
    const hasEnhancedData = !!data.orbital_mechanics;

    // Validate that we have minimum required data
    // For COBS-only mode: need magnitude and basic stats
    // For enhanced mode: need orbital_mechanics + magnitude
    // Note: magnitude of 0 means no real data available (mock/fallback)
    const hasMinimumData = data.comet?.currentMagnitude !== undefined &&
                          data.comet.currentMagnitude > 0;

    if (!hasMinimumData) {
      console.warn('Insufficient data - no valid magnitude available for mission status', {
        magnitude: data.comet?.currentMagnitude
      });
      return null;
    }

    // If we don't have enhanced orbital mechanics data, we can't show mission status
    // (need distance, velocity, etc. for the widget)
    if (!hasEnhancedData) {
      console.warn('Enhanced orbital mechanics data unavailable - mission status not set (COBS-only fallback mode)');
      return null;
    }

    // Validate enhanced data completeness
    const hasCompleteEnhancedData = data.orbital_mechanics?.current_distance?.heliocentric &&
                                     data.orbital_mechanics?.current_velocity?.heliocentric;

    if (!hasCompleteEnhancedData) {
      console.warn('Incomplete enhanced data - mission status not set', {
        has_distance: !!data.orbital_mechanics?.current_distance?.heliocentric,
        has_velocity: !!data.orbital_mechanics?.current_velocity?.heliocentric,
        has_magnitude: !!data.comet?.currentMagnitude,
      });
      return null;
    }

    // Create mission status data from real enhanced sources
    return {
      current_distance_au: data.orbital_mechanics.current_distance.heliocentric,
      days_to_perihelion: Math.floor(
        (new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      current_velocity_km_s: data.orbital_mechanics.current_velocity.heliocentric,
      // Calculate velocity trend from acceleration data
      velocity_trend: (() => {
        const acceleration = data.orbital_mechanics?.velocity_changes?.acceleration || 0;
        // Use 0.00001 km/s² threshold (0.864 km/s per day)
        if (acceleration > 0.00001) return 'accelerating' as const;
        if (acceleration < -0.00001) return 'decelerating' as const;
        return 'constant' as const;
      })(),
      // Calculate brightness trend from trend analysis
      brightness_trend: (() => {
        const trendAnalysis = data.stats?.trendAnalysis;
        if (!trendAnalysis) return undefined;
        return trendAnalysis.trend === 'brightening' ? 'brightening' as const :
               trendAnalysis.trend === 'dimming' ? 'dimming' as const : 'stable' as const;
      })(),
      activity_level: (() => {
        // Calculate real activity level from observational data
        const observations = data.comet.observations || [];
        const heliocentric_distance = data.orbital_mechanics.current_distance.heliocentric;

        // Use latest observation for activity calculation (same as simple-activity API)
        if (observations.length === 0) {
          return 'INSUFFICIENT_DATA' as const;
        }

        const latestObservation = observations[0]; // Observations are sorted newest first
        const realActivity = calculateActivityFromAPIData(
          [latestObservation], // Pass single latest observation, not entire array
          { ephemeris: { r: heliocentric_distance } }
        );
        return realActivity.level;
      })(),
      source_health: {
        cobs: data.source_status?.cobs?.active || false,
        jpl: data.source_status?.jpl_horizons?.active || false,
        theskylive: data.source_status?.theskylive?.active || false,
      },
      last_update: new Date().toISOString(),
      brightness_magnitude: data.comet.currentMagnitude,
      geocentric_distance_au: data.orbital_mechanics.current_distance.geocentric,
      // Add ephemeris data if available
      jpl_ephemeris: data.jpl_ephemeris,
    } as MissionStatusData;
  }, [data]);

  if (isLoading) {
    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
          {/* Header */}
          <AppHeader sourceStatus={undefined} />

          {/* Navigation */}
          <PageNavigation />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Mission Status Widget Skeleton */}
            <MissionStatusSkeleton className="mb-8" />

            {/* Global Collaboration Stats Skeleton */}
            <CollaborationStatsSkeleton className="mb-8" showDescription={true} />

            {/* Recent Observations Table - Desktop */}
            <div className="hidden md:block">
              <TableSkeleton rows={8} columns={8} className="mb-8" />
            </div>

            {/* Recent Observations Cards - Mobile */}
            <div className="md:hidden">
              <TableSkeletonMobile rows={8} className="mb-8" />
            </div>
          </div>
        </div>
      </ExtensionSafeWrapper>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Header */}
      <AppHeader sourceStatus={data?.source_status} />

      {/* Navigation */}
      <PageNavigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Hero Section */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--color-chart-primary)] via-[var(--color-chart-secondary)] to-[var(--color-chart-tertiary)] bg-clip-text text-transparent mb-3">
            3I/ATLAS Mission Control
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
            Following humanity&apos;s third-ever interstellar visitor on its journey through our solar system
          </p>
        </div>

        {/* Mission Status - TOP PRIORITY */}
        <APIErrorBoundary>
          <section id="mission-status" className="mb-8">
            <MissionStatusWidget
              data={missionStatus || undefined}
              loading={isLoading}
              simplified={true}
              visibilityData={data?.jpl_ephemeris?.current_position && data?.comet?.currentMagnitude ? {
                isVisible: calculateObservability(
                  data.jpl_ephemeris.current_position.ra,
                  data.jpl_ephemeris.current_position.dec,
                  new Date(data.jpl_ephemeris.current_position.last_updated)
                ).visible,
                magnitude: data.comet.currentMagnitude,
                nextVisibleDate: "November 20-25, 2025",
                reason: calculateObservability(
                  data.jpl_ephemeris.current_position.ra,
                  data.jpl_ephemeris.current_position.dec,
                  new Date(data.jpl_ephemeris.current_position.last_updated)
                ).reason
              } : undefined}
            />
          </section>
        </APIErrorBoundary>

        {/* Solar System Position - Boxed */}
        <section id="3d-position" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-secondary)]">
          <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-4 flex items-center gap-3">
            <span>🌌</span> 3D View of 3I/ATLAS Current Position
          </h2>
          <VisualizationErrorBoundary>
            <div className="rounded-lg overflow-hidden border border-[var(--color-border-primary)]">
              <ModernSolarSystem
                centerMode="default"
                autoPlay={false}
                showControls={true}
                followComet={true}
              />
            </div>
          </VisualizationErrorBoundary>
        </section>

        {/* Where to Look Card - Only show when actually visible */}
        {data?.jpl_ephemeris?.current_position && calculateObservability(
          data.jpl_ephemeris.current_position.ra,
          data.jpl_ephemeris.current_position.dec,
          new Date(data.jpl_ephemeris.current_position.last_updated)
        ).visible && (
          <section id="where-to-look" className="mb-8">
            <WhereToLookCard
              position={{
                ra: data.jpl_ephemeris.current_position.ra,
                dec: data.jpl_ephemeris.current_position.dec,
                lastUpdated: data.jpl_ephemeris.current_position.last_updated,
              }}
            />
          </section>
        )}

        {/* Combined Observer Network Section */}
        {data?.stats && data?.comet?.observations && (
          <section id="observer-network" className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[var(--color-text-heading)]">🌍 Global Observer Network - 3I/ATLAS</h3>
              <a
                href="/observations"
                className="text-sm text-[var(--color-chart-primary)] hover:opacity-80 transition-opacity"
              >
                All observations →
              </a>
            </div>

            {/* Stats Grid - 4 boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Observations */}
              <div className="bg-gradient-to-br from-blue-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 text-center border border-blue-500/30 hover:scale-105 transition-transform">
                <div className="text-3xl mb-1">📊</div>
                <div className="text-2xl font-bold text-blue-400 mb-1">{data.stats.totalObservations}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Total Observations</div>
              </div>

              {/* Active Observers */}
              <div className="bg-gradient-to-br from-green-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 text-center border border-green-500/30 hover:scale-105 transition-transform">
                <div className="text-3xl mb-1">👥</div>
                <div className="text-2xl font-bold text-green-400 mb-1">{data.stats.activeObservers}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Active Observers</div>
              </div>

              {/* Latest Observation - Centered like others */}
              <div className="bg-gradient-to-br from-purple-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 text-center border border-purple-500/30 hover:scale-105 transition-transform">
                <div className="text-3xl mb-1">🔭</div>
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {data.comet.observations[0].magnitude.toFixed(2)}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">Most Recent Magnitude</div>
                <div className="text-xs text-[var(--color-text-tertiary)] truncate">
                  {data.comet.observations[0].observer.name}
                </div>
                <div className="text-xs text-[var(--color-text-tertiary)]">
                  {new Date(data.comet.observations[0].date).toLocaleDateString('en-US', {
                    timeZone: 'UTC',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>

              {/* Join the Network */}
              <a
                href="https://cobs.si/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-br from-orange-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 border border-orange-500/30 hover:scale-105 transition-transform text-center group cursor-pointer"
              >
                <div className="text-3xl mb-1">🚀</div>
                <div className="text-lg font-bold text-orange-400 mb-1 group-hover:text-orange-300 transition-colors">
                  Join Network
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">Contribute Observations</div>
              </a>
            </div>
          </section>
        )}

        {/* Equipment Guide - What Will You See? */}
        {data?.comet?.currentMagnitude && (
          <section id="equipment-guide" className="mb-8">
            <EquipmentGuide
              magnitude={data.comet.currentMagnitude}
              isVisible={data?.jpl_ephemeris?.current_position ? calculateObservability(
                data.jpl_ephemeris.current_position.ra,
                data.jpl_ephemeris.current_position.dec,
                new Date(data.jpl_ephemeris.current_position.last_updated)
              ).visible : true}
            />
          </section>
        )}

        {/* Data Attribution Footer */}
        <DataAttribution full={true} />
          </div>
        </div>
      </ExtensionSafeWrapper>
    );
  }
