'use client';

import React from 'react';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import PageNavigation from '../../components/common/PageNavigation';
import AppHeader from '../../components/common/AppHeader';

export default function AboutPage() {
  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Warning Banner */}
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-yellow-400 mb-3">⚠️ Important Disclaimer</h2>
            <p className="text-yellow-200 text-lg">
              This is an <strong>educational dashboard</strong> for public engagement with astronomy.
              Do not use for spacecraft navigation, telescope pointing, or time-sensitive observations.
              Always verify with authoritative sources for serious use.
            </p>
          </div>

          {/* What This Is */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">What This Is</h2>
            <p className="text-gray-300 mb-3">
              An open-source tracking dashboard for interstellar comet 3I/ATLAS, reaching perihelion on October 30, 2025.
              Built to make comet observation data accessible and engaging for astronomy enthusiasts worldwide.
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Real-time observation data from global amateur and professional astronomers</li>
              <li>Orbital mechanics visualizations using NASA/JPL ephemeris data</li>
              <li>Physics-based activity analysis and brightness trend tracking</li>
              <li>Educational resource for understanding interstellar objects</li>
            </ul>
          </section>

          {/* What This Isn't */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">What This Isn't</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li><strong>Not mission-critical infrastructure</strong> - Don't use for spacecraft navigation or time-sensitive telescope pointing</li>
              <li><strong>Not peer-reviewed</strong> - Calculations and interpretations haven't undergone formal scientific review</li>
              <li><strong>Not guaranteed accurate</strong> - Data processing may contain errors; always verify with authoritative sources</li>
              <li><strong>Not professional-grade</strong> - Built by enthusiasts for learning and public engagement</li>
            </ul>
          </section>

          {/* Data Sources */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-green-400 mb-4">Data Sources & Accuracy</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Observation Data</h3>
                <p className="text-gray-300">
                  Community-contributed brightness measurements from <a href="https://cobs.si" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">COBS (Comet Observation Database)</a>.
                  Quality varies by equipment, atmospheric conditions, and observer experience. Data refreshes every 5 minutes.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Orbital Mechanics</h3>
                <p className="text-gray-300">
                  Position and velocity data from <a href="https://ssd.jpl.nasa.gov/horizons" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">NASA/JPL Horizons</a> (authoritative ephemeris)
                  and <a href="https://theskylive.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">TheSkyLive</a> for real-time coordinates.
                  Some historical orbital velocities are calculated using the vis-viva equation.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Derived Metrics</h3>
                <p className="text-gray-300">
                  Activity levels, velocity changes, and trend analysis are our interpretations of the underlying physics.
                  These calculations use simplified models and may differ from other analyses. Treat as approximations, not ground truth.
                </p>
              </div>
            </div>
          </section>

          {/* Known Limitations */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-orange-400 mb-4">Known Limitations</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li>Observer-contributed data has varying quality (equipment, conditions, measurement techniques)</li>
              <li>Historical orbital velocity curves are approximations based on vis-viva calculations</li>
              <li>Activity level calculations assume simplified physics models (brightness vs. heliocentric distance)</li>
              <li>Data refresh lag: 0-5 minutes behind latest COBS submissions</li>
              <li>Timezone parsing corrected 2025-09-30; all dates now display in UTC per astronomical convention</li>
              <li>3D visualization positions are interpolated between ephemeris data points</li>
            </ul>
          </section>

          {/* For Serious Use */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">For Serious Research</h2>
            <p className="text-gray-300 mb-3">
              If you need publication-quality data or mission-critical accuracy, use these authoritative sources:
            </p>
            <ul className="space-y-2">
              <li>
                <a href="https://cobs.si" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold">
                  COBS
                </a>
                <span className="text-gray-400"> - Raw observation data with observer metadata</span>
              </li>
              <li>
                <a href="https://ssd.jpl.nasa.gov/horizons" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold">
                  JPL Horizons
                </a>
                <span className="text-gray-400"> - Precise ephemeris and orbital elements</span>
              </li>
              <li>
                <a href="https://minorplanetcenter.net" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold">
                  Minor Planet Center
                </a>
                <span className="text-gray-400"> - Official IAU designations and orbital data</span>
              </li>
              <li>
                <a href="https://www.ta3.sk/cobs/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold">
                  COBS Scientific Analysis
                </a>
                <span className="text-gray-400"> - Professional comet photometry analysis</span>
              </li>
            </ul>
          </section>

          {/* Attribution & License */}
          <section className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Attribution & License</h2>

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Dashboard Code</h3>
                <p className="text-gray-300">
                  MIT License - Use freely, modification permitted, attribution appreciated.
                  Source: <a href="https://github.com/hook-365/3idashboard" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">github.com/hook-365/3idashboard</a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-1">COBS Data</h3>
                <p className="text-gray-300">
                  <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">CC BY-NC-SA 4.0</a> -
                  Non-commercial use only, attribution required: "Data courtesy of COBS (Comet Observation Database)"
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-1">NASA/JPL Data</h3>
                <p className="text-gray-300">
                  Public domain - No restrictions on use
                </p>
              </div>
            </div>
          </section>

          {/* Footer Note */}
          <div className="bg-gray-700 rounded-lg p-6 text-center">
            <p className="text-gray-300 text-lg">
              <strong>Built by enthusiasts, for enthusiasts.</strong>
            </p>
            <p className="text-gray-400 mt-2">
              Questions, issues, or contributions? Visit the <a href="https://github.com/hook-365/3idashboard" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">GitHub repository</a>.
            </p>
            <p className="text-gray-500 mt-4 text-sm">
              Last updated: September 30, 2025
            </p>
          </div>
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}
