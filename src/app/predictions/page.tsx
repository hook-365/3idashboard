'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import PageNavigation from '@/components/common/PageNavigation';
import AppHeader from '@/components/common/AppHeader';
import DataAttribution from '@/components/common/DataAttribution';
import { VisualizationErrorBoundary } from '@/components/common/ErrorBoundary';
import { VisualizationSkeleton } from '@/components/common/CardSkeleton';
import ChartSkeleton from '@/components/common/ChartSkeleton';
import ScrollHashUpdater from '@/components/common/ScrollHashUpdater';

// Dynamically import 3D prediction visualization
const PredictionAccuracyViz = dynamic(() => import('@/components/visualization/PredictionAccuracyViz'), {
  loading: () => (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 h-[700px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent text-[var(--color-chart-senary)] rounded-full mb-4"></div>
        <div className="text-[var(--color-text-tertiary)]">Loading Prediction Visualization...</div>
      </div>
    </div>
  ),
  ssr: false,
});

interface PredictionEpoch {
  epoch_date: string;
  source: string;
  days_old: number;
  trail: Array<{
    date: string;
    x: number;
    y: number;
    z: number;
    distance_from_sun: number;
  }>;
  current: {
    x: number;
    y: number;
    z: number;
    distance_from_sun: number;
  };
}

interface PredictionEpochsData {
  epochs: PredictionEpoch[];
  metadata: {
    numEpochs: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export default function PredictionsPage() {
  const [epochsData, setEpochsData] = useState<PredictionEpochsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEpochs() {
      try {
        const response = await fetch('/api/prediction-epochs?days=400');
        const result = await response.json();

        if (result.success) {
          setEpochsData(result.data);
        } else {
          setError(result.error || 'Failed to load prediction epochs');
        }
      } catch (err) {
        setError('Failed to fetch prediction data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchEpochs();
  }, []);

  return (
    <ExtensionSafeWrapper>
      <main className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        {/* Automatic hash navigation */}
        <ScrollHashUpdater />

        <AppHeader />
        <PageNavigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--color-chart-primary)] via-[var(--color-chart-secondary)] to-[var(--color-chart-tertiary)] bg-clip-text text-transparent mb-3">
              Trajectory Predictions & Anomaly Detection
            </h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
              Track predicted vs actual trajectory to detect any course changes. If 3I/ATLAS is an intelligent craft, it may alter course behind the Sun when unobservable from Earth.
            </p>
          </div>

          {/* Critical Observation Window */}
          <section id="critical-window" className="mb-8 bg-yellow-500/10 border-2 border-yellow-500/30 p-6 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[var(--color-status-warning)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-semibold text-[var(--color-status-warning)] mb-1">Critical Observation Window: November 20-25, 2025</div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                  The comet will be unobservable from Earth during perihelion (Oct 30). When it re-emerges around November 20-25, comparing its actual trajectory to predictions will reveal any course changes made behind the Sun.
                </div>
              </div>
            </div>
          </section>

          {/* Understanding Orbital Refinement */}
          <section id="orbital-refinement" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-primary)]">
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-4 flex items-center gap-2">
              <span>📊</span> Understanding Orbital Refinement
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-4">
              When a comet is first discovered, initial orbital elements are calculated from limited observations.
              As more observations are collected over time, astronomers refine these elements, leading to increasingly
              accurate trajectory predictions.
            </p>
            <ul className="space-y-2 text-[var(--color-text-secondary)]">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">🔴</span>
                <span><strong>Early predictions</strong> (July 2025): Based on fewer observations, higher uncertainty</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">🟠</span>
                <span><strong>Mid predictions</strong> (September 2025): More data, better accuracy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">🟢</span>
                <span><strong>Latest predictions</strong> (October 2025): Maximum observations, highest precision</span>
              </li>
            </ul>
          </section>

          {/* Multi-Epoch Trajectory Comparison */}
          <section id="trajectory-comparison" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-primary)]">
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-6 flex items-center gap-2">
              <span>🛸</span> Multi-Epoch Trajectory Comparison
            </h2>
            <VisualizationErrorBoundary>
              {loading ? (
                <VisualizationSkeleton />
              ) : error ? (
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-8 text-center">
                  <p className="text-red-500 mb-2">Error loading prediction visualization</p>
                  <p className="text-[var(--color-text-tertiary)] text-sm">{error}</p>
                </div>
              ) : epochsData ? (
                <PredictionAccuracyViz epochsData={epochsData} />
              ) : null}
            </VisualizationErrorBoundary>
          </section>

          {/* What to Watch For */}
          <section id="anomaly-detection" className="mb-8 bg-red-500/10 border-2 border-red-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[var(--color-status-error)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-semibold text-[var(--color-status-error)] mb-2 text-lg">Anomaly Detection Criteria</div>
                <div className="text-sm text-[var(--color-text-secondary)] space-y-2">
                  <p><strong className="text-[var(--color-text-primary)]">If 3I/ATLAS changes course, we would observe:</strong></p>
                  <ul className="space-y-1 ml-4">
                    <li>• <strong>Trajectory deviation:</strong> Actual position differs from predicted orbital path by more than observational uncertainty (~0.1-0.5 arcseconds)</li>
                    <li>• <strong>Velocity change:</strong> Speed or direction changes inconsistent with gravitational forces alone</li>
                    <li>• <strong>Timing:</strong> Deviations appearing after perihelion passage when the object was unobservable</li>
                    <li>• <strong>Non-gravitational acceleration:</strong> Delta-V not explainable by cometary outgassing or solar radiation pressure</li>
                  </ul>
                  <p className="mt-3 text-xs text-[var(--color-text-tertiary)] italic">
                    Note: Natural comets can exhibit non-gravitational forces from outgassing. Any anomaly would require ruling out natural explanations before suggesting artificial propulsion.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Prediction Epoch Statistics */}
          {epochsData && (
            <section id="epoch-statistics" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-primary)]">
              <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-6 flex items-center gap-2">
                <span>📈</span> Prediction Epoch Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {epochsData.epochs.map((epoch, idx) => (
                  <div
                    key={epoch.epoch_date}
                    className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 border-2 border-[var(--color-border-secondary)]"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{
                          backgroundColor: idx === 0 ? '#ff4444' : idx === 1 ? '#ffaa00' : '#00ff88'
                        }}
                      />
                      <h3 className="font-semibold">{epoch.epoch_date}</h3>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-2">{epoch.source}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-tertiary)]">Days old:</span>
                        <span className="font-mono">{epoch.days_old}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-tertiary)]">Trail points:</span>
                        <span className="font-mono">{epoch.trail.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-tertiary)]">Distance:</span>
                        <span className="font-mono">{epoch.current.distance_from_sun.toFixed(3)} AU</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Technical Details */}
          <section id="technical-details" className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-primary)]">
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)] mb-4 flex items-center gap-2">
              <span>⚙️</span> Technical Details
            </h2>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <p>
                <strong className="text-[var(--color-text-primary)]">Prediction Method:</strong> Each epoch uses Kepler orbital mechanics
                with the orbital elements (e, q, i, ω, Ω) determined from observations available at that time.
              </p>
              <p>
                <strong className="text-[var(--color-text-primary)]">Data Sources:</strong> Orbital elements from Minor Planet Center (MPC)
                Electronic Circulars and JPL Small-Body Database.
              </p>
              <p>
                <strong className="text-[var(--color-text-primary)]">Coordinate System:</strong> Heliocentric ecliptic J2000 coordinates,
                with positions calculated every 2 days over a 60-day window.
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-4">
                Note: September and October predictions shown here are estimated/simulated for educational purposes.
                Actual updated orbital elements would come from official MPC and JPL publications as more observations are processed.
              </p>
            </div>
          </section>

          {/* Data Attribution Footer */}
          <DataAttribution full={true} />
        </div>
      </main>
    </ExtensionSafeWrapper>
  );
}
