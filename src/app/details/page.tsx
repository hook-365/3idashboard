'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import type { LightCurveDataPoint } from '@/components/charts/LightCurve';
import BrightnessStats from '@/components/stats/BrightnessStats';
import type { ActivityIndexDataPoint } from '@/components/charts/ActivityLevelChart';
import type { VelocityDataPoint } from '@/components/charts/VelocityChart';
import type { OrbitalVelocityDataPoint } from '@/components/charts/OrbitalVelocityChart';
import type { MorphologyDataPoint } from '@/components/charts/ComaAndTailChart';
import PageNavigation from '@/components/common/PageNavigation';
import AppHeader from '@/components/common/AppHeader';
import DataAttribution from '@/components/common/DataAttribution';
import { MissionStatusData } from '@/components/charts/MissionStatusWidget';
import SectionNavigator from '@/components/common/SectionNavigator';
import { ANALYTICS_DATE_CONFIG } from '@/utils/analytics-config';
import { ChartErrorBoundary, VisualizationErrorBoundary } from '@/components/common/ErrorBoundary';
import { calculatePositionFromElements } from '@/lib/orbital-calculations';
import ChartSkeleton from '@/components/common/ChartSkeleton';
import { VisualizationSkeleton } from '@/components/common/CardSkeleton';
import CardSkeleton from '@/components/common/CardSkeleton';
import OrbitalElementsComparison from '@/components/orbital/OrbitalElementsComparison';
import type { MPCOrbitalElements } from '@/types/enhanced-comet-data';
import type { JPLHorizonsData } from '@/lib/data-sources/jpl-horizons';
import CurrentPositionBanner from '@/components/common/CurrentPositionBanner';
import InfoTooltip from '@/components/common/InfoTooltip';
import CanISeeItBanner from '@/components/common/CanISeeItBanner';
import SimpleSkyCompass from '@/components/charts/SimpleSkyCompass';
import MagnitudeScale from '@/components/charts/MagnitudeScale';
import { formatDistance } from '@/utils/unit-conversions';
import ScientificControversySection from '@/components/science/ScientificControversySection';
import HowWeCalculate from '@/components/common/HowWeCalculate';
import AccuracyBadge from '@/components/common/AccuracyBadge';
import ScrollHashUpdater from '@/components/common/ScrollHashUpdater';
import MobileViewBanner from '@/components/common/MobileViewBanner';
import { useCometData, useObservers, useActivity, useVelocity, useOrbitalVelocity } from '@/hooks';

