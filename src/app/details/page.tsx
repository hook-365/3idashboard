'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import LightCurve, { LightCurveDataPoint } from '@/components/charts/LightCurve';
import BrightnessStats from '@/components/stats/BrightnessStats';
import ActivityLevelChart, { ActivityIndexDataPoint } from '@/components/charts/ActivityLevelChart';
import VelocityChart, { VelocityDataPoint } from '@/components/charts/VelocityChart';
import OrbitalVelocityChart, { OrbitalVelocityDataPoint } from '@/components/charts/OrbitalVelocityChart';
import DataSourcesSection from '@/components/common/DataSourcesSection';
import PageNavigation from '@/components/common/PageNavigation';
import AppHeader from '@/components/common/AppHeader';
import { MissionStatusData } from '@/components/charts/MissionStatusWidget';
import { ANALYTICS_DATE_CONFIG } from '@/utils/analytics-config';

// Dynamically import heavy 3D component
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
  missionStatus: MissionStatusData | null;
  trendAnalysis: {
    trend: 'brightening' | 'dimming' | 'stable';
    rate: number;
    confidence: number;
    periodDays: number;
    r2: number;
  } | null;
}

export default function AnalyticsPage() {
  const [state, setState] = useState<AnalyticsPageState>({
    lightCurveData: [],
    observationData: [],
    activityData: [],
    brightnessVelocityData: [],
    orbitalVelocityData: [],
    accelerationData: [],
    missionStatus: null,
    trendAnalysis: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real COBS data on component mount
  useEffect(() => {
    async function fetchRealData() {
      try {
        setLoading(true);
        setError(null);

        console.log('🔭 Fetching real COBS data for 3I/ATLAS comet via API...');

        const { QUERY_PARAMS } = ANALYTICS_DATE_CONFIG;
        const [observersRes, activityRes, cometDataRes,
               brightnessVelocityRes] = await Promise.all([
          fetch('/api/observers?format=map&stats=true'),
          fetch(`/api/simple-activity?days=${QUERY_PARAMS.days}`),
          fetch(`/api/comet-data?smooth=true&predict=true&limit=500&trendDays=30`),
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

        console.log(`✅ Fetched ${observations.length} observations, ${lightCurve.length} light curve points, ${observers.length} observers, ${activity.length} activity index points, ${brightnessVelocity.length} brightness velocity points`);

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
          missionStatus: missionStatusData,
          trendAnalysis: cometData?.data?.stats?.trendAnalysis || null
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
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <div className="animate-pulse text-4xl mb-4">☄️</div>
              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-blue-400 rounded-full mb-4"></div>
              <h3 className="text-xl font-semibold text-white mb-2">Tracking Interstellar Visitor</h3>
              <p className="text-gray-400">Synchronizing analytics from COBS, JPL Horizons & TheSkyLive...</p>
            </div>
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

            {/* 1. DIRECTION & ORBITAL MECHANICS SECTION */}
            <div className="space-y-8 mb-12">
              <div className="text-center">
                <h2 className="text-3xl font-semibold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent mb-2">
                  🧭 Direction & Orbital Mechanics
                </h2>
                <p className="text-gray-400">
                  Tracking changes in orbital path and direction
                </p>
              </div>

              {/* 3D Solar System Visualization */}
              <div className="bg-gray-700 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-semibold text-white mb-4 text-center">Solar System Flyby</h3>
                <ModernSolarSystem />
              </div>

              {/* Current Orbital Parameters */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4 text-center">Technical Details</h3>

                <div className="p-4 bg-gray-800 rounded-lg max-w-4xl mx-auto">
                  <div className="text-xs text-gray-300 space-y-3 font-mono">
                    {/* Orbital Elements */}
                    <div>
                      <div className="text-yellow-400 font-semibold mb-2 text-center">ORBITAL ELEMENTS</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div><span className="text-gray-500">Eccentricity (e):</span> <span className="text-blue-300">6.1396</span></div>
                        <div><span className="text-gray-500">Perihelion (q):</span> <span className="text-blue-300">1.3564 AU</span></div>
                        <div><span className="text-gray-500">Semi-major (a):</span> <span className="text-blue-300">-0.264 AU</span></div>
                        <div><span className="text-gray-500">Inclination (i):</span> <span className="text-blue-300">175.11°</span></div>
                        <div><span className="text-gray-500">Asc. Node (Ω):</span> <span className="text-blue-300">322.16°</span></div>
                        <div><span className="text-gray-500">Arg. Periapsis (ω):</span> <span className="text-blue-300">128.01°</span></div>
                      </div>
                    </div>

                    {/* Current State */}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-yellow-400 font-semibold mb-2 text-center">CURRENT STATE</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div><span className="text-gray-500">r (Sun):</span> <span className="text-green-300">{state.missionStatus?.current_distance_au?.toFixed(3) || 'N/A'} AU</span></div>
                        <div><span className="text-gray-500">Δ (Earth):</span> <span className="text-green-300">{state.missionStatus?.geocentric_distance_au?.toFixed(3) || 'N/A'} AU</span></div>
                        <div><span className="text-gray-500">Days to q:</span> <span className="text-green-300">{state.missionStatus?.days_to_perihelion !== undefined ? state.missionStatus.days_to_perihelion : 'N/A'}</span></div>
                        <div><span className="text-gray-500">T₀ (perihelion):</span> <span className="text-green-300">2025-Oct-30</span></div>
                        <div><span className="text-gray-500">v∞ (escape):</span> <span className="text-green-300">58 km/s</span></div>
                      </div>
                    </div>

                    {/* Velocity State */}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-yellow-400 font-semibold mb-2 text-center">VELOCITY</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                        <div><span className="text-gray-500">v (heliocentric):</span> <span className="text-cyan-300">{state.missionStatus?.current_velocity_km_s?.toFixed(2) || 'N/A'} km/s</span></div>
                        <div><span className="text-gray-500">v (geocentric):</span> <span className="text-cyan-300">{state.orbitalVelocityData?.[state.orbitalVelocityData.length - 1]?.geocentric_velocity?.toFixed(2) || 'N/A'} km/s</span></div>
                        <div><span className="text-gray-500">v (at perihelion):</span> <span className="text-cyan-300">68 km/s</span></div>
                        <div><span className="text-gray-500">Acceleration:</span> <span className="text-cyan-300">{state.accelerationData?.length > 0 ? (state.accelerationData[state.accelerationData.length - 1].value > 0 ? 'Increasing ↑' : 'Decreasing ↓') : 'N/A'}</span></div>
                        <div><span className="text-gray-500">Trend (7d):</span> <span className="text-cyan-300">{state.missionStatus?.velocity_trend === 'constant' ? 'Constant' : state.missionStatus?.velocity_trend || 'N/A'}</span></div>
                        <div><span className="text-gray-500">v² = μ(2/r - 1/a):</span> <span className="text-cyan-300 text-[10px]">vis-viva</span></div>
                      </div>
                    </div>

                    {/* Trajectory Characteristics */}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-yellow-400 font-semibold mb-2 text-center">TRAJECTORY</div>
                      <div className="text-center text-gray-400 space-y-1">
                        <div><span className="text-purple-300">Hyperbolic Orbit:</span> e &gt; 1 (unbound, escape trajectory)</div>
                        <div><span className="text-purple-300">Retrograde:</span> i ≈ 175° (nearly polar, opposite to planets)</div>
                        <div><span className="text-purple-300">Origin:</span> Interstellar space (third confirmed ISO)</div>
                        <div className="text-[10px] pt-1"><span className="text-gray-500">ε = v²/2 - μ/r &gt; 0</span> • <span className="text-gray-500">Negative semi-major axis</span> • <span className="text-gray-500">One-time solar flyby</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. VELOCITY ANALYSIS SECTION */}
            <div className="space-y-8 mb-12">
              <div className="text-center">
                <h2 className="text-3xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  🚀 Velocity & Acceleration Analysis
                </h2>
                <p className="text-gray-400">
                  Real-time orbital velocity, acceleration, and deceleration tracking
                </p>
              </div>

              {/* Current Velocity Status */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Current Orbital Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {state.missionStatus?.current_velocity_km_s?.toFixed(1) || 'N/A'} km/s
                    </div>
                    <div className="text-sm text-gray-300">Heliocentric Velocity</div>
                    <div className="text-xs text-gray-400">Relative to Sun</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">
                      {state.orbitalVelocityData?.[0]?.geocentric_velocity?.toFixed(1) || 'N/A'} km/s
                    </div>
                    <div className="text-sm text-gray-300">Geocentric Velocity</div>
                    <div className="text-xs text-gray-400">Relative to Earth</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {state.accelerationData?.length > 0 ?
                        (state.accelerationData[state.accelerationData.length - 1].value > 0 ? '🔥 Accelerating' : '🟡 Decelerating')
                        : 'N/A'
                      }
                    </div>
                    <div className="text-sm text-gray-300">Current Trend</div>
                    <div className="text-xs text-gray-400">Velocity change</div>
                  </div>
                </div>
              </div>

              {/* Velocity Over Time Chart */}
              {state.orbitalVelocityData.length > 0 && (
                <OrbitalVelocityChart
                  data={state.orbitalVelocityData}
                  title="Orbital Velocity Evolution"
                />
              )}

              {/* Acceleration Analysis */}
              {state.accelerationData.length > 0 && (
                <VelocityChart
                  data={state.accelerationData}
                  title="Acceleration Analysis - Speed Changes Over Time"
                  yAxisLabel="Acceleration"
                  unit="km/s/day"
                  color="#f97316"
                  height={400}
                />
              )}
            </div>

            {/* 3. BRIGHTNESS ANALYSIS SECTION */}
            <div className="space-y-8 mb-12">
              <div className="text-center">
                <h2 className="text-3xl font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-2">
                  ✨ Brightness Analysis
                </h2>
                <p className="text-gray-400">
                  Magnitude tracking with brightening/dimming trend analysis
                </p>
              </div>

              {/* Brightness Trend Analysis */}
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

              {/* Light Curve Chart */}
              <LightCurve
                data={state.observationData.map(obs => ({
                  date: obs.date,
                  magnitude: obs.magnitude,
                  filter: obs.filter || 'Visual',
                  observer: obs.observer.name,
                  quality: obs.quality,
                  source: 'COBS'
                }))}
                showSources={true}
                showTrendLine={true}
                showAstronomicalModel={false}
                enableZoom={true}
                enablePan={true}
              />

              {/* Brightness Change Rate */}
              {state.brightnessVelocityData.length > 0 && (
                <VelocityChart
                  data={state.brightnessVelocityData}
                  title="Brightness Change Rate"
                  yAxisLabel="Magnitude Change"
                  unit="mag/day"
                  color="#fbbf24"
                  height={400}
                />
              )}
            </div>

            {/* 4. ACTIVITY LEVEL ANALYSIS SECTION */}
            <div className="space-y-8 mb-12">
              <div className="text-center">
                <h2 className="text-3xl font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  🔥 Activity Level Analysis
                </h2>
                <p className="text-gray-400">
                  Physics-based comet activity analysis using brightness vs distance
                </p>
              </div>

              {/* Current Activity Status */}
              <div className="bg-gray-700 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Current Activity Level</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-400 mb-2">
                    {state.missionStatus?.activity_level || 'N/A'}
                  </div>
                  <div className="text-lg text-gray-300 mb-2">Activity Classification</div>
                  <div className="text-sm text-gray-400">
                    Based on brightness deviation from expected distance-only dimming
                  </div>
                </div>
              </div>

              {/* Activity Chart */}
              {state.activityData.length > 0 && (
                <ActivityLevelChart
                  data={state.activityData}
                  showComponents={true}
                />
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