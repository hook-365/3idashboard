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

        <div className="container mx-auto px-6 py-8 max-w-5xl">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-gray-900 border border-blue-500/30 rounded-2xl p-8 mb-8 shadow-xl">
            <div className="flex items-start gap-4">
              <span className="text-6xl">ℹ️</span>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  About This Dashboard
                </h1>
                <p className="text-gray-300 text-lg leading-relaxed">
                  An open-source tracking platform for interstellar comet <strong className="text-white">3I/ATLAS</strong>,
                  reaching perihelion on <span className="text-cyan-400">October 30, 2025</span>. Built to make comet observation
                  data accessible and engaging for astronomy enthusiasts worldwide.
                </p>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500/50 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-4xl">⚠️</span>
              <div>
                <h2 className="text-xl font-bold text-yellow-300 mb-2">Educational Use Only</h2>
                <p className="text-yellow-100">
                  This dashboard is for <strong>public engagement and learning</strong>. Do not use for spacecraft navigation,
                  telescope pointing, or mission-critical observations. Always verify with authoritative sources for serious research.
                </p>
              </div>
            </div>
          </div>

          {/* Two-column Layout for What Is / Isn't */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* What This Is */}
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border border-green-500/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">✅</span>
                <h2 className="text-2xl font-bold text-green-400">What This Is</h2>
              </div>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Real-time observation data from global astronomy community</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>3D orbital visualizations using NASA/JPL ephemeris</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Physics-based activity and brightness analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Educational resource for interstellar objects</span>
                </li>
              </ul>
            </div>

            {/* What This Isn't */}
            <div className="bg-gradient-to-br from-red-900/20 to-pink-900/10 border border-red-500/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⛔</span>
                <h2 className="text-2xl font-bold text-red-400">What This Isn&apos;t</h2>
              </div>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span><strong>Not mission-critical</strong> - Don&apos;t use for spacecraft or telescope pointing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span><strong>Not peer-reviewed</strong> - No formal scientific validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span><strong>Not guaranteed accurate</strong> - Always verify critical data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span><strong>Not professional-grade</strong> - Built for learning and engagement</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Data Sources */}
          <section className="bg-gradient-to-br from-cyan-900/20 to-blue-900/10 border border-cyan-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📊</span>
              <h2 className="text-2xl font-bold text-cyan-400">Data Sources & Quality</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔭</span>
                  <h3 className="text-lg font-semibold text-white">Observations</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Community brightness measurements from <a href="https://cobs.si" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">COBS</a>.
                  Quality varies by equipment and conditions. Refreshes every 5 minutes.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🛰️</span>
                  <h3 className="text-lg font-semibold text-white">Orbital Data</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Position/velocity from <a href="https://ssd.jpl.nasa.gov/horizons" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">NASA/JPL Horizons</a> and <a href="https://theskylive.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">TheSkyLive</a>.
                  Historical velocities use vis-viva calculations.
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📈</span>
                  <h3 className="text-lg font-semibold text-white">Derived Metrics</h3>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Activity and trend analysis use simplified physics models. These are approximations
                  and may differ from professional analyses.
                </p>
              </div>
            </div>
          </section>

          {/* Known Limitations */}
          <section className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 border border-orange-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚡</span>
              <h2 className="text-2xl font-bold text-orange-400">Known Limitations</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <span className="text-orange-400 mt-1 text-sm">▸</span>
                <p className="text-gray-300 text-sm">Observation quality varies by equipment and conditions</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 mt-1 text-sm">▸</span>
                <p className="text-gray-300 text-sm">Historical velocity curves use approximations</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 mt-1 text-sm">▸</span>
                <p className="text-gray-300 text-sm">Activity models use simplified physics</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 mt-1 text-sm">▸</span>
                <p className="text-gray-300 text-sm">Data refresh: 0-5 minute lag from COBS</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 mt-1 text-sm">▸</span>
                <p className="text-gray-300 text-sm">All dates display in UTC (astronomical standard)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-orange-400 mt-1 text-sm">▸</span>
                <p className="text-gray-300 text-sm">3D positions interpolated between data points</p>
              </div>
            </div>
          </section>

          {/* For Serious Use */}
          <section className="bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border border-purple-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔬</span>
              <h2 className="text-2xl font-bold text-purple-400">For Serious Research</h2>
            </div>
            <p className="text-gray-300 mb-6">
              Need publication-quality data or mission-critical accuracy? Use these authoritative sources:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <a href="https://cobs.si" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800/50 hover:bg-gray-800/70 border border-purple-500/20 hover:border-purple-500/40 rounded-lg p-4 transition-all group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🌟</span>
                  <div>
                    <h3 className="text-cyan-400 group-hover:text-cyan-300 font-semibold mb-1">COBS</h3>
                    <p className="text-gray-400 text-sm">Raw observation data with observer metadata</p>
                  </div>
                </div>
              </a>

              <a href="https://ssd.jpl.nasa.gov/horizons" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800/50 hover:bg-gray-800/70 border border-purple-500/20 hover:border-purple-500/40 rounded-lg p-4 transition-all group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🛸</span>
                  <div>
                    <h3 className="text-cyan-400 group-hover:text-cyan-300 font-semibold mb-1">JPL Horizons</h3>
                    <p className="text-gray-400 text-sm">Precise ephemeris and orbital elements</p>
                  </div>
                </div>
              </a>

              <a href="https://minorplanetcenter.net" target="_blank" rel="noopener noreferrer"
                 className="bg-gray-800/50 hover:bg-gray-800/70 border border-purple-500/20 hover:border-purple-500/40 rounded-lg p-4 transition-all group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🌍</span>
                  <div>
                    <h3 className="text-cyan-400 group-hover:text-cyan-300 font-semibold mb-1">Minor Planet Center</h3>
                    <p className="text-gray-400 text-sm">Official IAU designations and orbital data</p>
                  </div>
                </div>
              </a>
            </div>
          </section>

          {/* Attribution & License */}
          <section className="bg-gradient-to-br from-blue-900/20 to-indigo-900/10 border border-blue-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">⚖️</span>
              <h2 className="text-2xl font-bold text-blue-400">Licensing & Attribution</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-2 py-1 bg-green-600/20 text-green-400 rounded text-xs font-mono border border-green-500/30">MIT</span>
                  <h3 className="text-white font-semibold">Dashboard Code</h3>
                </div>
                <p className="text-gray-300 text-sm mb-3">
                  Free to use and modify. Attribution appreciated.
                </p>
                <a href="https://github.com/hook-365/3idashboard" target="_blank" rel="noopener noreferrer"
                   className="text-cyan-400 hover:text-cyan-300 text-sm underline">
                  View on GitHub →
                </a>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-xs font-mono border border-yellow-500/30">CC BY-NC-SA</span>
                  <h3 className="text-white font-semibold">COBS Data</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  Non-commercial use only. Attribution: &quot;Data courtesy of COBS&quot;
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs font-mono border border-blue-500/30">PUBLIC</span>
                  <h3 className="text-white font-semibold">NASA/JPL Data</h3>
                </div>
                <p className="text-gray-300 text-sm">
                  Public domain with no restrictions on use
                </p>
              </div>
            </div>
          </section>

          {/* Footer Note */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-8 text-center shadow-lg">
            <span className="text-4xl mb-4 block">🚀</span>
            <p className="text-white text-xl font-bold mb-3">
              Built by enthusiasts, for enthusiasts
            </p>
            <p className="text-gray-400 mb-6">
              Questions, issues, or want to contribute?
            </p>
            <a href="https://github.com/hook-365/3idashboard" target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500
                          text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-cyan-500/20">
              <span>Visit GitHub Repository</span>
              <span>→</span>
            </a>
            <p className="text-gray-600 mt-6 text-sm">
              Dashboard updated September 30, 2025
            </p>
          </div>
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}
