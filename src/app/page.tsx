'use client';

import { useState, useEffect } from 'react';
import LightCurve from '../components/charts/LightCurve';
import BrightnessStats from '../components/stats/BrightnessStats';
import MissionStatusWidget, { MissionStatusData } from '../components/charts/MissionStatusWidget';
import ExtensionSafeWrapper from '../components/ExtensionSafeWrapper';
import DataSourcesSection from '../components/common/DataSourcesSection';
import PageNavigation from '../components/common/PageNavigation';
import AppHeader from '../components/common/AppHeader';
import { calculateActivityFromAPIData } from '../utils/activity-calculator';


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
}

export default function Home() {
  const [data, setData] = useState<CometData | null>(null);
  const [loading, setLoading] = useState(true);
  const [missionStatus, setMissionStatus] = useState<MissionStatusData | null>(null);

  // Removed real-time hooks for Chart.js demo

  // Fetch comet data
  useEffect(() => {
    // Fetch basic data
    Promise.all([
      fetch('/api/comet-data?smooth=true&predict=true&limit=200&trendDays=30'),
      fetch('/api/observations?limit=50')
    ])
      .then(([cometRes, observationsRes]) => Promise.all([cometRes.json(), observationsRes.json()]))
      .then(([cometResult]) => {
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
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-6">☄️</div>
          <div className="text-2xl font-semibold mb-2">Tracking Interstellar Visitor</div>
          <div className="text-gray-400">Synchronizing data from COBS, JPL Horizons & TheSkyLive...</div>
          <div className="mt-4">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent text-blue-400 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <AppHeader />

      {/* Navigation */}
      <PageNavigation />

      <div className="container mx-auto px-6 py-8">

        {/* Mission Control Dashboard */}
        <div className="mb-8">
          <MissionStatusWidget
            data={missionStatus || undefined}
            loading={loading}
          />
        </div>

        {/* Global Collaboration Stats */}
        {data?.stats && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4 text-cyan-400">🌍 Global Collaboration</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{data.stats.totalObservations}</div>
                <div className="text-sm text-gray-300">Total Observations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{data.stats.activeObservers}</div>
                <div className="text-sm text-gray-300">Active Observers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {(() => {
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    const recentObs = data?.comet?.observations?.filter(obs =>
                      new Date(obs.date) >= oneWeekAgo
                    )?.length || 0;
                    return recentObs;
                  })()}
                </div>
                <div className="text-sm text-gray-300">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">COBS</div>
                <div className="text-sm text-gray-300">Data Source</div>
              </div>
            </div>

            {/* Brightness Observations Graph */}
            <ExtensionSafeWrapper
              className="mt-6"
              suppressWarnings={process.env.NODE_ENV === 'production'}
            >
              {data?.comet.observations && (
                <LightCurve
                  data={data.comet.observations.map(obs => ({
                    date: obs.date,
                    magnitude: obs.magnitude,
                    filter: 'Community',
                    observer: 'Observer Network',
                    quality: 'good' as const
                  }))}
                  showSources={false}
                  showTrendLine={true}
                  showAstronomicalModel={false}
                />
              )}
            </ExtensionSafeWrapper>
          </div>
        )}

        {/* Brightness Statistics */}
        {data?.comet.observations && (
          <BrightnessStats
            data={data.comet.observations.map(obs => ({
              date: obs.date,
              magnitude: obs.magnitude,
              observer: obs.observer?.name || 'Unknown',
              quality: obs.quality || 'good' as const
            }))}
            className="mb-8"
            showTrend={true}
            realTimeUpdates={true}
            trendAnalysis={undefined}
          />
        )}


        {/* Recent Observations Table - Extension Safe */}
        <ExtensionSafeWrapper className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Recent Community Observations</h3>
          {data?.comet?.observations && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Observer</th>
                    <th className="text-left py-3 px-2">Location</th>
                    <th className="text-left py-3 px-2">Filter</th>
                    <th className="text-right py-3 px-2">Magnitude</th>
                    <th className="text-center py-3 px-2">Aperture</th>
                    <th className="text-center py-3 px-2">Coma</th>
                    <th className="text-center py-3 px-2">Quality</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comet.observations.slice(0, 8).map((obs) => (
                    <tr key={obs.id} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                      <td className="py-3 px-2 text-gray-300">
                        {new Date(obs.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 font-medium">{obs.observer.name}</td>
                      <td className="py-3 px-2 text-gray-400">{obs.observer.location.name}</td>
                      <td className="py-3 px-2 text-gray-400 text-xs">{obs.filter || 'V'}</td>
                      <td className="py-3 px-2 text-right font-mono text-lg text-green-400">
                        {obs.magnitude.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-gray-400">
                        {obs.aperture ? `${obs.aperture}"` : '-'}
                      </td>
                      <td className="py-3 px-2 text-center text-xs text-gray-400">
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

          {/* Filter Key Explanation - Always show if we have data */}
          {data?.comet?.observations && (
            <div className="mt-4 text-xs text-gray-400">
              <h4 className="font-semibold text-gray-300 mb-2">Filter Types:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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


            {/* Data Sources & Attribution */}
            <DataSourcesSection />
          </div>
        </div>
      </ExtensionSafeWrapper>
    );
  }
