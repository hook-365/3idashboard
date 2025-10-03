'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import MissionStatusWidget, { MissionStatusData } from '../components/charts/MissionStatusWidget';
import ExtensionSafeWrapper from '../components/ExtensionSafeWrapper';
import DataSourcesSection from '../components/common/DataSourcesSection';
import PageNavigation from '../components/common/PageNavigation';
import AppHeader from '../components/common/AppHeader';
import { calculateActivityFromAPIData } from '../utils/activity-calculator';
import { APIErrorBoundary, ChartErrorBoundary } from '../components/common/ErrorBoundary';
import { MissionStatusSkeleton } from '../components/common/CardSkeleton';
import { CollaborationStatsSkeleton } from '../components/common/StatsSkeleton';
import TableSkeleton, { TableSkeletonMobile } from '../components/common/TableSkeleton';
import ChartSkeleton from '../components/common/ChartSkeleton';

// Dynamically import Chart.js components to reduce initial bundle size (~150KB saved)
const LightCurve = dynamic(() => import('../components/charts/LightCurve'), {
  loading: () => <ChartSkeleton height={384} showLegend={true} />,
  ssr: false
});


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
}

export default function Home() {
  const [data, setData] = useState<CometData | null>(null);
  const [loading, setLoading] = useState(true);
  const [missionStatus, setMissionStatus] = useState<MissionStatusData | null>(null);

  // Memoize recent observations calculation to avoid recalculating on every render
  const recentObservations = useMemo(() => {
    if (!data?.comet?.observations) return 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return data.comet.observations.filter(obs =>
      new Date(obs.date) >= oneWeekAgo
    ).length;
  }, [data?.comet?.observations]);

  // Memoize light curve data transformation to avoid recreating on every render
  const lightCurveData = useMemo(() => {
    if (!data?.comet?.observations) return [];
    return data.comet.observations.map(obs => ({
      date: obs.date,
      magnitude: obs.magnitude,
      filter: 'Community',
      observer: 'Observer Network',
      quality: 'good' as const
    }));
  }, [data?.comet?.observations]);

  // Removed real-time hooks for Chart.js demo

  // Fetch comet data
  useEffect(() => {
    // Fetch basic data - use limit=200 for full light curve history
    fetch('/api/comet-data?smooth=true&predict=true&limit=200&trendDays=30')
      .then(res => res.json())
      .then((cometResult) => {
        if (cometResult.success) {
          setData(cometResult.data);

          // Validate that we have real data before setting mission status
          const hasRealData = cometResult.data?.orbital_mechanics?.current_distance?.heliocentric &&
                             cometResult.data?.orbital_mechanics?.current_velocity?.heliocentric &&
                             cometResult.data?.comet?.currentMagnitude;

          if (hasRealData) {
            // Create mission status data from real enhanced sources
            const missionStatusData: MissionStatusData = {
              current_distance_au: cometResult.data.orbital_mechanics.current_distance.heliocentric,
              days_to_perihelion: Math.floor(
                (new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              ),
              current_velocity_km_s: cometResult.data.orbital_mechanics.current_velocity.heliocentric,
              // Calculate velocity trend from acceleration data
              velocity_trend: (() => {
                const acceleration = cometResult.data.orbital_mechanics?.velocity_changes?.acceleration || 0;
                // Use 0.00001 km/s² threshold (0.864 km/s per day)
                if (acceleration > 0.00001) return 'accelerating';
                if (acceleration < -0.00001) return 'decelerating';
                return 'constant';
              })(),
              // Calculate brightness trend from trend analysis
              brightness_trend: (() => {
                const trendAnalysis = cometResult.data.stats?.trendAnalysis;
                if (!trendAnalysis) return undefined;
                return trendAnalysis.trend === 'brightening' ? 'brightening' :
                       trendAnalysis.trend === 'dimming' ? 'dimming' : 'stable';
              })(),
              activity_level: (() => {
                // Calculate real activity level from observational data
                const observations = cometResult.data.comet.observations || [];
                const heliocentric_distance = cometResult.data.orbital_mechanics.current_distance.heliocentric;

                // Use latest observation for activity calculation (same as simple-activity API)
                if (observations.length === 0) {
                  return 'INSUFFICIENT_DATA';
                }

                const latestObservation = observations[0]; // Observations are sorted newest first
                const realActivity = calculateActivityFromAPIData(
                  [latestObservation], // Pass single latest observation, not entire array
                  { ephemeris: { r: heliocentric_distance } }
                );
                return realActivity.level;
              })(),
              source_health: {
                cobs: cometResult.data.source_status?.cobs?.active || false,
                jpl: cometResult.data.source_status?.jpl_horizons?.active || false,
                theskylive: cometResult.data.source_status?.theskylive?.active || false,
              },
              last_update: new Date().toISOString(),
              brightness_magnitude: cometResult.data.comet.currentMagnitude,
              geocentric_distance_au: cometResult.data.orbital_mechanics.current_distance.geocentric,
            };
            setMissionStatus(missionStatusData);
          } else {
            console.warn('Insufficient real data available - mission status not set');
          }

        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, []);


  if (loading) {
    return (
      <ExtensionSafeWrapper>
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Header */}
          <AppHeader sourceStatus={undefined} />

          {/* Navigation */}
          <PageNavigation />

          <div className="container mx-auto px-6 py-8">
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
      <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <AppHeader sourceStatus={data?.source_status} />

      {/* Navigation */}
      <PageNavigation />

      <div className="container mx-auto px-6 py-8">

        {/* Mission Control Dashboard */}
        <APIErrorBoundary>
          <div className="mb-8">
            <MissionStatusWidget
              data={missionStatus || undefined}
              loading={loading}
            />
          </div>
        </APIErrorBoundary>

        {/* Global Collaboration Stats */}
        {data?.stats && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-2 text-cyan-400">🌍 Global Collaboration</h3>
            <p className="text-sm text-gray-400 mb-4">
              Amateur and professional astronomers worldwide contributing observations to track this interstellar visitor
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{data.stats.totalObservations}</div>
                <div className="text-sm text-gray-300">Brightness Measurements</div>
                <div className="text-xs text-gray-500">Total recorded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{data.stats.activeObservers}</div>
                <div className="text-sm text-gray-300">Contributing Astronomers</div>
                <div className="text-xs text-gray-500">Worldwide network</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {recentObservations}
                </div>
                <div className="text-sm text-gray-300">New Reports</div>
                <div className="text-xs text-gray-500">Last 7 days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">COBS</div>
                <div className="text-sm text-gray-300">Data Network</div>
                <div className="text-xs text-gray-500">Global database</div>
              </div>
            </div>

            {/* Brightness Observations Graph */}
            <ExtensionSafeWrapper
              className="mt-6"
              suppressWarnings={process.env.NODE_ENV === 'production'}
            >
              <ChartErrorBoundary>
                {data?.comet.observations && (
                  <LightCurve
                    data={lightCurveData}
                  />
                )}
              </ChartErrorBoundary>
            </ExtensionSafeWrapper>
          </div>
        )}

        {/* Recent Observations Table - Desktop */}
        <ExtensionSafeWrapper className="hidden md:block bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Recent Community Observations</h3>
          {data?.comet?.observations && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Observer</th>
                    <th className="text-left py-3 px-2 hidden lg:table-cell">Location</th>
                    <th className="text-left py-3 px-2">Filter</th>
                    <th className="text-right py-3 px-2">Magnitude</th>
                    <th className="text-center py-3 px-2 hidden xl:table-cell">Aperture</th>
                    <th className="text-center py-3 px-2 hidden xl:table-cell">Coma</th>
                    <th className="text-center py-3 px-2">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comet.observations.slice(0, 8).map((obs) => (
                    <tr key={obs.id} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                      <td className="py-3 px-2 text-gray-300">
                        {new Date(obs.date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-2 font-medium">{obs.observer.name}</td>
                      <td className="py-3 px-2 text-gray-400 hidden lg:table-cell">{obs.observer.location.name}</td>
                      <td className="py-3 px-2 text-gray-400 text-xs">{obs.filter || 'V'}</td>
                      <td className="py-3 px-2 text-right font-mono text-lg text-green-400">
                        {obs.magnitude.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-gray-400 hidden xl:table-cell">
                        {obs.aperture ? `${obs.aperture}"` : '-'}
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-gray-400 hidden xl:table-cell">
                        {obs.coma ? `${obs.coma}'` : '-'}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${obs.quality === 'excellent' ? 'bg-green-800 text-green-200' : obs.quality === 'good' ? 'bg-blue-800 text-blue-200' : obs.quality === 'fair' ? 'bg-yellow-800 text-yellow-200' : obs.quality === 'poor' ? 'bg-red-800 text-red-200' : 'bg-gray-800 text-gray-200'}`}>
                          {obs.quality || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Filter Key Explanation - Desktop */}
          {data?.comet?.observations && (
            <div className="mt-4 text-xs text-gray-400">
              <h4 className="font-semibold text-gray-300 mb-2">Filter Types:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <div><strong>Visual:</strong> Visual observation</div>
                <div><strong>V:</strong> Johnson V-band filter</div>
                <div><strong>CCD:</strong> Unfiltered CCD</div>
                <div><strong>R:</strong> Red filter</div>
                <div><strong>B:</strong> Blue filter</div>
                <div><strong>g:</strong> Sloan g-band (green)</div>
                <div><strong>z:</strong> Sloan z-band (near-IR)</div>
                <div><strong>K:</strong> Infrared K-band</div>
              </div>
              <div className="mt-2 space-y-2">
                <div>
                  <h4 className="font-semibold text-gray-300 mb-1">Additional Data:</h4>
                  <div className="text-xs space-y-1">
                    <div><strong>Aperture:</strong> Telescope aperture size in inches (&quot;)</div>
                    <div><strong>Coma:</strong> Visible coma size in arcminutes (&apos;)</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-300 mb-1">Quality Ratings:</h4>
                  <span className="text-green-400">Excellent</span> (&lt;0.1 mag) •{' '}
                  <span className="text-blue-400">Good</span> (&lt;0.2 mag) •{' '}
                  <span className="text-yellow-400">Fair</span> (&lt;0.4 mag) •{' '}
                  <span className="text-red-400">Poor</span> (≥0.4 mag)
                </div>
              </div>
            </div>
          )}
        </ExtensionSafeWrapper>

        {/* Recent Observations Cards - Mobile */}
        <ExtensionSafeWrapper className="md:hidden bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Recent Community Observations</h3>
          {data?.comet?.observations && (
            <div className="space-y-3">
              {data.comet.observations.slice(0, 8).map((obs) => (
                <div key={obs.id} className="bg-gray-700 rounded-lg p-4 space-y-2">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-2xl font-mono text-green-400 font-bold">
                        {obs.magnitude.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(obs.date).toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-800 text-blue-200">
                        {obs.filter || 'V'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${obs.quality === 'excellent' ? 'bg-green-800 text-green-200' : obs.quality === 'good' ? 'bg-blue-800 text-blue-200' : obs.quality === 'fair' ? 'bg-yellow-800 text-yellow-200' : obs.quality === 'poor' ? 'bg-red-800 text-red-200' : 'bg-gray-800 text-gray-200'}`}>
                        {obs.quality || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Observer Info */}
                  <div className="border-t border-gray-600 pt-2">
                    <div className="text-sm font-medium text-white">{obs.observer.name}</div>
                    <div className="text-xs text-gray-400">{obs.observer.location.name}</div>
                  </div>

                  {/* Additional Details */}
                  {(obs.aperture || obs.coma) && (
                    <div className="flex gap-4 text-xs border-t border-gray-600 pt-2">
                      {obs.aperture && (
                        <div>
                          <span className="text-gray-400">Aperture:</span>
                          <span className="ml-1 text-white">{obs.aperture}&quot;</span>
                        </div>
                      )}
                      {obs.coma && (
                        <div>
                          <span className="text-gray-400">Coma:</span>
                          <span className="ml-1 text-white">{obs.coma}&apos;</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Filter Key Explanation - Mobile */}
          {data?.comet?.observations && (
            <div className="mt-4 text-xs text-gray-400">
              <h4 className="font-semibold text-gray-300 mb-2">Filter Types:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><strong>Visual:</strong> Visual observation</div>
                <div><strong>V:</strong> Johnson V-band filter</div>
                <div><strong>CCD:</strong> Unfiltered CCD</div>
                <div><strong>R:</strong> Red filter</div>
              </div>
              <div className="mt-2">
                <h4 className="font-semibold text-gray-300 mb-1">Quality Ratings:</h4>
                <div className="space-y-1">
                  <div><span className="text-green-400">Excellent</span> (&lt;0.1 mag)</div>
                  <div><span className="text-blue-400">Good</span> (&lt;0.2 mag)</div>
                  <div><span className="text-yellow-400">Fair</span> (&lt;0.4 mag)</div>
                  <div><span className="text-red-400">Poor</span> (≥0.4 mag)</div>
                </div>
              </div>
            </div>
          )}
        </ExtensionSafeWrapper>


            {/* Data Sources & Attribution */}
            <DataSourcesSection />
          </div>
        </div>
      </ExtensionSafeWrapper>
    );
  }