// Dynamically import heavy 3D component (~500KB)
const ModernSolarSystem = dynamic(() => import('@/components/visualization/ModernSolarSystem'), {
  loading: () => (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 h-[600px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[var(--color-chart-senary)] rounded-full mb-4"></div>
        <div className="text-[var(--color-text-tertiary)]">Loading 3D Visualization...</div>
      </div>
    </div>
  ),
  ssr: false,
});

// Dynamically import Chart.js components to reduce initial bundle size (~150KB saved)
const LightCurve = dynamic(() => import('@/components/charts/LightCurve'), {
  loading: () => <ChartSkeleton height={384} showLegend={true} />,
  ssr: false
});

const ActivityLevelChart = dynamic(() => import('@/components/charts/ActivityLevelChart'), {
  loading: () => <ChartSkeleton height={400} showLegend={true} />,
  ssr: false
});

const VelocityChart = dynamic(() => import('@/components/charts/VelocityChart'), {
  loading: () => <ChartSkeleton height={400} showLegend={true} />,
  ssr: false
});

const OrbitalVelocityChart = dynamic(() => import('@/components/charts/OrbitalVelocityChart'), {
  loading: () => <ChartSkeleton height={400} showLegend={true} />,
  ssr: false
});

const ComaAndTailChart = dynamic(() => import('@/components/charts/ComaAndTailChart'), {
  loading: () => <ChartSkeleton height={400} showLegend={true} />,
  ssr: false
});

// SkyPositionChart removed - not currently used
// const SkyPositionChart = dynamic(() => import('@/components/charts/SkyPositionChart'), {
//   loading: () => <ChartSkeleton height={500} showLegend={true} />,
//   ssr: false
// });

// Compact Visibility Status Component
function VisibilityStatusCompact({
  isVisible,
  magnitude,
  nextVisibleDate,
  reason,
  ra,
  dec
}: {
  isVisible: boolean;
  magnitude?: number;
  nextVisibleDate: string;
  reason: string;
  ra: number;
  dec: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use subtle blue-gray for "not visible" instead of alarming red
  const statusColor = isVisible
    ? 'from-green-500/10 to-blue-500/10 border-blue-500/30'
    : 'from-slate-500/10 to-blue-500/10 border-slate-500/30';

  const iconColor = isVisible ? 'text-green-400' : 'text-slate-400';
  const icon = isVisible ? '👁️' : '🌑';

  return (
    <div className={`mb-8 bg-gradient-to-r ${statusColor} border-2 rounded-lg overflow-hidden`}>
      {/* Compact header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div className="text-left">
            <div className="text-sm text-[var(--color-text-tertiary)]">Current Visibility</div>
            <div className="font-semibold text-[var(--color-text-primary)]">
              {isVisible ? 'Observable tonight' : 'Not currently observable'}
              {!isVisible && <span className="text-sm text-[var(--color-text-secondary)] ml-2">• {reason}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isVisible && (
            <div className="text-right">
              <div className="text-xs text-[var(--color-text-tertiary)]">Next visible</div>
              <div className="text-sm font-semibold text-[var(--color-chart-primary)]">{nextVisibleDate}</div>
            </div>
          )}
          <span className={`text-[var(--color-text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border-primary)] p-6 bg-black/10">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Sky Position Compass - Compact */}
            <div className="flex-shrink-0">
              <SimpleSkyCompass
                ra={ra}
                dec={dec}
                isVisible={isVisible}
                magnitude={magnitude}
              />
            </div>

            {/* Details - Takes remaining space */}
            <div className="flex-1 space-y-3">
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Sky Position & Details</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Right Ascension:</span>
                  <span className="font-mono text-[var(--color-text-primary)]">{ra.toFixed(2)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Declination:</span>
                  <span className="font-mono text-[var(--color-text-primary)]">{dec > 0 ? '+' : ''}{dec.toFixed(2)}°</span>
                </div>
                {magnitude && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-[var(--color-text-secondary)]">Magnitude:</span>
                    <span className="font-mono text-[var(--color-text-primary)]">{magnitude.toFixed(1)}</span>
                  </div>
                )}
              </div>
              {!isVisible && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-[var(--color-text-secondary)]">
                  <strong className="text-[var(--color-text-primary)]">Why hidden?</strong> {reason}. The comet will re-emerge in late November when Earth has moved to a position where the comet is no longer behind the Sun.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Data interfaces
interface ObservationData {
  id: string;
  date: string;
  magnitude: number;
  filter?: string;
  observer: {
    id: string;
    name: string;
    location: string;
  };
  telescope?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  coordinates?: {
    ra: number;
    dec: number;
  };
}




interface AnalyticsPageState {
  lightCurveData: LightCurveDataPoint[];
  observationData: ObservationData[];
  activityData: ActivityIndexDataPoint[];
  brightnessVelocityData: VelocityDataPoint[];
  orbitalVelocityData: OrbitalVelocityDataPoint[];
  accelerationData: VelocityDataPoint[];
  morphologyData: MorphologyDataPoint[];
  missionStatus: MissionStatusData | null;
  trendAnalysis: {
    trend: 'brightening' | 'dimming' | 'stable';
    rate: number;
    confidence: number;
    periodDays: number;
    r2: number;
  } | null;
  mpcOrbitalElements?: MPCOrbitalElements;
  jplHorizonsData?: JPLHorizonsData | null;
  ephemerisPosition?: {
    ra: number;
    dec: number;
    last_updated: string;
    data_source?: string;
  };
}

export default function AnalyticsPage() {
  // 🚀 SWR hooks - these will deduplicate and cache across all pages!
  const { QUERY_PARAMS } = ANALYTICS_DATE_CONFIG;

  const { data: cometData, isLoading: cometLoading, error: cometError } = useCometData({
    smooth: true,
    predict: true,
    limit: 200,
    trendDays: 30,
  });

  const { observerMap, statistics: observerStats, isLoading: observersLoading, error: observersError } = useObservers({
    stats: true,
    format: 'map',
  });

  const { activityData, currentActivity, isLoading: activityLoading, error: activityError } = useActivity(QUERY_PARAMS.days);

  const { velocityData: brightnessVelocity, isLoading: velocityLoading, error: velocityError } = useVelocity('brightness', {
    smoothingWindow: 7,
    limit: QUERY_PARAMS.limit,
    days: QUERY_PARAMS.days,
  });

  const { velocityData: orbitalVelocity, isLoading: orbitalVelocityLoading, error: orbitalVelocityError } = useOrbitalVelocity(QUERY_PARAMS.days);

  // Combine loading states
  const loading = cometLoading || observersLoading || activityLoading || velocityLoading || orbitalVelocityLoading;

  // Combine all errors for comprehensive error display
  const errors = [
    cometError ? 'Comet data: ' + (cometError instanceof Error ? cometError.message : String(cometError)) : null,
    observersError ? 'Observers: ' + (observersError instanceof Error ? observersError.message : String(observersError)) : null,
    activityError ? 'Activity: ' + (activityError instanceof Error ? activityError.message : String(activityError)) : null,
    velocityError ? 'Velocity: ' + (velocityError instanceof Error ? velocityError.message : String(velocityError)) : null,
    orbitalVelocityError ? 'Orbital velocity: ' + (orbitalVelocityError instanceof Error ? orbitalVelocityError.message : String(orbitalVelocityError)) : null,
  ].filter(Boolean);

  const error = errors.length > 0 ? errors.join(' | ') : null;

  // Lazy-load 3D visualization after initial page render
  const [shouldLoadVisualization, setShouldLoadVisualization] = useState(false);

  // Load visualization after a short delay to prioritize initial page content
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoadVisualization(true);
    }, 1000); // 1 second delay for better initial load performance

    return () => clearTimeout(timer);
  }, []);

  // Handle hash navigation - scroll to section after page loads
  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        // Wait a bit for the page to finish rendering
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    }
  }, [loading]);


  // Transform SWR data for components (memoized for performance)
  const state = useMemo(() => {
    if (!cometData || !Array.isArray(activityData) || !Array.isArray(brightnessVelocity) || !Array.isArray(orbitalVelocity)) {
      return null;
    }

    const observations = cometData.comet?.observations || [];
    const lightCurve = cometData.comet?.lightCurve || [];

    // Transform observations for morphology (coma/tail)
    const morphologyData: MorphologyDataPoint[] = observations
      .filter((obs: ObservationData) => obs.coma !== undefined || obs.tail !== undefined)
      .map((obs: ObservationData) => ({
        date: obs.date,
        comaSize: obs.coma,
        tailLength: obs.tail,
        observer: obs.observer ? {
          name: obs.observer.name,
          telescope: obs.observer.telescope || 'Unknown',
          location: obs.observer.location || 'Unknown'
        } : undefined,
        quality: obs.quality
      }));

    // Transform light curve
    const lightCurveData: LightCurveDataPoint[] = lightCurve.map((point: LightCurveDataPoint) => ({
      date: new Date(point.date).toISOString(),
      magnitude: point.magnitude,
      source: 'COBS',
      observer: 'COBS Network',
      quality: 'good' as const
    }));

    // Transform observations
    const observationData = observations.map((obs: ObservationData) => ({
      id: obs.id,
      date: obs.date,
      magnitude: obs.magnitude,
      filter: obs.filter || 'Visual',
      observer: {
        id: obs.observer?.id || 'unknown',
        name: obs.observer?.name || 'Unknown Observer',
        location: obs.observer?.location || 'Unknown Location'
      },
      telescope: obs.observer?.telescope || 'Unknown',
      quality: obs.quality || 'good',
      coordinates: undefined
    }));

    // Transform brightness velocity
    const brightnessVelocityData: VelocityDataPoint[] = brightnessVelocity.map((v: VelocityDataPoint) => ({
      date: v.date,
      value: v.value || v.velocity || v.brightnessVelocity || 0,
      confidence: v.confidence,
      dataPoints: v.dataPoints
    }));

    // Transform activity data
    const activityDataTransformed: ActivityIndexDataPoint[] = activityData.map((a: ActivityIndexDataPoint) => ({
      date: a.date,
      activityIndex: a.activityIndex || a.activityLevel || 0,
      comaContribution: (a.activityIndex || 0) * 0.6,
      brightnessContribution: (a.activityIndex || 0) * 0.4,
      confidence: a.confidence || 0,
      comaSize: undefined,
      brightnessVelocity: undefined,
      heliocentrieDistance: a.heliocentric_distance,
      correlation: 0.5
    }));

    // Transform orbital velocity
    const orbitalVelocityData: OrbitalVelocityDataPoint[] = orbitalVelocity.map((v: OrbitalVelocityDataPoint) => ({
      date: v.date,
      heliocentric_velocity: v.heliocentric_velocity,
      geocentric_velocity: v.geocentric_velocity,
      uncertainty: v.source === 'JPL Ephemeris' ? 0.1 : 0.5,
      source: v.source === 'JPL Ephemeris' ? 'Real observations (JPL Horizons)' : 'Predicted (orbital mechanics)'
    }));

    // Transform orbital velocity to acceleration data
    const accelerationData: VelocityDataPoint[] = orbitalVelocity.map((v: OrbitalVelocityDataPoint) => ({
      date: v.date,
      value: v.acceleration || 0,
      confidence: v.confidence || 0.8,
      dataPoints: 1
    }));

    // Create mission status
    const missionStatus: MissionStatusData | null = cometData.orbital_mechanics ? {
      current_distance_au: cometData.orbital_mechanics.current_distance?.heliocentric ?? 0,
      days_to_perihelion: Math.floor(
        (new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      current_velocity_km_s: cometData.orbital_mechanics.current_velocity?.heliocentric ?? 0,
      brightness_trend: (() => {
        const trend = cometData.stats?.trendAnalysis;
        if (!trend) return undefined;
        return trend.trend === 'brightening' ? 'brightening' as const :
               trend.trend === 'dimming' ? 'dimming' as const : 'stable' as const;
      })(),
      velocity_trend: 'constant' as const,
      activity_level: currentActivity?.level || 'UNKNOWN',
      source_health: {
        cobs: cometData.source_status?.cobs?.active ?? false,
        jpl: cometData.source_status?.jpl_horizons?.active ?? false,
        theskylive: cometData.source_status?.theskylive?.active ?? false,
      },
      last_update: new Date().toISOString(),
      brightness_magnitude: cometData.comet.currentMagnitude,
      geocentric_distance_au: cometData.orbital_mechanics.current_distance?.geocentric ?? 0,
      jpl_ephemeris: cometData.jpl_ephemeris,
    } : null;

    return {
      lightCurveData,
      observationData,
      activityData: activityDataTransformed,
      brightnessVelocityData,
      orbitalVelocityData,
      accelerationData,
      morphologyData,
      missionStatus,
      trendAnalysis: cometData.stats?.trendAnalysis || null,
      mpcOrbitalElements: cometData.orbital_mechanics?.mpc_elements,
      jplHorizonsData: cometData.jpl_ephemeris,
      ephemerisPosition: cometData.orbital_mechanics?.current_position,
    };
  }, [cometData, activityData, brightnessVelocity, orbitalVelocity, currentActivity]);

  // Show loading state
  if (loading || !state) {
    // Humorous astronomical loading messages
    const loadingMessages = [
      'Aligning celestial coordinates...',
      'Calculating stellar positions...',
      'Awaiting light from distant objects...',
      'Consulting the cosmic microwave background...',
      'Triangulating Lagrange points...',
      'Adjusting for parallax...',
      'Synchronizing with atomic clocks...',
      'Polling the International Astronomical Union...',
      'Correcting for atmospheric refraction...',
      'Downloading more universe...',
      'Calibrating photometric filters...',
      'Requesting data from distant observatories...',
      'Accounting for light travel time...',
      'Performing astrometric reduction...',
    ];
    const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
          <AppHeader />
          <PageNavigation />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-20">
              <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-[var(--color-chart-primary)] rounded-full mb-4"></div>
              <div className="text-[var(--color-text-secondary)]">{randomMessage}</div>
            </div>
          </div>
        </div>
      </ExtensionSafeWrapper>
    );
  }

  // Show error state
  if (error) {
    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
          <AppHeader />
          <PageNavigation />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-20">
              <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Data</div>
              <div className="text-[var(--color-text-secondary)]">{error}</div>
            </div>
          </div>
        </div>
      </ExtensionSafeWrapper>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        {/* Automatic hash navigation */}
        <ScrollHashUpdater />

        {/* Mobile view suggestion banner */}
        <MobileViewBanner />

        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--color-chart-primary)] via-[var(--color-chart-secondary)] to-[var(--color-chart-tertiary)] bg-clip-text text-transparent mb-3">
              Scientific Analysis & Orbital Details
            </h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
              In-depth orbital mechanics, brightness evolution, and comprehensive data analysis of 3I/ATLAS
            </p>
          </div>

          {/* Two-column layout: Main content + Sticky Navigator */}
          <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
            {/* Main Content Column */}
            <div className="min-w-0">
              {/* Section Navigator - Mobile only (moves to right column on desktop) */}
              <div className="lg:hidden">
                <SectionNavigator sections={[
            {
              id: 'scientific-controversy',
              title: 'Why It\'s Special',
              icon: '🔬',
              description: 'Unique characteristics and scientific debate',
              color: 'purple',
              subsections: [
                { id: 'chemical-anomalies', title: 'Chemical Composition Anomalies' },
                { id: 'activity-scaling', title: 'Extreme Activity Scaling' },
                { id: 'interstellar-comparison', title: 'Interstellar Visitors Compared' }
              ]
            },
            {
              id: '3d-position',
              title: '3D Visualization',
              icon: '🌌',
              description: 'Interactive solar system view',
              color: 'blue'
            },
            {
              id: 'velocity',
              title: 'Velocity Analysis',
              icon: '⚡',
              description: 'Speed and acceleration tracking',
              color: 'red',
              subsections: [
                { id: 'velocity-current', title: 'Current Velocity Stats' },
                { id: 'speed-history', title: 'Speed History' },
                { id: 'acceleration', title: 'Acceleration' }
              ]
            },
            {
              id: 'anti-tail',
              title: 'Anti-Tail Phenomenon',
              icon: '🧊',
              description: 'Backwards tail discovery',
              color: 'cyan'
            },
            {
              id: 'brightness',
              title: 'Brightness Evolution',
              icon: '💡',
              description: 'Magnitude changes over time',
              color: 'yellow',
              subsections: [
                { id: 'brightness-observations', title: 'Observations' },
                { id: 'brightness-analysis', title: 'Analysis' }
              ]
            },
            {
              id: 'coma-tail',
              title: 'Coma & Tail',
              icon: '☄️',
              description: 'Morphology visualization',
              color: 'cyan'
            },
            {
              id: 'activity',
              title: 'Activity Level',
              icon: '🔥',
              description: 'Outgassing and volatility',
              color: 'orange'
            },
            {
              id: 'orbital-mechanics',
              title: 'Orbital Mechanics',
              icon: '🛰️',
              description: 'Ephemeris and trajectory data',
              color: 'green',
              subsections: [
                { id: 'orbital-parameters', title: 'Technical Details' }
              ]
            }
          ]} />
              </div>

              {/* Compact Visibility Status - Collapsible */}
              {!loading && !error && state.ephemerisPosition && (
            <VisibilityStatusCompact
              isVisible={false}
              magnitude={state.missionStatus?.brightness_magnitude}
              nextVisibleDate="November 20-25, 2025"
              reason="Currently behind the Sun from Earth's perspective"
              ra={state.ephemerisPosition.ra}
              dec={state.ephemerisPosition.dec}
            />
          )}

          {/* Scientific Controversy Section - Why This Object Is Unique */}
          {!loading && !error && (
            <div id="scientific-controversy" className="mb-12">
              <ScientificControversySection />
            </div>
          )}

          {/* 2. 3D VISUALIZATION - Interactive Solar System View */}
          {!loading && !error && (
            <div id="3d-position" className="bg-[var(--color-bg-secondary)] rounded-lg mb-12 border border-[var(--color-border-primary)] border-l-4 border-l-blue-500">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">🌌</span>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-status-success)]">
                      3D Visualization
                    </h2>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                      Interactive solar system view showing the comet's path through space
                    </p>
                  </div>
                </div>
                {/* 3D Visualization - Lazy loaded after initial render */}
                <VisualizationErrorBoundary>
                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Interactive 3D View</h3>
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <span className="text-[var(--color-chart-primary)] font-mono">🖱️ Click & Drag</span>
                        <span>•</span>
                        <span className="text-[var(--color-chart-primary)] font-mono">🔄 Scroll</span>
                        <span>•</span>
                        <span className="text-[var(--color-chart-primary)] font-mono">⌥ Right Click</span>
                      </div>
                    </div>
                    {shouldLoadVisualization ? (
                      <ModernSolarSystem
                        centerMode="default"
                        autoPlay={false}
                        showControls={true}
                        followComet={false}
                      />
                    ) : (
                      <div className="h-[600px] bg-[var(--color-bg-secondary)] rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-4 opacity-50 animate-pulse">🌌</div>
                          <div className="text-[var(--color-text-tertiary)]">Loading 3D visualization...</div>
                        </div>
                      </div>
                    )}
                  </div>
                </VisualizationErrorBoundary>
              </div>
            </div>
          )}

          {/* 3. VELOCITY - How Fast Is It Going? */}
          {!loading && !error && (
            <div id="velocity" className="bg-[var(--color-bg-secondary)] rounded-lg mb-12 border border-[var(--color-border-primary)] border-l-4 border-l-red-500">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">🚀</span>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-chart-senary)]">
                      Velocity Analysis
                    </h2>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                      Speed and acceleration tracking through the solar system
                    </p>
                  </div>
                </div>

              {/* Current Velocity Status - Eye Candy Cards */}
              <div id="velocity-current" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-red-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-6 text-center border-2 border-red-500/30">
                  <div className="text-5xl mb-3">☄️</div>
                  <div className="text-4xl font-bold text-red-400 mb-2">
                    {state.missionStatus?.current_velocity_km_s?.toFixed(1) || 'N/A'} km/s
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)] mb-1">Speed vs Sun</div>
                  <div className="text-lg font-semibold text-orange-400">
                    {((state.missionStatus?.current_velocity_km_s || 0) * 2237).toFixed(0)} mph
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-6 text-center border-2 border-green-500/30">
                  <div className="text-5xl mb-3">🌍</div>
                  <div className="text-4xl font-bold text-green-400 mb-2">
                    {state.orbitalVelocityData && state.orbitalVelocityData.length > 0 ? state.orbitalVelocityData[state.orbitalVelocityData.length - 1]?.geocentric_velocity?.toFixed(1) : 'N/A'} km/s
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)] mb-1">Speed vs Earth</div>
                  <div className="text-lg font-semibold text-green-300">
                    {((state.orbitalVelocityData && state.orbitalVelocityData.length > 0 ? state.orbitalVelocityData[state.orbitalVelocityData.length - 1]?.geocentric_velocity : 0) * 2237).toFixed(0)} mph
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-6 text-center border-2 border-purple-500/30">
                  <div className="text-5xl mb-3">
                    {state.accelerationData?.length > 0 && state.accelerationData[state.accelerationData.length - 1].value > 0 ? '📈' : '📉'}
                  </div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">
                    {state.accelerationData?.length > 0 ?
                      (state.accelerationData[state.accelerationData.length - 1].value > 0 ? 'Speeding Up' : 'Slowing Down')
                      : 'N/A'
                    }
                  </div>
                  <div className="text-sm text-[var(--color-text-secondary)]">Current Trend</div>
                </div>
              </div>

              {/* Speed Comparison */}
              <div id="velocity-comparison" className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">⚡ For Context:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚗</span>
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)]">Highway speed: 70 mph</div>
                      <div className="text-[var(--color-text-tertiary)]">3I/ATLAS is {((state.missionStatus?.current_velocity_km_s || 45) * 2237 / 70).toFixed(0)}x faster</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✈️</span>
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)]">Jet airliner: 550 mph</div>
                      <div className="text-[var(--color-text-tertiary)]">3I/ATLAS is {((state.missionStatus?.current_velocity_km_s || 45) * 2237 / 550).toFixed(0)}x faster</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚀</span>
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)]">Space Shuttle: 17,500 mph</div>
                      <div className="text-[var(--color-text-tertiary)]">3I/ATLAS is {((state.missionStatus?.current_velocity_km_s || 45) * 2237 / 17500).toFixed(1)}x faster</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛸</span>
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)]">Voyager 1 (fastest human object): 38,000 mph</div>
                      <div className="text-[var(--color-text-tertiary)]">3I/ATLAS is {((state.missionStatus?.current_velocity_km_s || 45) * 2237 / 38000).toFixed(1)}x faster</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Velocity Over Time Chart */}
              {state.orbitalVelocityData.length > 0 && (
                <>
                  <div id="speed-history">
                    <ChartErrorBoundary>
                      <OrbitalVelocityChart
                        data={state.orbitalVelocityData}
                        title="Speed History - Watch it accelerate toward the Sun"
                      />
                    </ChartErrorBoundary>
                  </div>

                  {/* Geocentric Velocity Explanation */}
                  <div className="mt-4 p-4 bg-purple-500/10 border-l-4 border-purple-500 rounded text-sm">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold text-purple-300 mb-2">Why does geocentric velocity decrease?</div>
                        <div className="text-[var(--color-text-secondary)] space-y-1">
                          <p><strong className="text-[var(--color-text-primary)]">Heliocentric velocity (relative to Sun)</strong> increases as expected: 60 → 68 km/s ✅</p>
                          <p><strong className="text-[var(--color-text-primary)]">Geocentric velocity (relative to Earth)</strong> decreases: 90 → 38 km/s. This is correct! As the comet's trajectory changes direction around the Sun, its velocity vector becomes more <em>parallel</em> to Earth's orbital motion (~30 km/s). When two objects move in similar directions, their relative speed decreases.</p>
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-2">Analogy: Two cars both going 100 km/h - if they're driving toward each other, relative speed is 200 km/h. If driving side-by-side in the same direction, relative speed is nearly 0.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Acceleration Chart */}
              {state.accelerationData.length > 0 && (
                <>
                  <div id="acceleration">
                    <ChartErrorBoundary>
                      <VelocityChart
                        data={state.accelerationData}
                        title="Acceleration - How quickly the speed is changing"
                        yAxisLabel="Acceleration"
                        unit="km/s²"
                        color="#f97316"
                        height={400}
                        showTrend={false}
                      />
                    </ChartErrorBoundary>
                  </div>

                  {/* Physics Explanation */}
                  <div className="mt-4 p-4 bg-blue-500/10 border-l-4 border-blue-500 rounded text-sm">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <div className="font-semibold text-blue-300 mb-2">Why does acceleration peak before perihelion?</div>
                        <div className="text-[var(--color-text-secondary)] space-y-1">
                          <p><strong className="text-[var(--color-text-primary)]">The comet IS speeding up continuously</strong> - velocity increases from 60 km/s (April) to 68+ km/s (October).</p>
                          <p><strong className="text-[var(--color-text-primary)]">But acceleration peaks ~27 days BEFORE perihelion</strong> (Oct 3 at 1.67 AU from Sun). This is correct for hyperbolic orbits: as the comet approaches perihelion, motion becomes increasingly tangential rather than radial. The radial "pull" toward the Sun peaks early, then decreases as sideways velocity dominates.</p>
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-2">Analogy: When swinging a ball on a string, you pull hardest when it's coming toward you, but as it swings past, the pull becomes more about changing direction than adding speed.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              </div>
            </div>
          )}

          {/* 4. Anti-Tail Phenomenon Section */}
          {!loading && !error && (
            <div id="anti-tail" className="mb-12 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border-primary)]">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">🧊</span>
                  <div>
                    <h2 className="text-2xl font-bold text-cyan-400">
                      Anti-Tail Phenomenon
                    </h2>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                      Backwards tail discovery - an incredibly rare astronomical feature
                    </p>
                  </div>
                </div>

              <div className="bg-gradient-to-br from-cyan-900/30 via-blue-900/30 to-[var(--color-bg-secondary)] rounded-lg p-6">

                {/* Key Discovery Highlight */}
                <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/50 rounded-lg p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl flex-shrink-0">💡</span>
                    <div>
                      <h3 className="text-xl font-bold text-cyan-300 mb-3">
                        What&apos;s Actually Happening?
                      </h3>
                      <p className="text-[var(--color-text-secondary)] mb-3">
                        The &quot;backwards tail&quot; is made of <strong className="text-cyan-400">tiny ice crystals</strong> (think: frozen water vapor, not rocks).
                        These ice crystals last longer when heading toward the Sun because of how the comet is venting gas.
                        Hubble Space Telescope confirmed this isn&apos;t a trick of the camera angle - it&apos;s real, stretching about
                        <strong className="text-cyan-400"> 18,000 miles</strong> toward the Sun.
                      </p>
                      <div className="text-sm text-[var(--color-text-tertiary)] border-l-2 border-cyan-500/50 pl-4 mb-3 italic">
                        &quot;Ice grains survive longer in the Sun-facing direction because that&apos;s where the most gas is venting out.
                        It&apos;s like a protective cloud that keeps them frozen longer.&quot;
                        <div className="mt-2 text-xs">- Harvard astronomers Avi Loeb & Eric Keto</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded p-3 text-xs text-[var(--color-text-secondary)]">
                        <strong className="text-purple-300">How small is this comet?</strong> The icy core is probably smaller than
                        <strong> 2 miles across</strong> (possibly as small as 0.2 miles). It&apos;s so tiny and surrounded by so much
                        ice and dust that we can&apos;t even see the nucleus itself!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simple Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-[var(--color-bg-tertiary)]/50 rounded-lg p-5 border border-cyan-500/20">
                    <h4 className="font-bold text-cyan-300 mb-3 flex items-center gap-2">
                      <span>📅</span>
                      July-August: The Weird Phase
                    </h4>
                    <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Hubble spotted the backwards tail pointing at the Sun</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Multiple telescopes confirmed: it&apos;s not an optical illusion</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">•</span>
                        <span>Webb telescope found weird chemistry: 87% dry ice, only 4% water ice</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-[var(--color-bg-tertiary)]/50 rounded-lg p-5 border border-green-500/20">
                    <h4 className="font-bold text-green-300 mb-3 flex items-center gap-2">
                      <span>🔄</span>
                      Late August: Back to Normal
                    </h4>
                    <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        <span>The backwards tail disappeared</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        <span>A normal tail pointing away from the Sun appeared (35,000 miles long)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        <span>Now behaving like a regular comet as it gets closer to the Sun</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Scientific Explanation */}
                <div className="bg-[var(--color-bg-tertiary)]/50 rounded-lg p-6 border border-purple-500/20 mb-6">
                  <h4 className="font-bold text-purple-300 mb-4 flex items-center gap-2">
                    <span>🔬</span>
                    How Does This Work?
                  </h4>

                  <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
                    <div>
                      <h5 className="font-semibold text-[var(--color-text-primary)] mb-2">The Simple Version:</h5>
                      <ol className="space-y-2 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 font-bold">1.</span>
                          <span><strong className="text-purple-300">The Sun heats one side:</strong> The side facing the Sun gets hotter and releases dry ice gas (CO₂) much faster than the other sides</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 font-bold">2.</span>
                          <span><strong className="text-purple-300">Ice crystals get carried along:</strong> Tiny water ice particles (think: microscopic snowflakes) get swept up in the gas rushing out</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 font-bold">3.</span>
                          <span><strong className="text-purple-300">The ice lasts longer toward the Sun:</strong> Weirdly, these ice crystals survive longer when heading toward the Sun because there&apos;s more gas protecting them from the heat</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-400 font-bold">4.</span>
                          <span><strong className="text-purple-300">We see the backwards tail:</strong> The ice reflects sunlight, creating a visible glow stretching 18,000 miles toward the Sun</span>
                        </li>
                      </ol>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-xs">
                      <strong className="text-yellow-300">The Key Surprise:</strong> The ice crystals last <strong>23 times longer</strong> when heading toward the Sun compared to sideways directions.
                      That&apos;s why the tail points the &quot;wrong&quot; way - it&apos;s where the ice survives the longest before evaporating!
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded p-4">
                      <h5 className="font-semibold text-blue-300 mb-2">What&apos;s It Made Of? (Webb Telescope Data):</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="text-center p-2 bg-orange-500/10 rounded border border-orange-500/30">
                          <div className="text-2xl font-bold text-orange-400">87%</div>
                          <div className="text-orange-300">Dry Ice</div>
                          <div className="text-[var(--color-text-tertiary)] mt-1">(CO₂ gas)</div>
                          <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">Creates the main gas cloud</div>
                        </div>
                        <div className="text-center p-2 bg-blue-500/10 rounded border border-blue-500/30">
                          <div className="text-2xl font-bold text-blue-400">9%</div>
                          <div className="text-blue-300">Other Gases</div>
                          <div className="text-[var(--color-text-tertiary)] mt-1">(CO, etc.)</div>
                          <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">Minor components</div>
                        </div>
                        <div className="text-center p-2 bg-cyan-500/10 rounded border border-cyan-500/30">
                          <div className="text-2xl font-bold text-cyan-400">4%</div>
                          <div className="text-cyan-300">Water Ice</div>
                          <div className="text-[var(--color-text-tertiary)] mt-1">(H₂O crystals)</div>
                          <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1">What we actually see glowing</div>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-center text-[var(--color-text-tertiary)]">
                        ⚠️ Mostly dry ice by weight, but the water ice crystals create most of the visible glow
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-5">
                    <h4 className="font-bold text-orange-300 mb-3 flex items-center gap-2">
                      <span>☀️</span>
                      The Sun Was Extra Active
                    </h4>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                      When we spotted this comet, the Sun was going through its most active phase:
                    </p>
                    <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">•</span>
                        <span>The Sun had more sunspots than predicted (peak activity in 2024)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">•</span>
                        <span>Strongest solar flare of the cycle happened in October 2024</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400">•</span>
                        <span>This extra solar energy may have made the backwards tail even more dramatic</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5">
                    <h4 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
                      <span>🌌</span>
                      Why Is This a Big Deal?
                    </h4>
                    <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span><strong>Never seen before:</strong> No other comet has ever had a tail pointing toward the Sun like this (and it&apos;s not a camera trick!)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span><strong>Weird chemistry:</strong> 87% dry ice (most comets are mostly water ice). The dry ice evaporates 10× faster than water at this distance!</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span><strong>Visitor from another star:</strong> This comet has been traveling through space for billions of years before visiting our solar system</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span><strong>Confirmed by Hubble:</strong> The world&apos;s best space telescope proved the 18,000-mile backwards tail is real</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span><strong>Super tiny:</strong> The solid nucleus is only about 2 miles across (possibly as small as 0.2 miles) - smaller than most cities!</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400">✓</span>
                        <span><strong>Scientists figured it out:</strong> The physics model explaining why this happens matches perfectly with what Hubble saw</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <>
              {/* 3D Visualization Skeleton */}
              <div className="space-y-8 mb-12">
                <div className="text-center">
                  <div className="h-10 w-64 bg-[var(--color-bg-tertiary)] rounded animate-pulse mx-auto mb-2"></div>
                  <div className="h-5 w-96 bg-[var(--color-bg-tertiary)] rounded animate-pulse mx-auto"></div>
                </div>
                <VisualizationSkeleton />
                <CardSkeleton height={400} className="mb-8" />
              </div>

              {/* Velocity Analysis Skeletons */}
              <div className="space-y-8 mb-12">
                <div className="text-center">
                  <div className="h-10 w-96 bg-[var(--color-bg-tertiary)] rounded animate-pulse mx-auto mb-2"></div>
                  <div className="h-5 w-80 bg-[var(--color-bg-tertiary)] rounded animate-pulse mx-auto"></div>
                </div>
                <CardSkeleton height={200} />
                <ChartSkeleton height={400} />
                <ChartSkeleton height={400} />
              </div>

              {/* Brightness Analysis Skeletons */}
              <div className="space-y-8 mb-12">
                <div className="text-center">
                  <div className="h-10 w-64 bg-[var(--color-bg-tertiary)] rounded animate-pulse mx-auto mb-2"></div>
                  <div className="h-5 w-96 bg-[var(--color-bg-tertiary)] rounded animate-pulse mx-auto"></div>
                </div>
                <ChartSkeleton height={300} />
                <ChartSkeleton height={400} />
                <ChartSkeleton height={400} />
              </div>

              {/* Activity Level Skeletons */}
              <div className="space-y-8 mb-12">
                <div className="text-center">
                  <div className="h-10 w-80 bg-[var(--color-bg-tertiary)] rounded animate-pulse mx-auto mb-2"></div>
                  <div className="h-5 w-96 bg-[var(--color-bg-tertiary)] rounded animate-pulse mx-auto"></div>
                </div>
                <CardSkeleton height={200} />
                <ChartSkeleton height={400} />
              </div>
            </>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-status-error)] rounded-lg p-6">
              <h3 className="text-xl font-semibold text-[var(--color-status-error)] mb-2">⚠️ Data Fetch Error</h3>
              <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[var(--color-status-error)] hover:opacity-90 px-4 py-2 rounded text-white transition-opacity"
              >
                Retry
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>

            {/* 5. BRIGHTNESS - How Bright Is It? */}
            <div id="brightness" className="bg-[var(--color-bg-secondary)] rounded-lg mb-12 border border-[var(--color-border-primary)] border-l-4 border-l-yellow-500">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">✨</span>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-chart-primary)]">
                      Brightness Evolution
                    </h2>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                      Magnitude changes over time as the comet approaches perihelion
                    </p>
                  </div>
                </div>

              {/* Magnitude Scale - Amateur-friendly brightness explanation */}
              <MagnitudeScale currentMagnitude={state.missionStatus?.brightness_magnitude} />

              {/* Observations */}
              <div id="brightness-observations">
                <ChartErrorBoundary>
                  <LightCurve
                    data={state.observationData.map(obs => ({
                      date: obs.date,
                      magnitude: obs.magnitude,
                      filter: obs.filter || 'Visual',
                      observer: obs.observer.name,
                      quality: obs.quality,
                      source: 'COBS'
                    }))}
                    enableZoom={true}
                  />
                </ChartErrorBoundary>
              </div>

              {/* Analysis */}
              <div id="brightness-analysis">
                <ChartErrorBoundary>
                  <BrightnessStats
                    data={state.observationData.map(obs => ({
                      date: obs.date,
                      magnitude: obs.magnitude,
                      observer: obs.observer.name,
                      quality: obs.quality || 'good' as const
                    }))}
                    showTrend={true}
                    realTimeUpdates={true}
                    trendAnalysis={state.trendAnalysis || undefined}
                  />
                </ChartErrorBoundary>

                {/* Brightness Change Rate */}
                {state.brightnessVelocityData.length > 0 && (
                  <ChartErrorBoundary>
                    <VelocityChart
                      data={state.brightnessVelocityData}
                      title="Rate of Brightness Change - Getting brighter or dimmer?"
                      yAxisLabel="Magnitude Change"
                      unit="mag/day"
                      color="#fbbf24"
                      height={400}
                    />
                  </ChartErrorBoundary>
                )}
              </div>
              </div>
            </div>

            {/* 6. COMA & TAIL - Visual Structure */}
            {state.morphologyData.length > 0 && (
            <div id="coma-tail" className="bg-[var(--color-bg-secondary)] rounded-lg mb-12 border border-[var(--color-border-primary)] border-l-4 border-l-cyan-500">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">💫</span>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-chart-senary)]">
                      Coma & Tail
                    </h2>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                      Morphology visualization - size and structure of the comet's atmosphere
                    </p>
                  </div>
                </div>

              {/* Statistics Cards */}
              {state.morphologyData.length > 0 && (() => {
                const comaValues = state.morphologyData.filter(p => p.comaSize !== undefined).map(p => p.comaSize!);
                const tailValues = state.morphologyData.filter(p => p.tailLength !== undefined).map(p => p.tailLength!);
                const comaCount = comaValues.length;
                const tailCount = tailValues.length;
                const comaMin = comaValues.length > 0 ? Math.min(...comaValues) : 0;
                const comaMax = comaValues.length > 0 ? Math.max(...comaValues) : 0;
                const tailMin = tailValues.length > 0 ? Math.min(...tailValues) : 0;
                const tailMax = tailValues.length > 0 ? Math.max(...tailValues) : 0;

                return (
                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-3xl font-bold text-[var(--color-chart-secondary)]">
                          {comaCount}
                        </div>
                        <div className="text-sm text-[var(--color-text-tertiary)] mt-1">
                          Coma Observations
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-[var(--color-chart-secondary)]">
                          {comaMin > 0 ? `${comaMin.toFixed(1)} - ${comaMax.toFixed(1)}` : 'N/A'}
                        </div>
                        <div className="text-sm text-[var(--color-text-tertiary)] mt-1">
                          Coma Range (arcmin)
                        </div>
                        {comaMin > 0 && (
                          <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
                            🌕 ~{((comaMin / 30) * 100).toFixed(0)}% to {((comaMax / 30) * 100).toFixed(0)}% of Moon&apos;s diameter
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-[var(--color-chart-quinary)]">
                          {tailCount}
                        </div>
                        <div className="text-sm text-[var(--color-text-tertiary)] mt-1">
                          Tail Observations
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-[var(--color-chart-quinary)]">
                          {tailMin > 0 ? `${tailMin.toFixed(1)} - ${tailMax.toFixed(1)}` : 'N/A'}
                        </div>
                        <div className="text-sm text-[var(--color-text-tertiary)] mt-1">
                          Tail Range (degrees)
                        </div>
                        {tailMin > 0 && (
                          <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
                            ✊ ~{(tailMin / 10).toFixed(1)} to {(tailMax / 10).toFixed(1)} fist-widths
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Coma & Tail Chart */}
              {state.morphologyData.length > 0 ? (
                <ChartErrorBoundary>
                  <ComaAndTailChart
                    data={state.morphologyData}
                    title="Coma & Tail Evolution Over Time"
                  />
                </ChartErrorBoundary>
              ) : (
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 text-center">
                  <div className="text-[var(--color-text-tertiary)]">
                    No coma or tail measurements available yet. Check back as more observations are reported.
                  </div>
                </div>
              )}
              </div>
            </div>
            )}

            {/* 7. ACTIVITY & OUTGASSING */}
            {state.activityData.length > 0 && (
            <div id="activity" className="bg-[var(--color-bg-secondary)] rounded-lg mb-12 border border-[var(--color-border-primary)] border-l-4 border-l-orange-500">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">🔥</span>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-chart-quaternary)]">
                      Activity Level
                    </h2>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                      Outgassing and volatility as the comet heats up
                    </p>
                  </div>
                </div>

              {/* Activity Chart */}
              <ChartErrorBoundary>
                <ActivityLevelChart
                  data={state.activityData}
                  showComponents={true}
                />
              </ChartErrorBoundary>
              </div>
            </div>
            )}

            {/* 8. ORBITAL MECHANICS - Ephemeris and Trajectory Data */}
            <div id="orbital-mechanics" className="bg-[var(--color-bg-secondary)] rounded-lg mb-12 border border-[var(--color-border-primary)] border-l-4 border-l-green-500">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">🛰️</span>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--color-status-success)]">
                      Orbital Mechanics
                    </h2>
                    <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                      Ephemeris and trajectory data - the comet's precise path calculations
                    </p>
                  </div>
                </div>

              {/* Orbital Parameters */}
              <div id="orbital-parameters" className="bg-[var(--color-bg-tertiary)] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Technical Details</h3>
                <p className="text-sm text-[var(--color-text-tertiary)] mb-4">Orbital elements and current position data</p>

                <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg max-w-4xl mx-auto">
                  <div className="text-xs text-[var(--color-text-secondary)] space-y-3 font-mono">
                    {/* Orbital Elements */}
                    <div>
                      <div className="text-[var(--color-status-warning)] font-semibold mb-2 text-center">ORBIT SHAPE & ORIENTATION</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Eccentricity:</span>{' '}
                          <span className="text-[var(--color-chart-primary)]">6.14</span>{' '}
                          <span className="text-[var(--color-text-tertiary)] text-[10px]">(escape orbit)</span>
                          <InfoTooltip content="Eccentricity measures how stretched the orbit is. Values over 1 (like 6.14) mean hyperbolic - the comet will escape the solar system!" />
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Closest to Sun:</span>{' '}
                          <span className="text-[var(--color-chart-primary)]">{formatDistance(1.36)}</span>
                          <InfoTooltip content="Perihelion distance - how close the comet gets to the Sun. At 1.36 AU, it passes inside Mars's orbit (Mars is at 1.52 AU)." />
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Orbit tilt:</span>{' '}
                          <span className="text-[var(--color-chart-primary)]">175°</span>{' '}
                          <span className="text-[var(--color-text-tertiary)] text-[10px]">(retrograde)</span>
                          <InfoTooltip content="Orbit tilt (inclination) is measured from Earth's orbit plane. 175° means retrograde - moving opposite to the planets. Common for interstellar objects." />
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Ascending Node:</span>{' '}
                          <span className="text-[var(--color-chart-primary)]">322.16°</span>
                          <InfoTooltip content="The angle where the comet crosses Earth's orbital plane moving northward. Helps pinpoint the orbit's orientation in space." />
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Perihelion Arg:</span>{' '}
                          <span className="text-[var(--color-chart-primary)]">128.01°</span>
                          <InfoTooltip content="Argument of perihelion - the angle from the ascending node to the closest point to the Sun. Together with other angles, this fully defines the orbit's orientation." />
                        </div>
                      </div>
                    </div>

                    {/* Current State */}
                    <div className="pt-2 border-t border-[var(--color-border-primary)]">
                      <div className="text-[var(--color-status-warning)] font-semibold mb-2 text-center">CURRENT POSITION</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Distance from Sun:</span>{' '}
                          <span className="text-[var(--color-status-success)]">
                            {state.missionStatus?.current_distance_au ? formatDistance(state.missionStatus.current_distance_au, 3) : 'N/A'}
                          </span>
                          <InfoTooltip content="Heliocentric distance - how far 3I/ATLAS is from the Sun. The object is brightest when closest to the Sun." />
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Distance from Earth:</span>{' '}
                          <span className="text-[var(--color-status-success)]">
                            {state.missionStatus?.geocentric_distance_au ? formatDistance(state.missionStatus.geocentric_distance_au, 3) : 'N/A'}
                          </span>
                          <InfoTooltip content="Geocentric distance - how far 3I/ATLAS is from Earth. This affects how bright it appears to us, along with its actual brightness." />
                        </div>
                        <div><span className="text-[var(--color-text-tertiary)]">Days to closest:</span> <span className="text-[var(--color-status-success)]">{state.missionStatus?.days_to_perihelion !== undefined ? state.missionStatus.days_to_perihelion : 'N/A'}</span></div>
                        <div><span className="text-[var(--color-text-tertiary)]">Closest approach:</span> <span className="text-[var(--color-status-success)]">Oct 30, 2025</span></div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Escape speed:</span>{' '}
                          <span className="text-[var(--color-status-success)]">58 km/s</span>
                          <InfoTooltip content="The speed at which 3I/ATLAS will leave the solar system after perihelion. It has enough energy to escape forever." />
                        </div>
                      </div>
                    </div>

                    {/* Velocity State */}
                    <div className="pt-2 border-t border-[var(--color-border-primary)]">
                      <div className="text-[var(--color-status-warning)] font-semibold mb-2 text-center">SPEED</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Speed (vs Sun):</span>{' '}
                          <span className="text-[var(--color-chart-senary)]">{state.missionStatus?.current_velocity_km_s?.toFixed(2) || 'N/A'} km/s</span>
                          <InfoTooltip content="Heliocentric velocity - the object's speed relative to the Sun. It speeds up as it approaches the Sun (conservation of energy)." />
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Speed (vs Earth):</span>{' '}
                          <span className="text-[var(--color-chart-senary)]">{state.orbitalVelocityData?.[state.orbitalVelocityData.length - 1]?.geocentric_velocity?.toFixed(2) || 'N/A'} km/s</span>
                          <InfoTooltip content="Geocentric velocity - the object's speed relative to Earth. This differs from heliocentric velocity because Earth is also moving (~30 km/s around the Sun)." />
                        </div>
                        <div><span className="text-[var(--color-text-tertiary)]">At closest point:</span> <span className="text-[var(--color-chart-senary)]">68 km/s</span></div>
                        <div><span className="text-[var(--color-text-tertiary)]">Acceleration:</span> <span className="text-[var(--color-chart-senary)]">{state.accelerationData?.length > 0 ? (state.accelerationData[state.accelerationData.length - 1].value > 0 ? 'Speeding up ↑' : 'Slowing down ↓') : 'N/A'}</span></div>
                        <div><span className="text-[var(--color-text-tertiary)]">7-day trend:</span> <span className="text-[var(--color-chart-senary)]">{state.missionStatus?.velocity_trend === 'constant' ? 'Steady' : state.missionStatus?.velocity_trend || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Trajectory Characteristics */}
                    <div className="pt-2 border-t border-[var(--color-border-primary)]">
                      <div className="text-[var(--color-status-warning)] font-semibold mb-2 text-center">TRAJECTORY TYPE</div>
                      <div className="text-center text-[var(--color-text-tertiary)] space-y-1">
                        <div><span className="text-[var(--color-chart-quaternary)]">Hyperbolic:</span> Will escape the solar system forever</div>
                        <div><span className="text-[var(--color-chart-quaternary)]">Retrograde:</span> Moving opposite direction from planets</div>
                        <div><span className="text-[var(--color-chart-quaternary)]">Origin:</span> Interstellar space (3rd confirmed visitor)</div>
                        <div className="text-[10px] pt-1 text-[var(--color-text-tertiary)]">One-time flyby • Never returning • From beyond our solar system</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orbital Elements Comparison - MPC vs JPL */}
              {state.mpcOrbitalElements && (
                <div className="mt-8">
                  <OrbitalElementsComparison
                    mpcElements={state.mpcOrbitalElements}
                    jplData={state.jplHorizonsData}
                  />
                </div>
              )}

                {/* How We Calculate */}
                <div className="mt-8">
                  <HowWeCalculate />
                </div>

                {/* Accuracy Badge */}
                <div className="mt-6">
                  <AccuracyBadge accuracy_km={15000} timespan_days={180} variant="full" />
                </div>
              </div>
            </div>

            {/* Data Sources & Attribution */}
            <DataAttribution full={true} />
            </>
          )}
            </div>
            {/* End Main Content Column */}

            {/* Desktop Navigator Column - Sticky sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <SectionNavigator sections={[
                  {
                    id: 'scientific-controversy',
                    title: 'Why It\'s Special',
                    icon: '🔬',
                    description: 'Unique characteristics and scientific debate',
                    color: 'purple',
                    subsections: [
                      { id: 'chemical-anomalies', title: 'Chemical Composition Anomalies' },
                      { id: 'activity-scaling', title: 'Extreme Activity Scaling' },
                      { id: 'interstellar-comparison', title: 'Interstellar Visitors Compared' }
                    ]
                  },
                  {
                    id: '3d-position',
                    title: '3D Visualization',
                    icon: '🌌',
                    description: 'Interactive solar system view',
                    color: 'blue'
                  },
                  {
                    id: 'velocity',
                    title: 'Velocity Analysis',
                    icon: '⚡',
                    description: 'Speed and acceleration tracking',
                    color: 'red',
                    subsections: [
                      { id: 'velocity-current', title: 'Current Velocity Stats' },
                      { id: 'speed-history', title: 'Speed History' },
                      { id: 'acceleration', title: 'Acceleration' }
                    ]
                  },
                  {
                    id: 'anti-tail',
                    title: 'Anti-Tail Phenomenon',
                    icon: '🧊',
                    description: 'Backwards tail discovery',
                    color: 'cyan'
                  },
                  {
                    id: 'brightness',
                    title: 'Brightness Evolution',
                    icon: '💡',
                    description: 'Magnitude changes over time',
                    color: 'yellow',
                    subsections: [
                      { id: 'brightness-observations', title: 'Observations' },
                      { id: 'brightness-analysis', title: 'Analysis' }
                    ]
                  },
                  {
                    id: 'coma-tail',
                    title: 'Coma & Tail',
                    icon: '☄️',
                    description: 'Morphology visualization',
                    color: 'cyan'
                  },
                  {
                    id: 'activity',
                    title: 'Activity Level',
                    icon: '🔥',
                    description: 'Outgassing and volatility',
                    color: 'orange'
                  },
                  {
                    id: 'orbital-mechanics',
                    title: 'Orbital Mechanics',
                    icon: '🛰️',
                    description: 'Ephemeris and trajectory data',
                    color: 'green',
                    subsections: [
                      { id: 'orbital-parameters', title: 'Technical Details' }
                    ]
                  }
                ]} />
              </div>
            </aside>
            {/* End Grid */}
          </div>

        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}