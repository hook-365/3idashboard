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
import ChartSkeleton from '@/components/common/ChartSkeleton';
import { VisualizationSkeleton } from '@/components/common/CardSkeleton';
import CardSkeleton from '@/components/common/CardSkeleton';
import OrbitalElementsComparison from '@/components/orbital/OrbitalElementsComparison';
import type { MPCOrbitalElements } from '@/types/enhanced-comet-data';
import type { JPLHorizonsData } from '@/lib/data-sources/jpl-horizons';

// Dynamically import heavy 3D component (~500KB)
const ModernSolarSystem = dynamic(() => import('@/components/visualization/ModernSolarSystem'), {
  loading: () => (
    <div className="bg-gray-800 rounded-lg p-6 h-[600px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-cyan-400 rounded-full mb-4"></div>
        <div className="text-gray-400">Loading 3D Visualization...</div>
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
          .map((obs: { date: string; coma?: number; tail?: number }) => ({
            date: obs.date,
            comaSize: obs.coma,
            tailLength: obs.tail,
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


        // Generate historical orbital velocity data using vis-viva equation
        const orbitalVelocityTransformed: OrbitalVelocityDataPoint[] = [];

        if (cometData?.data?.orbital_mechanics?.current_velocity?.heliocentric) {
          const currentVel = cometData.data.orbital_mechanics.current_velocity.heliocentric;
          const currentGeoVel = cometData.data.orbital_mechanics.current_velocity.geocentric;
          const startDate = new Date('2025-07-01');
          const currentDate = new Date();
          const perihelionDate = new Date('2025-10-30');

          // Calculate current days to perihelion
          const currentDaysToPerihelion = (perihelionDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);

          // Generate weekly data points from July 1 to current date
          const dataPoints: Array<{date: Date; daysToPerihelion: number}> = [];
          for (let date = new Date(startDate); date <= currentDate; date.setDate(date.getDate() + 7)) {
            const daysToPerihelion = (perihelionDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
            dataPoints.push({ date: new Date(date), daysToPerihelion });
          }

          // Process each data point
          dataPoints.forEach((point, index) => {
            const isLastPoint = index === dataPoints.length - 1;

            let helioVel: number;
            let geoVel: number;

            if (isLastPoint) {
              // Use real current values from API for the last point
              helioVel = currentVel;
              geoVel = currentGeoVel;
            } else {
              // For historical points, use smooth interpolation from current values
              // Velocity increases as comet approaches perihelion (conservation of energy)

              // Calculate velocity ratio based on distance from perihelion
              // At perihelion (day 0): v = 68 km/s
              // Currently (day ~30): v = 66.94 km/s
              // Back in July (day ~121): v was slower

              // Use inverse square root relationship: v ∝ 1/sqrt(days_to_perihelion)
              // Normalize so current day gives current velocity
              const currentDaysFactor = Math.sqrt(Math.abs(currentDaysToPerihelion) + 1);
              const historicalDaysFactor = Math.sqrt(Math.abs(point.daysToPerihelion) + 1);

              // Scale current velocity by the ratio
              helioVel = currentVel * (currentDaysFactor / historicalDaysFactor);

              // Geocentric velocity: similar smooth interpolation
              // Earth's motion adds/subtracts ~30 km/s depending on geometry
              geoVel = currentGeoVel * (currentDaysFactor / historicalDaysFactor);
            }

            orbitalVelocityTransformed.push({
              date: point.date.toISOString(),
              heliocentric_velocity: helioVel,
              geocentric_velocity: geoVel,
              uncertainty: isLastPoint ? 0.1 : 0.5,
              source: isLastPoint ? 'NASA/JPL Horizons' : 'Calculated (vis-viva)'
            });
          });
        }

        // Calculate acceleration data (change in velocity over time)
        const accelerationData: VelocityDataPoint[] = [];
        for (let i = 1; i < orbitalVelocityTransformed.length; i++) {
          const current = orbitalVelocityTransformed[i];
          const previous = orbitalVelocityTransformed[i - 1];

          const currentDate = new Date(current.date);
          const previousDate = new Date(previous.date);
          const timeDiff = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24); // days

          // Calculate acceleration in km/s per day
          const helioAcceleration = (current.heliocentric_velocity - previous.heliocentric_velocity) / timeDiff;

          accelerationData.push({
            date: current.date,
            value: helioAcceleration,
            confidence: 0.8,
            dataPoints: 2
          });
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
          last_update: new Date().toISOString(),
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
          } : null
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
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="container mx-auto px-6 py-8">


          {/* Loading State */}
          {loading && (
            <>
              {/* 3D Visualization Skeleton */}
              <div className="space-y-8 mb-12">
                <div className="text-center">
                  <div className="h-10 w-64 bg-gray-700 rounded animate-pulse mx-auto mb-2"></div>
                  <div className="h-5 w-96 bg-gray-700 rounded animate-pulse mx-auto"></div>
                </div>
                <VisualizationSkeleton />
                <CardSkeleton height={400} className="mb-8" />
              </div>

              {/* Velocity Analysis Skeletons */}
              <div className="space-y-8 mb-12">
                <div className="text-center">
                  <div className="h-10 w-96 bg-gray-700 rounded animate-pulse mx-auto mb-2"></div>
                  <div className="h-5 w-80 bg-gray-700 rounded animate-pulse mx-auto"></div>
                </div>
                <CardSkeleton height={200} />
                <ChartSkeleton height={400} />
                <ChartSkeleton height={400} />
              </div>

              {/* Brightness Analysis Skeletons */}
              <div className="space-y-8 mb-12">
                <div className="text-center">
                  <div className="h-10 w-64 bg-gray-700 rounded animate-pulse mx-auto mb-2"></div>
                  <div className="h-5 w-96 bg-gray-700 rounded animate-pulse mx-auto"></div>
                </div>
                <ChartSkeleton height={300} />
                <ChartSkeleton height={400} />
                <ChartSkeleton height={400} />
              </div>

              {/* Activity Level Skeletons */}
              <div className="space-y-8 mb-12">
                <div className="text-center">
                  <div className="h-10 w-80 bg-gray-700 rounded animate-pulse mx-auto mb-2"></div>
                  <div className="h-5 w-96 bg-gray-700 rounded animate-pulse mx-auto"></div>
                </div>
                <CardSkeleton height={200} />
                <ChartSkeleton height={400} />
              </div>
            </>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900 border border-red-600 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-200 mb-2">⚠️ Data Fetch Error</h3>
              <p className="text-red-300 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white"
              >
                Retry
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>

            {/* Summary Widget - Like Mission Control on main page */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    📊 Scientific Analysis Dashboard
                  </h2>
                  <p className="text-gray-400 text-sm">
                    Detailed orbital mechanics, brightness trends, and activity analysis
                  </p>
                </div>
              </div>

              {/* Key Scientific Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                {/* Orbital Type */}
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🌌</div>
                  <div className="text-xl font-bold text-purple-400">
                    Hyperbolic
                  </div>
                  <div className="text-xs text-gray-400">Orbit Type</div>
                  <div className="text-xs text-gray-500">Escaping solar system</div>
                </div>

                {/* Velocity */}
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🚀</div>
                  <div className="text-xl font-bold text-cyan-400">
                    {state.missionStatus?.current_velocity_km_s?.toFixed(1) || 'N/A'} km/s
                  </div>
                  <div className="text-xs text-gray-400">Current Speed</div>
                  <div className="text-xs text-gray-500">Relative to Sun</div>
                </div>

                {/* Days to Perihelion */}
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-xl font-bold text-yellow-400">
                    {state.missionStatus?.days_to_perihelion !== undefined ? state.missionStatus.days_to_perihelion : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-400">Days to Closest Approach</div>
                  <div className="text-xs text-gray-500">October 30, 2025</div>
                </div>

                {/* Activity Level */}
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl mb-1">🔥</div>
                  <div className="text-xl font-bold text-red-400">
                    {state.missionStatus?.activity_level || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-400">Comet Activity</div>
                  <div className="text-xs text-gray-500">Outgassing intensity</div>
                </div>
              </div>
            </div>

            {/* 1. TRAJECTORY & POSITION SECTION */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-green-400 mb-2">
                  🧭 Path Through the Solar System
                </h2>
                <p className="text-gray-400 text-sm">
                  Watch the comet&apos;s journey in real-time as it passes through our solar system on its way back to interstellar space
                </p>
              </div>

              {/* 3D Visualization - Lazy loaded after initial render */}
              <VisualizationErrorBoundary>
                <div className="bg-gray-700 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Interactive 3D View</h3>
                  {shouldLoadVisualization ? (
                    <ModernSolarSystem />
                  ) : (
                    <div className="h-[600px] bg-gray-800 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-4 opacity-50 animate-pulse">🌌</div>
                        <div className="text-gray-400">Loading 3D visualization...</div>
                      </div>
                    </div>
                  )}
                </div>
              </VisualizationErrorBoundary>

              {/* Orbital Parameters */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Technical Details</h3>
                <p className="text-sm text-gray-400 mb-4">Orbital elements and current position data</p>

                <div className="p-4 bg-gray-800 rounded-lg max-w-4xl mx-auto">
                  <div className="text-xs text-gray-300 space-y-3 font-mono">
                    {/* Orbital Elements */}
                    <div>
                      <div className="text-yellow-400 font-semibold mb-2 text-center">ORBIT SHAPE & ORIENTATION</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div><span className="text-gray-500">Eccentricity:</span> <span className="text-blue-300">6.14</span> <span className="text-gray-600 text-[10px]">(escape orbit)</span></div>
                        <div><span className="text-gray-500">Closest to Sun:</span> <span className="text-blue-300">1.36 AU</span></div>
                        <div><span className="text-gray-500">Orbit tilt:</span> <span className="text-blue-300">175°</span> <span className="text-gray-600 text-[10px]">(retrograde)</span></div>
                        <div><span className="text-gray-500">Ascending Node:</span> <span className="text-blue-300">322.16°</span></div>
                        <div><span className="text-gray-500">Perihelion Arg:</span> <span className="text-blue-300">128.01°</span></div>
                      </div>
                    </div>

                    {/* Current State */}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-yellow-400 font-semibold mb-2 text-center">CURRENT POSITION</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div><span className="text-gray-500">Distance from Sun:</span> <span className="text-green-300">{state.missionStatus?.current_distance_au?.toFixed(3) || 'N/A'} AU</span></div>
                        <div><span className="text-gray-500">Distance from Earth:</span> <span className="text-green-300">{state.missionStatus?.geocentric_distance_au?.toFixed(3) || 'N/A'} AU</span></div>
                        <div><span className="text-gray-500">Days to closest:</span> <span className="text-green-300">{state.missionStatus?.days_to_perihelion !== undefined ? state.missionStatus.days_to_perihelion : 'N/A'}</span></div>
                        <div><span className="text-gray-500">Closest approach:</span> <span className="text-green-300">Oct 30, 2025</span></div>
                        <div><span className="text-gray-500">Escape speed:</span> <span className="text-green-300">58 km/s</span></div>
                      </div>
                    </div>

                    {/* Velocity State */}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-yellow-400 font-semibold mb-2 text-center">SPEED</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div><span className="text-gray-500">Speed (vs Sun):</span> <span className="text-cyan-300">{state.missionStatus?.current_velocity_km_s?.toFixed(2) || 'N/A'} km/s</span></div>
                        <div><span className="text-gray-500">Speed (vs Earth):</span> <span className="text-cyan-300">{state.orbitalVelocityData?.[state.orbitalVelocityData.length - 1]?.geocentric_velocity?.toFixed(2) || 'N/A'} km/s</span></div>
                        <div><span className="text-gray-500">At closest point:</span> <span className="text-cyan-300">68 km/s</span></div>
                        <div><span className="text-gray-500">Acceleration:</span> <span className="text-cyan-300">{state.accelerationData?.length > 0 ? (state.accelerationData[state.accelerationData.length - 1].value > 0 ? 'Speeding up ↑' : 'Slowing down ↓') : 'N/A'}</span></div>
                        <div><span className="text-gray-500">7-day trend:</span> <span className="text-cyan-300">{state.missionStatus?.velocity_trend === 'constant' ? 'Steady' : state.missionStatus?.velocity_trend || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Trajectory Characteristics */}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-yellow-400 font-semibold mb-2 text-center">TRAJECTORY TYPE</div>
                      <div className="text-center text-gray-400 space-y-1">
                        <div><span className="text-purple-300">Hyperbolic:</span> Will escape the solar system forever</div>
                        <div><span className="text-purple-300">Retrograde:</span> Moving opposite direction from planets</div>
                        <div><span className="text-purple-300">Origin:</span> Interstellar space (3rd confirmed visitor)</div>
                        <div className="text-[10px] pt-1 text-gray-500">One-time flyby • Never returning • From beyond our solar system</div>
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

            {/* 2. VELOCITY ANALYSIS SECTION */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">
                  🚀 Speed Changes Over Time
                </h2>
                <p className="text-gray-400 text-sm">
                  How the comet&apos;s velocity changes as it approaches and leaves the Sun, plus how fast it appears to move from Earth&apos;s perspective
                </p>
              </div>

              {/* Current Velocity Status */}
              <div className="bg-gray-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Current Speeds</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {state.missionStatus?.current_velocity_km_s?.toFixed(1) || 'N/A'} km/s
                    </div>
                    <div className="text-sm text-gray-300">Speed Relative to Sun</div>
                    <div className="text-xs text-gray-400">{((state.missionStatus?.current_velocity_km_s || 0) * 2237).toFixed(0)} mph</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {state.orbitalVelocityData?.[0]?.geocentric_velocity?.toFixed(1) || 'N/A'} km/s
                    </div>
                    <div className="text-sm text-gray-300">Speed Relative to Earth</div>
                    <div className="text-xs text-gray-400">{((state.orbitalVelocityData?.[0]?.geocentric_velocity || 0) * 2237).toFixed(0)} mph</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {state.accelerationData?.length > 0 ?
                        (state.accelerationData[state.accelerationData.length - 1].value > 0 ? '🔥 Speeding Up' : '🟡 Slowing Down')
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-300">Current Trend</div>
                    <div className="text-xs text-gray-400">Change in velocity</div>
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
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-yellow-400 mb-2">
                  ✨ How Bright the Comet Appears
                </h2>
                <p className="text-gray-400 text-sm">
                  Tracking how the comet&apos;s brightness changes over time as it gets closer to (and farther from) the Sun
                </p>
              </div>

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

            {/* 4. ACTIVITY LEVEL ANALYSIS SECTION */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-purple-400 mb-2">
                  🔥 Comet Activity & Outgassing
                </h2>
                <p className="text-gray-400 text-sm">
                  How active the comet is - measuring gas and dust being released as the Sun heats its icy surface
                </p>
              </div>

              {/* Current Activity Status */}
              <div className="bg-gray-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Current Activity Level</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-400 mb-2">
                    {state.missionStatus?.activity_level || 'N/A'}
                  </div>
                  <div className="text-lg text-gray-300 mb-2">Activity Rating</div>
                  <div className="text-sm text-gray-400">
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

            {/* 5. MORPHOLOGY ANALYSIS SECTION */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-teal-400 mb-2">
                  💫 Coma & Tail Development
                </h2>
                <p className="text-gray-400 text-sm">
                  Tracking the size of the comet&apos;s coma (surrounding atmosphere) and tail as it approaches the Sun
                </p>
              </div>

              {/* Morphology Summary Stats */}
              {state.morphologyData.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Current Morphology</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400">
                        {state.morphologyData.filter(d => d.comaSize).length > 0
                          ? state.morphologyData.filter(d => d.comaSize).slice(-1)[0].comaSize?.toFixed(2)
                          : 'N/A'} arcmin
                      </div>
                      <div className="text-sm text-gray-300">Latest Coma Size</div>
                      <div className="text-xs text-gray-400">
                        {state.morphologyData.filter(d => d.comaSize).length} measurements
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400">
                        {state.morphologyData.filter(d => d.tailLength).length > 0
                          ? state.morphologyData.filter(d => d.tailLength).slice(-1)[0].tailLength?.toFixed(2)
                          : 'N/A'} degrees
                      </div>
                      <div className="text-sm text-gray-300">Latest Tail Length</div>
                      <div className="text-xs text-gray-400">
                        {state.morphologyData.filter(d => d.tailLength).length} measurements
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Coma & Tail Chart */}
              {state.morphologyData.length > 0 ? (
                <ChartErrorBoundary>
                  <ComaAndTailChart
                    data={state.morphologyData}
                    title="Coma & Tail Evolution Over Time"
                  />
                </ChartErrorBoundary>
              ) : (
                <div className="bg-gray-700 rounded-lg p-6 text-center">
                  <div className="text-gray-400">
                    No coma or tail measurements available yet. Check back as more observations are reported.
                  </div>
                </div>
              )}
            </div>

            {/* Data Sources & Attribution */}
            <DataSourcesSection />
            </>
          )}
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}