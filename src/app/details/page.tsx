'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import type { LightCurveDataPoint } from '@/components/charts/LightCurve';
import BrightnessStats from '@/components/stats/BrightnessStats';
import type { ActivityIndexDataPoint } from '@/components/charts/ActivityLevelChart';
import type { VelocityDataPoint } from '@/components/charts/VelocityChart';
import type { OrbitalVelocityDataPoint } from '@/components/charts/OrbitalVelocityChart';
import type { MorphologyDataPoint } from '@/components/charts/ComaAndTailChart';
import DataSourcesSection from '@/components/common/DataSourcesSection';
import PageNavigation from '@/components/common/PageNavigation';
import AppHeader from '@/components/common/AppHeader';
import { MissionStatusData } from '@/components/charts/MissionStatusWidget';
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
  const [state, setState] = useState<AnalyticsPageState>({
    lightCurveData: [],
    observationData: [],
    activityData: [],
    brightnessVelocityData: [],
    orbitalVelocityData: [],
    accelerationData: [],
    morphologyData: [],
    missionStatus: null,
    trendAnalysis: null,
    mpcOrbitalElements: undefined,
    jplHorizonsData: undefined,
    ephemerisPosition: undefined,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch real COBS data on component mount
  useEffect(() => {
    async function fetchRealData() {
      try {
        setLoading(true);
        setError(null);

        if (process.env.NODE_ENV === 'development') {
          console.log('🔭 Fetching real COBS data for 3I/ATLAS comet via API...');
        }

        const { QUERY_PARAMS } = ANALYTICS_DATE_CONFIG;
        const [observersRes, activityRes, cometDataRes,
               brightnessVelocityRes] = await Promise.all([
          fetch('/api/observers?format=map&stats=true'),
          fetch(`/api/simple-activity?days=${QUERY_PARAMS.days}`),
          fetch(`/api/comet-data?smooth=true&predict=true&limit=200&trendDays=30`),
          fetch(`/api/velocity?type=brightness&smoothingWindow=7&limit=${QUERY_PARAMS.limit}&days=${QUERY_PARAMS.days}`)
        ]);

        if (!observersRes.ok || !activityRes.ok || !cometDataRes.ok ||
            !brightnessVelocityRes.ok) {
          throw new Error('Failed to fetch data from API');
        }

        const [observersData, activityData, cometData,
               brightnessVelocityData] = await Promise.all([
          observersRes.json(),
          activityRes.json(),
          cometDataRes.json(),
          brightnessVelocityRes.json()
        ]);

        // Extract data from API responses
        const observations = cometData.data?.comet?.observations || [];
        const lightCurve = cometData.data?.comet?.lightCurve || [];
        const observers = observersData.data?.map?.map((obs: { id: string; name: string; location: string; position?: [number, number]; observationCount?: number; averageMagnitude?: number }) => ({
          id: obs.id,
          name: obs.name,
          location: {
            name: obs.location,
            lat: obs.position?.[0] || 0,
            lng: obs.position?.[1] || 0
          },
          observationCount: obs.observationCount || 0,
          averageMagnitude: obs.averageMagnitude || 0,
          telescope: 'Various'
        })) || [];


        const activity = activityData.data?.activityData || [];
        const brightnessVelocity = brightnessVelocityData.data?.velocityData || [];

        // Transform observations to morphology data (coma/tail)
        const transformedMorphologyData: MorphologyDataPoint[] = observations
          .filter((obs: { coma?: number; tail?: number }) => obs.coma !== undefined || obs.tail !== undefined)
          .map((obs: { date: string; coma?: number; tail?: number; observer?: { name: string; telescope?: string; location?: string }; quality?: string }) => ({
            date: obs.date,
            comaSize: obs.coma,
            tailLength: obs.tail,
            observer: obs.observer ? {
              name: obs.observer.name,
              telescope: obs.observer.telescope || 'Unknown',
              location: obs.observer.location || 'Unknown'
            } : undefined,
            quality: obs.quality as 'excellent' | 'good' | 'fair' | 'poor' | undefined
          }));

        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Fetched ${observations.length} observations, ${lightCurve.length} light curve points, ${observers.length} observers, ${activity.length} activity index points, ${brightnessVelocity.length} brightness velocity points, ${transformedMorphologyData.length} morphology data points (coma/tail)`);
        }

        // Transform API response data to component format
        const transformedLightCurve: LightCurveDataPoint[] = lightCurve.map((point: { date: string; magnitude: number; uncertainty?: number }): LightCurveDataPoint => ({
          date: new Date(point.date).toISOString(),
          magnitude: point.magnitude,
          source: 'COBS',
          observer: 'COBS Network',
          quality: 'good' as const
        }));

        const transformedObservations: ObservationData[] = observations.map((obs: { id: string; date: string; magnitude: number; observer: { id: string; name: string; location: string; telescope?: string }; filter?: string; telescope?: string; quality?: string }) => ({
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
          quality: obs.quality || 'good' as const,
          coordinates: undefined // Real coordinates not available in current API
        }));




        const transformedBrightnessVelocityData: VelocityDataPoint[] = brightnessVelocity.map((velocityPoint: { date: string; velocity?: number; value?: number; brightnessVelocity?: number; confidence?: number; dataPoints?: number }) => ({
          date: velocityPoint.date,
          value: velocityPoint.value || velocityPoint.velocity || velocityPoint.brightnessVelocity || 0,
          confidence: velocityPoint.confidence,
          dataPoints: velocityPoint.dataPoints
        }));

        const transformedActivityData: ActivityIndexDataPoint[] = activity.map((activityPoint: { date: string; activityLevel?: number; activityIndex?: number; uncertainty?: number; confidence?: number; heliocentric_distance?: number }) => ({
          date: activityPoint.date,
          activityIndex: activityPoint.activityIndex || activityPoint.activityLevel || 0,
          comaContribution: (activityPoint.activityIndex || 0) * 0.6, // Simulate coma contribution from activity index
          brightnessContribution: (activityPoint.activityIndex || 0) * 0.4, // Simulate brightness contribution
          confidence: activityPoint.confidence || 0,
          comaSize: undefined, // Not available in simple activity calculation
          brightnessVelocity: undefined, // Not available in simple activity calculation
          heliocentrieDistance: activityPoint.heliocentric_distance,
          correlation: 0.5 // Default correlation since we're not doing complex correlation analysis
        }));


        // Generate historical orbital velocity data using REAL orbital mechanics
        const orbitalVelocityTransformed: OrbitalVelocityDataPoint[] = [];

        if (cometData?.data?.orbital_mechanics?.current_velocity?.heliocentric) {
          const currentVel = cometData.data.orbital_mechanics.current_velocity.heliocentric;
          const currentGeoVel = cometData.data.orbital_mechanics.current_velocity.geocentric;
          const currentDistance = cometData.data.orbital_mechanics.current_distance.heliocentric;

          // Use UTC dates to avoid timezone issues
          const startDate = new Date(Date.UTC(2025, 6, 1)); // July 1, 2025 UTC
          const now = new Date();
          const currentDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); // Today at midnight UTC

          // Official 3I/ATLAS orbital elements (same as in source-manager.ts)
          const ATLAS_ORBITAL_ELEMENTS = {
            eccentricity: 6.13941774,
            perihelion_distance_au: 1.35638454,
            perihelion_date: new Date('2025-10-29T11:33:16.000Z')
          };

          // Constants for vis-viva equation
          const GM_SUN = 1.32712440018e11; // km³/s² (Sun's gravitational parameter)
          const AU_TO_KM = 149597870.7; // km per AU

          // Generate DAILY data points from July 1 to current date
          for (let date = new Date(startDate); date <= currentDateUTC; date.setUTCDate(date.getUTCDate() + 1)) {
            const isCurrentDay = date.getTime() === currentDateUTC.getTime();

            // Calculate days from perihelion (negative = before perihelion)
            const daysFromPerihelion = (date.getTime() - ATLAS_ORBITAL_ELEMENTS.perihelion_date.getTime()) / (1000 * 60 * 60 * 24);

            // Calculate heliocentric distance using proper hyperbolic orbit mechanics
            const q = ATLAS_ORBITAL_ELEMENTS.perihelion_distance_au; // perihelion distance
            const e = ATLAS_ORBITAL_ELEMENTS.eccentricity;

            // Use proper hyperbolic orbit calculation for historical data
            let distance_au: number;
            if (isCurrentDay) {
              // Use current real-time distance from API (most accurate)
              distance_au = currentDistance;
            } else {
              // Calculate using proper Kepler mechanics for hyperbolic orbits
              const position = calculatePositionFromElements(daysFromPerihelion, {
                e: e,
                q: q,
                i: 46.74,    // inclination (degrees)
                omega: 338.5, // argument of periapsis (degrees)
                node: 342.9   // longitude of ascending node (degrees)
              });
              // Calculate distance from position vector: r = sqrt(x² + y² + z²)
              distance_au = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
            }

            // Calculate velocity using vis-viva equation: v = sqrt(μ * (2/r - 1/a))
            const r_km = distance_au * AU_TO_KM;
            const q_km = q * AU_TO_KM;
            const a_km = q_km / (1 - e); // semi-major axis (negative for hyperbolic)

            const velocity_km_s = Math.sqrt(GM_SUN * (2 / r_km - 1 / a_km));

            // Calculate geocentric velocity (rough approximation accounting for Earth's motion)
            // Earth's orbital velocity: ~29.78 km/s
            // Simplified: geocentric ≈ heliocentric - Earth_component
            const EARTH_ORBITAL_VELOCITY = 29.78;
            const geocentric_velocity = Math.sqrt(
              velocity_km_s * velocity_km_s +
              EARTH_ORBITAL_VELOCITY * EARTH_ORBITAL_VELOCITY -
              2 * velocity_km_s * EARTH_ORBITAL_VELOCITY * 0.5 // cos(angle) approximation
            );

            // Use real API values for current day
            const helioVel = isCurrentDay ? currentVel : velocity_km_s;
            const geoVel = isCurrentDay ? currentGeoVel : geocentric_velocity;

            orbitalVelocityTransformed.push({
              date: date.toISOString(),
              heliocentric_velocity: helioVel,
              geocentric_velocity: geoVel,
              uncertainty: isCurrentDay ? 0.1 : 0.5,
              source: isCurrentDay ? 'Real-time (TheSkyLive)' : 'Calculated (Kepler mechanics)'
            });
          }
        }

        // Calculate acceleration data (change in velocity over time)
        // Calculate acceleration using orbital mechanics (not numerical derivative)
        // For an orbiting body: a = GM/r² (gravitational acceleration magnitude)
        const accelerationData: VelocityDataPoint[] = [];
        const GM_SUN_ACCEL = 1.32712440018e11; // km³/s²
        const AU_TO_KM_ACCEL = 149597870.7; // km per AU
        const SECONDS_PER_DAY = 86400;

        if (cometData?.data?.orbital_mechanics?.current_distance?.heliocentric) {
          const startDateAccel = new Date(Date.UTC(2025, 6, 1)); // July 1, 2025 UTC
          const nowAccel = new Date();
          const currentDateAccelUTC = new Date(Date.UTC(nowAccel.getUTCFullYear(), nowAccel.getUTCMonth(), nowAccel.getUTCDate()));
          const ATLAS_ORBITAL_ELEMENTS = {
            eccentricity: 6.13941774,
            perihelion_distance_au: 1.35638454,
            perihelion_date: new Date('2025-10-29T11:33:16.000Z')
          };

          const q = ATLAS_ORBITAL_ELEMENTS.perihelion_distance_au;
          const e = ATLAS_ORBITAL_ELEMENTS.eccentricity;

          for (let date = new Date(startDateAccel); date <= currentDateAccelUTC; date.setUTCDate(date.getUTCDate() + 1)) {
            const isCurrentDay = date.getTime() === currentDateAccelUTC.getTime();
            const daysFromPerihelion = (date.getTime() - ATLAS_ORBITAL_ELEMENTS.perihelion_date.getTime()) / (1000 * 60 * 60 * 24);

            // Calculate distance using proper hyperbolic orbit mechanics
            const position = calculatePositionFromElements(daysFromPerihelion, {
              e: e,
              q: q,
              i: 46.74,    // inclination (degrees)
              omega: 338.5, // argument of periapsis (degrees)
              node: 342.9   // longitude of ascending node (degrees)
            });
            const distance_au = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
            const r_km = distance_au * AU_TO_KM_ACCEL;

            // Orbital acceleration magnitude: a = GM/r² (km/s²)
            const acceleration_km_s2 = GM_SUN_ACCEL / (r_km * r_km);

            // Convert to km/s per day for easier interpretation
            const acceleration_km_s_per_day = acceleration_km_s2 * SECONDS_PER_DAY;

            accelerationData.push({
              date: date.toISOString(),
              value: acceleration_km_s_per_day,
              confidence: isCurrentDay ? 0.95 : 0.85,
              dataPoints: 1
            });
          }
        }

        // Create mission status data - only if we have real data
        const missionStatusData: MissionStatusData | null = cometData?.data?.orbital_mechanics ? {
          current_distance_au: cometData.data.orbital_mechanics.current_distance?.heliocentric ?? 0,
          days_to_perihelion: Math.floor(
            (new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
          current_velocity_km_s: cometData.data.orbital_mechanics.current_velocity?.heliocentric ?? 0,
          // Add brightness trend from trend analysis (same as main page)
          brightness_trend: (() => {
            const trendAnalysis = cometData.data.stats?.trendAnalysis;
            if (!trendAnalysis) return undefined;
            return trendAnalysis.trend === 'brightening' ? 'brightening' :
                   trendAnalysis.trend === 'dimming' ? 'dimming' : 'stable';
          })(),
          // Add velocity trend calculation
          velocity_trend: 'constant' as const, // Default for now
          activity_level: activityData?.data?.currentActivity?.level || 'UNKNOWN',
          source_health: {
            cobs: cometData.data.source_status?.cobs?.active ?? false,
            jpl: cometData.data.source_status?.jpl_horizons?.active ?? false,
            theskylive: cometData.data.source_status?.theskylive?.active ?? false,
          },
          last_update: cometData.data.stats?.observationDateRange?.latest || new Date().toISOString(),
          brightness_magnitude: cometData.data.comet?.currentMagnitude ?? 0,
          geocentric_distance_au: cometData.data.orbital_mechanics.current_distance?.geocentric ?? 0,
        } : null;


        setState(prevState => ({
          ...prevState,
          lightCurveData: transformedLightCurve,
          observationData: transformedObservations,
          activityData: transformedActivityData,
          brightnessVelocityData: transformedBrightnessVelocityData,
          orbitalVelocityData: orbitalVelocityTransformed,
          accelerationData: accelerationData,
          morphologyData: transformedMorphologyData,
          missionStatus: missionStatusData,
          trendAnalysis: cometData?.data?.stats?.trendAnalysis || null,
          mpcOrbitalElements: cometData?.data?.mpc_orbital_elements,
          jplHorizonsData: cometData?.data?.orbital_mechanics ? {
            state_vectors: {
              position: [0, 0, 0] as [number, number, number],
              velocity: [0, 0, 0] as [number, number, number]
            },
            orbital_elements: {
              eccentricity: 6.14,
              inclination: 175,
              perihelion_distance: 1.36,
              velocity_at_perihelion: 68,
              semi_major_axis: -1.9,
              orbital_period: -1
            },
            ephemeris: {
              ra: 0,
              dec: 0,
              delta: cometData.data.orbital_mechanics.current_distance?.geocentric ?? 0,
              r: cometData.data.orbital_mechanics.current_distance?.heliocentric ?? 0,
              phase: 0,
              solar_elongation: 0,
              magnitude: cometData.data.comet?.currentMagnitude ?? 0
            },
            last_updated: new Date().toISOString(),
            data_source: 'JPL Horizons'
          } : null,
          ephemerisPosition: cometData?.data?.jpl_ephemeris?.current_position ? {
            ra: cometData.data.jpl_ephemeris.current_position.ra,
            dec: cometData.data.jpl_ephemeris.current_position.dec,
            last_updated: cometData.data.jpl_ephemeris.current_position.last_updated,
            data_source: cometData.data.jpl_ephemeris.data_source,
          } : undefined,
        }));

      } catch (err) {
        console.error('❌ Error fetching COBS data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch comet data');
      } finally {
        setLoading(false);
      }
    }

    fetchRealData();
  }, []);




  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="container mx-auto px-6 py-8">
          {/* Can I See It Tonight + Where to Look - 2-column responsive layout */}
          {!loading && !error && state.ephemerisPosition && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <CanISeeItBanner
                isVisible={false}
                magnitude={state.missionStatus?.brightness_magnitude}
                nextVisibleDate="Mid-November 2025"
                reason="Currently behind the Sun from Earth's perspective"
              />
              <SimpleSkyCompass
                ra={state.ephemerisPosition.ra}
                dec={state.ephemerisPosition.dec}
                isVisible={false}
                magnitude={state.missionStatus?.brightness_magnitude}
              />
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

            {/* Summary Widget - Like Mission Control on main page */}
            <div className="bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] rounded-lg p-6 border border-[var(--color-border-secondary)] mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    📊 Scientific Data & Analysis
                  </h2>
                  <p className="text-[var(--color-text-tertiary)] text-sm">
                    Detailed orbital mechanics, brightness trends, and activity analysis
                  </p>
                </div>
              </div>

              {/* Key Scientific Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                {/* Orbital Type */}
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🌌</div>
                  <div className="text-xl font-bold text-[var(--color-chart-quaternary)]">
                    Hyperbolic
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Orbit Type</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Escaping solar system</div>
                </div>

                {/* Velocity */}
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🚀</div>
                  <div className="text-xl font-bold text-[var(--color-chart-senary)]">
                    {state.missionStatus?.current_velocity_km_s?.toFixed(1) || 'N/A'} km/s
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Current Speed</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Relative to Sun</div>
                </div>

                {/* Days to Perihelion */}
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-xl font-bold text-[var(--color-status-warning)]">
                    {state.missionStatus?.days_to_perihelion !== undefined ? state.missionStatus.days_to_perihelion : 'N/A'}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Days to Closest Approach</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">October 30, 2025</div>
                </div>

                {/* Activity Level */}
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🔥</div>
                  <div className="text-xl font-bold text-[var(--color-status-error)]">
                    {state.missionStatus?.activity_level || 'N/A'}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Comet Activity</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Outgassing intensity</div>
                </div>
              </div>
            </div>

            {/* 1. TRAJECTORY & POSITION SECTION */}
            <div id="trajectory" className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--color-status-success)] mb-2">
                  🧭 Path Through the Solar System
                </h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">
                  Watch 3I/ATLAS&apos;s journey in real-time as it passes through our solar system on its way back to interstellar space
                </p>
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
                    <ModernSolarSystem />
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

              {/* Orbital Parameters */}
              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6">
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
            </div>


            {/* CURRENT POSITION BANNER */}
            {state.ephemerisPosition && (
              <CurrentPositionBanner
                ra={state.ephemerisPosition.ra}
                dec={state.ephemerisPosition.dec}
                lastUpdated={state.ephemerisPosition.last_updated}
              />
            )}

            {/* 2. VELOCITY ANALYSIS SECTION */}
            <div id="velocity" className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--color-chart-senary)] mb-2">
                  🚀 Speed Changes Over Time
                </h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">
                  How the object&apos;s velocity changes as it approaches and leaves the Sun, plus how fast it appears to move from Earth&apos;s perspective
                </p>
              </div>

              {/* Current Velocity Status */}
              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                  Current Speeds
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[var(--color-chart-primary)]">
                      {state.missionStatus?.current_velocity_km_s?.toFixed(1) || 'N/A'} km/s
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)]">Speed Relative to Sun</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{((state.missionStatus?.current_velocity_km_s || 0) * 2237).toFixed(0)} mph</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[var(--color-status-success)]">
                      {state.orbitalVelocityData?.[0]?.geocentric_velocity?.toFixed(1) || 'N/A'} km/s
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)]">Speed Relative to Earth</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{((state.orbitalVelocityData?.[0]?.geocentric_velocity || 0) * 2237).toFixed(0)} mph</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[var(--color-chart-quaternary)]">
                      {state.accelerationData?.length > 0 ?
                        (state.accelerationData[state.accelerationData.length - 1].value > 0 ? '🔥 Speeding Up' : '🟡 Slowing Down')
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)]">Current Trend</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Change in velocity</div>
                  </div>
                </div>
              </div>

              {/* Velocity Over Time Chart */}
              {state.orbitalVelocityData.length > 0 && (
                <ChartErrorBoundary>
                  <OrbitalVelocityChart
                    data={state.orbitalVelocityData}
                    title="Speed History - How velocity changes over time"
                  />
                </ChartErrorBoundary>
              )}

              {/* Acceleration Analysis */}
              {state.accelerationData.length > 0 && (
                <ChartErrorBoundary>
                  <VelocityChart
                    data={state.accelerationData}
                    title="Acceleration - Rate of speed change"
                    yAxisLabel="Acceleration"
                    unit="km/s/day"
                    color="#f97316"
                    height={400}
                    showTrend={false}
                  />
                </ChartErrorBoundary>
              )}
            </div>

            {/* 3. BRIGHTNESS ANALYSIS SECTION */}
            <div id="brightness" className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-[var(--color-status-warning)] mb-2 break-words">
                  ✨ How Bright 3I/ATLAS Appears
                </h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">
                  Tracking how 3I/ATLAS&apos;s brightness changes over time as it gets closer to (and farther from) the Sun
                </p>
                {/* Latest Observation Timestamp */}
                {state.missionStatus?.last_update && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <span className="text-base">🔄</span>
                    <span>
                      <strong className="text-[var(--color-text-primary)]">Latest Observation:</strong>{' '}
                      {new Date(state.missionStatus.last_update).toLocaleDateString('en-US', {
                        timeZone: 'UTC',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })} at {new Date(state.missionStatus.last_update).toLocaleTimeString('en-US', {
                        timeZone: 'UTC',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })} UTC
                      <span className="text-[var(--color-text-tertiary)]"> (from COBS)</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Magnitude Scale - Amateur-friendly brightness explanation */}
              <MagnitudeScale currentMagnitude={state.missionStatus?.brightness_magnitude} />

              {/* Brightness Trend Analysis */}
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

              {/* Light Curve Chart */}
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

              {/* Brightness Change Rate */}
              {state.brightnessVelocityData.length > 0 && (
                <ChartErrorBoundary>
                  <VelocityChart
                    data={state.brightnessVelocityData}
                    title="Rate of Brightness Change - How quickly it's getting brighter or dimmer"
                    yAxisLabel="Magnitude Change"
                    unit="mag/day"
                    color="#fbbf24"
                    height={400}
                  />
                </ChartErrorBoundary>
              )}
            </div>

            {/* 4. MORPHOLOGY ANALYSIS SECTION */}
            {state.morphologyData.length > 0 && (
            <div id="coma-tail" className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--color-chart-senary)] mb-2">
                  💫 Coma & Tail Development
                </h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">
                  Evolution of coma diameter (arcminutes) and tail length (degrees) from COBS observations
                </p>
              </div>

              {/* Layperson-friendly explanations */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-heading)] mb-3 flex items-center gap-2">
                  📏 What do these measurements mean?
                </h3>
                <div className="text-sm space-y-3 text-[var(--color-text-secondary)]">
                  <div>
                    <strong className="text-[var(--color-chart-secondary)]">Coma (arcminutes):</strong>{' '}
                    The fuzzy cloud of gas and dust around the comet&apos;s nucleus. The full Moon is ~30 arcminutes wide,
                    so a coma of 3 arcminutes would appear 1/10th the Moon&apos;s width through a telescope.
                  </div>
                  <div>
                    <strong className="text-[var(--color-chart-quinary)]">Tail (degrees):</strong>{' '}
                    The streaming trail of gas and dust blown away by solar wind. Your fist held at arm&apos;s length
                    covers ~10 degrees, so a 5-degree tail would stretch halfway across your fist in the sky.
                  </div>
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
            )}

            {/* 5. ACTIVITY LEVEL ANALYSIS SECTION */}
            <div id="activity" className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--color-chart-quaternary)] mb-2">
                  🔥 Comet Activity & Outgassing
                </h2>
                <p className="text-[var(--color-text-tertiary)] text-sm">
                  How active the comet is - measuring gas and dust being released as the Sun heats its icy surface
                </p>
              </div>

              {/* Current Activity Status */}
              <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Current Activity Level</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[var(--color-status-error)] mb-2">
                    {state.missionStatus?.activity_level || 'N/A'}
                  </div>
                  <div className="text-lg text-[var(--color-text-secondary)] mb-2">Activity Rating</div>
                  <div className="text-sm text-[var(--color-text-tertiary)]">
                    Measures how much gas and dust is being released
                  </div>
                </div>
              </div>

              {/* Activity Chart */}
              {state.activityData.length > 0 && (
                <ChartErrorBoundary>
                  <ActivityLevelChart
                    data={state.activityData}
                    showComponents={true}
                  />
                </ChartErrorBoundary>
              )}
            </div>

            {/* Data Sources & Attribution - Moved from Overview page */}
            <DataSourcesSection />
            </>
          )}
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}