'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AppHeader from '@/components/common/AppHeader';
import PageNavigation from '@/components/common/PageNavigation';
import DataAttribution from '@/components/common/DataAttribution';
import CometComparisonCard from '@/components/comets/CometComparisonCard';
import CometComparisonTable from '@/components/comets/CometComparisonTable';
import CometStatsSummary from '@/components/comets/CometStatsSummary';
import CardSkeleton from '@/components/common/CardSkeleton';
import ExtensionSafeWrapper from '@/components/ExtensionSafeWrapper';
import ScrollHashUpdater from '@/components/common/ScrollHashUpdater';

// Dynamically import MultiCometView to avoid SSR issues with Three.js
const MultiCometView = dynamic(
  () => import('@/components/visualization/MultiCometView'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[var(--color-chart-senary)] rounded-full mb-4"></div>
          <div className="text-[var(--color-text-tertiary)]">Loading 3D Visualization...</div>
        </div>
      </div>
    )
  }
);

interface CometInfo {
  designation: string;
  name: string;
  magnitude: number;
  perihelion: {
    date: string;
    distance_au: number;
  };
  current: {
    earthDistance: number;
    sunDistance: number;
    ra: number;
    dec: number;
    position_3d?: {
      x: number;
      y: number;
      z: number;
    };
  };
  orbital: {
    eccentricity: number;
    inclination: number;
    perihelion_distance: number;
  };
  lightCurve?: Array<{
    date: string;
    magnitude: number;
  }>;
  status: string;
  color: string;
}

interface CometsData {
  comets: CometInfo[];
  featured_comet: string;
}

export default function CometsPage() {
  const [data, setData] = useState<CometsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/comets-comparison');
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.message || 'Failed to fetch comet data');
        }

        // Debug: Log comet positions
        console.log('[CometsPage] Comet data received:');
        json.data.comets.forEach((comet: CometInfo) => {
          console.log(`  ${comet.name}:`, {
            sunDistance: comet.current.sunDistance,
            earthDistance: comet.current.earthDistance
          });
        });

        setData(json.data);
      } catch (err) {
        console.error('Error fetching comets data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)]">
        {/* Automatic hash navigation */}
        <ScrollHashUpdater />

        <AppHeader />
        <PageNavigation />

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-7xl">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--color-chart-primary)] via-[var(--color-chart-secondary)] to-[var(--color-chart-tertiary)] bg-clip-text text-transparent mb-3">
              Active Comets Comparison
            </h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
              Five remarkable comets are reaching perihelion from September 2025 through January 2026.
              Compare their brightness, trajectories, and orbital characteristics. Features one true interstellar visitor,
              two near-parabolic Oort Cloud comets, one escaping, and one being captured by planets!
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-[var(--color-status-error)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="text-[var(--color-status-error)] font-semibold mb-1">Failed to Load Comet Data</div>
                  <div className="text-[var(--color-text-secondary)] text-sm">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-8">
              <CardSkeleton />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && data && (
            <>
              {/* Statistics Summary */}
              <section id="comet-statistics" className="mb-8">
                <CometStatsSummary
                  comets={data.comets.map(comet => ({
                    name: comet.name,
                    designation: comet.designation,
                    magnitude: comet.magnitude,
                    perihelion: comet.perihelion,
                    orbital: comet.orbital,
                    status: comet.status,
                    color: comet.color
                  }))}
                />
              </section>

              {/* 3D Visualization */}
              <section id="3d-visualization" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-secondary)]">
                <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-6 flex items-center gap-2">
                  <span>🌌</span> 3D Orbital Positions
                </h2>
                <div className="rounded-lg overflow-hidden border border-[var(--color-border-primary)]">
                  <MultiCometView
                    comets={data.comets.map(comet => ({
                      name: comet.name,
                      color: comet.name === '3I/ATLAS' ? '#ff6b6b' :
                             comet.name === 'SWAN' ? '#4ecdc4' :
                             comet.name === 'Lemmon' ? '#95e77e' :
                             comet.name === 'K1 ATLAS' ? '#ffd93d' :
                             comet.name === 'Wierzchos' ? '#a8e6cf' : '#dda0dd',
                      currentPosition: comet.current.position_3d || {
                        // Fallback if position_3d is not available (should not happen with updated API)
                        x: comet.current.sunDistance,
                        y: 0,
                        z: 0
                      },
                      // Note: trail is calculated from orbital elements in MultiCometView component
                      // so we don't need to pass incorrect trail data here
                      trail: undefined
                    }))}
                    showSun={true}
                    showEarth={true}
                  />
                </div>
              </section>

              {/* Comparison Grid */}
              <section id="comet-comparison" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-secondary)]">
                <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-6 flex items-center gap-2">
                  <span>☄️</span> Comet Comparison
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  {data.comets.map((comet) => (
                    <CometComparisonCard
                      key={comet.designation}
                      {...comet}
                      isInterstellar={comet.name === '3I/ATLAS'}
                      isFeatured={comet.name === '3I/ATLAS'}
                    />
                  ))}
                </div>
              </section>

              {/* Detailed Comparison Table */}
              <section id="detailed-comparison" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-secondary)]">
                <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-6 flex items-center gap-2">
                  <span>📋</span> Detailed Comparison
                </h2>
                <CometComparisonTable />
              </section>

              {/* Key Highlights */}
              <section id="key-highlights" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-secondary)]">
                <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-6 flex items-center gap-2">
                  <span>✨</span> Key Highlights
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Why This Is Special */}
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
                    Why This Fall Is Special
                  </h3>
                  <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Rare Alignment:</strong>{' '}
                        Five comets within 5 months - only 1 truly interstellar! (1 escaping Oort Cloud comet, 1 being captured)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Interstellar Visitor:</strong>{' '}
                        3I/ATLAS is only the third confirmed object from outside our solar system
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Visibility Challenge:</strong>{' '}
                        3I/ATLAS peaks at mag 11.5-12 (requires 8-10" scope + dark skies). SWAN/Lemmon are brighter (mag 5-6, binocular objects).
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Extended Window:</strong>{' '}
                        Observing opportunities from September through November 2025
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Observing Tips */}
                <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-2 border-green-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
                    Observing Tips
                  </h3>
                  <ul className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold text-lg">•</span>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Best Equipment:</strong>{' '}
                        SWAN/Lemmon: binoculars or small scope (50-100mm). 3I/ATLAS: 8-10" telescope minimum or astrophotography (too faint for visual with smaller scopes)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold text-lg">•</span>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Dark Skies:</strong>{' '}
                        Travel to Bortle 3-4 locations for best coma and tail visibility
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold text-lg">•</span>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Imaging:</strong>{' '}
                        3I/ATLAS: Coma visible visually (8-10" scope). Tail structure requires astrophotography with 50-100+ stacked 60-120 sec exposures (amateur results faint). Professional imaging needed for clear tail/jet. SWAN/Lemmon visible visually and photographically.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold text-lg">•</span>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Timing:</strong>{' '}
                        <span className="text-amber-300">⚠️ 3I/ATLAS unobservable at Oct 30 perihelion (opposite side of Sun)</span>. Best viewing: late November 2025 onwards. SWAN/Lemmon: 1-2 weeks around their perihelions.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold text-lg">•</span>
                      <span>
                        <strong className="text-[var(--color-text-primary)]">Share Data:</strong>{' '}
                        Submit observations to COBS for scientific contribution
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
              </section>

              {/* Data Attribution */}
              <DataAttribution full={true} />
            </>
          )}
        </main>
      </div>
    </ExtensionSafeWrapper>
  );
}
