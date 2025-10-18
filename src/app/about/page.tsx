'use client';

import React from 'react';
import ExtensionSafeWrapper from '../../components/ExtensionSafeWrapper';
import PageNavigation from '../../components/common/PageNavigation';
import AppHeader from '../../components/common/AppHeader';
import { DataSourceAttribution, InlineCitation, CitationList } from '../../components/common/Citation';
import DataAttribution from '../../components/common/DataAttribution';
import ScrollHashUpdater from '../../components/common/ScrollHashUpdater';

export default function AboutPage() {
  return (
    <ExtensionSafeWrapper>
      <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        {/* Automatic hash navigation */}
        <ScrollHashUpdater />

        {/* Header */}
        <AppHeader />

        {/* Navigation */}
        <PageNavigation />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--color-chart-primary)] via-[var(--color-chart-secondary)] to-[var(--color-chart-tertiary)] bg-clip-text text-transparent mb-3">
              About & Citations
            </h1>
            <p className="text-xl text-[var(--color-text-secondary)] max-w-3xl mx-auto">
              Data sources, scientific references, disclaimers, and how to contribute to the global observation network.
            </p>
          </div>

          {/* Hero Section */}
          <section id="about-dashboard" className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-2xl p-8 mb-8 shadow-lg">
            <div className="flex items-start gap-4">
              <span className="text-6xl">ℹ️</span>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3 text-[var(--color-text-primary)]">
                  About This Dashboard
                </h1>
                <p className="text-[var(--color-text-secondary)] text-lg leading-relaxed">
                  This dashboard gathers and compiles observation data for 3I/ATLAS from multiple sources, making complex astronomical data accessible and interpretable for everyone. Whether you&apos;re a professional astronomer or simply curious about this interstellar visitor, you&apos;ll find real-time data and visualizations here.
                </p>
              </div>
            </div>
          </section>

          {/* Data Sources Section */}
          <section id="data-sources" className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🔗</span>
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Data Sources</h2>
            </div>

            <div className="space-y-6">
              {/* Active Sources */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-status-success)] mb-4 flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  Currently Active
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 border border-[var(--color-border-secondary)]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🔭</span>
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)]">COBS</h4>
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-3">
                      Real-time observations from amateur astronomers worldwide. Updated every 5 minutes with brightness measurements, coma diameter, and tail length data.
                    </p>
                    <a href="https://cobs.si" target="_blank" rel="noopener noreferrer" className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 text-sm underline">
                      Visit COBS →
                    </a>
                  </div>

                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 border border-[var(--color-border-secondary)]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🛰️</span>
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)]">NASA/JPL Horizons</h4>
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-3">
                      Precise orbital mechanics and ephemeris data. Powers the 3D orbital visualization and position calculations throughout the dashboard.
                    </p>
                    <a href="https://ssd.jpl.nasa.gov/horizons" target="_blank" rel="noopener noreferrer" className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 text-sm underline">
                      Visit Horizons →
                    </a>
                  </div>

                  <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 border border-[var(--color-border-secondary)]">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">📍</span>
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)]">TheSkyLive</h4>
                    </div>
                    <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-3">
                      Real-time coordinates and position data. Provides current sky location and visibility information for observers worldwide.
                    </p>
                    <a href="https://theskylive.com" target="_blank" rel="noopener noreferrer" className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 text-sm underline">
                      Visit TheSkyLive →
                    </a>
                  </div>
                </div>
              </div>

              {/* Planned Sources */}
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-status-warning)] mb-4 flex items-center gap-2">
                  <span className="text-xl">⏳</span>
                  Planned (API Ready, Data Pending)
                </h3>
                <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 border border-[var(--color-border-secondary)]">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🌍</span>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Minor Planet Center (MPC)</h4>
                      <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-2">
                        The International Astronomical Union&apos;s official clearinghouse for observations of comets and minor planets. Our API integration is complete, but no data for 3I/ATLAS is currently available in their database.
                      </p>
                      <a href="https://minorplanetcenter.net" target="_blank" rel="noopener noreferrer" className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 text-sm underline">
                        Visit MPC →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Warning Banner */}
          <section id="disclaimer" className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500/50 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-4xl">⚠️</span>
              <div>
                <h2 className="text-xl font-bold text-[var(--color-status-warning)] mb-2">Educational Use Only</h2>
                <p className="text-[var(--color-text-secondary)]">
                  This dashboard is for <strong>public engagement and learning</strong>. Do not use for spacecraft navigation,
                  telescope pointing, or mission-critical observations. Always verify with authoritative sources for serious research.
                </p>
              </div>
            </div>
          </section>

          {/* Two-column Layout for What Is / Isn't */}
          <section id="what-this-is" className="grid md:grid-cols-2 gap-6 mb-8">
            {/* What This Is */}
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/10 border border-green-500/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">✅</span>
                <h2 className="text-2xl font-bold text-[var(--color-status-success)]">What This Is</h2>
              </div>
              <ul className="space-y-3 text-[var(--color-text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-status-success)] mt-1">•</span>
                  <span>Real-time observation data from global astronomy community</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-status-success)] mt-1">•</span>
                  <span>3D orbital visualizations using NASA/JPL ephemeris</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-status-success)] mt-1">•</span>
                  <span>Physics-based activity and brightness analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-status-success)] mt-1">•</span>
                  <span>Educational resource for interstellar objects</span>
                </li>
              </ul>
            </div>

            {/* What This Isn't */}
            <div className="bg-gradient-to-br from-red-900/20 to-pink-900/10 border border-red-500/30 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">⛔</span>
                <h2 className="text-2xl font-bold text-[var(--color-status-error)]">What This Isn&apos;t</h2>
              </div>
              <ul className="space-y-3 text-[var(--color-text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-status-error)] mt-1">•</span>
                  <span><strong>Not mission-critical</strong> - Don&apos;t use for spacecraft or telescope pointing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-status-error)] mt-1">•</span>
                  <span><strong>Not peer-reviewed</strong> - No formal scientific validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-status-error)] mt-1">•</span>
                  <span><strong>Not guaranteed accurate</strong> - Always verify critical data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-status-error)] mt-1">•</span>
                  <span><strong>Not professional-grade</strong> - Built for learning and engagement</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Data Sources */}
          <section id="data-quality" className="bg-gradient-to-br from-cyan-900/20 to-blue-900/10 border border-cyan-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📊</span>
              <h2 className="text-2xl font-bold text-[var(--color-chart-senary)]">Data Sources & Quality</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🔭</span>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Observations</h3>
                </div>
                <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  Community brightness measurements from <DataSourceAttribution id="cobs" showLicense={false} />.
                  Quality varies by equipment and conditions. Refreshes every 5 minutes.
                </div>
              </div>

              <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🛰️</span>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Orbital Data</h3>
                </div>
                <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  Position/velocity from <DataSourceAttribution id="jpl-horizons" showLicense={false} /> and <DataSourceAttribution id="theskylive" showLicense={false} />.
                  Historical velocities use vis-viva calculations.
                </div>
              </div>

              <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📈</span>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Derived Metrics</h3>
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  Activity and trend analysis use simplified physics models. These are approximations
                  and may differ from professional analyses.
                </p>
              </div>
            </div>
          </section>

          {/* Known Limitations */}
          <section id="limitations" className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 border border-orange-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚡</span>
              <h2 className="text-2xl font-bold text-[var(--color-status-warning)]">Known Limitations</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-status-warning)] mt-1 text-sm">▸</span>
                <p className="text-[var(--color-text-secondary)] text-sm">Observation quality varies by equipment and conditions</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-status-warning)] mt-1 text-sm">▸</span>
                <p className="text-[var(--color-text-secondary)] text-sm">Historical velocity curves use approximations</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-status-warning)] mt-1 text-sm">▸</span>
                <p className="text-[var(--color-text-secondary)] text-sm">Activity models use simplified physics</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-status-warning)] mt-1 text-sm">▸</span>
                <p className="text-[var(--color-text-secondary)] text-sm">Data refresh: 0-5 minute lag from COBS</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-status-warning)] mt-1 text-sm">▸</span>
                <p className="text-[var(--color-text-secondary)] text-sm">All dates display in UTC (astronomical standard)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-status-warning)] mt-1 text-sm">▸</span>
                <p className="text-[var(--color-text-secondary)] text-sm">3D positions interpolated between data points</p>
              </div>
            </div>
          </section>

          {/* For Serious Use */}
          <section id="serious-research" className="bg-gradient-to-br from-purple-900/20 to-indigo-900/10 border border-purple-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔬</span>
              <h2 className="text-2xl font-bold text-[var(--color-chart-quaternary)]">For Serious Research</h2>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Need publication-quality data or mission-critical accuracy? Use these authoritative sources:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <a href="https://cobs.si" target="_blank" rel="noopener noreferrer"
                 className="bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)]/70 border border-purple-500/20 hover:border-purple-500/40 rounded-lg p-4 transition-all group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🌟</span>
                  <div>
                    <h3 className="text-[var(--color-chart-senary)] group-hover:text-[var(--color-chart-senary)]/80 font-semibold mb-1">COBS</h3>
                    <p className="text-[var(--color-text-tertiary)] text-sm">Raw observation data with observer metadata</p>
                  </div>
                </div>
              </a>

              <a href="https://ssd.jpl.nasa.gov/horizons" target="_blank" rel="noopener noreferrer"
                 className="bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)]/70 border border-purple-500/20 hover:border-purple-500/40 rounded-lg p-4 transition-all group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🛸</span>
                  <div>
                    <h3 className="text-[var(--color-chart-senary)] group-hover:text-[var(--color-chart-senary)]/80 font-semibold mb-1">JPL Horizons</h3>
                    <p className="text-[var(--color-text-tertiary)] text-sm">Precise ephemeris and orbital elements</p>
                  </div>
                </div>
              </a>

              <a href="https://minorplanetcenter.net" target="_blank" rel="noopener noreferrer"
                 className="bg-[var(--color-bg-secondary)]/50 hover:bg-[var(--color-bg-secondary)]/70 border border-purple-500/20 hover:border-purple-500/40 rounded-lg p-4 transition-all group">
                <div className="flex items-start gap-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform">🌍</span>
                  <div>
                    <h3 className="text-[var(--color-chart-senary)] group-hover:text-[var(--color-chart-senary)]/80 font-semibold mb-1">Minor Planet Center</h3>
                    <p className="text-[var(--color-text-tertiary)] text-sm">Official IAU designations and orbital data</p>
                  </div>
                </div>
              </a>
            </div>
          </section>

          {/* Scientific References - Avi Loeb Research */}
          <section id="citations" className="bg-gradient-to-br from-purple-900/20 to-blue-900/10 border border-purple-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📚</span>
              <h2 className="text-2xl font-bold text-[var(--color-chart-senary)]">Scientific References - 3I/ATLAS Research</h2>
            </div>

            <div className="mb-4 text-sm text-[var(--color-text-secondary)]">
              <p>
                The observational data and scientific findings presented on this dashboard are based on professional research
                from Avi Loeb and collaborators (2025). These observations required professional-grade telescopes and extensive
                imaging to reveal the faint sunward jet and unique chemical composition of 3I/ATLAS.
              </p>
            </div>

            <CitationList
              ids={[
                'atlas-ttt3-sunward-jet',
                'atlas-keck-nickel-cyanide',
                'atlas-vlt-uves-ni-fe',
                'atlas-orbital-inclination'
              ]}
              style="blocks"
              title="Key Research Papers & Articles"
            />

            <div className="mt-6 pt-6 border-t border-[var(--color-border-secondary)] text-sm text-[var(--color-text-tertiary)]">
              <p>
                <strong className="text-[var(--color-text-secondary)]">Note:</strong> These citations demonstrate that tail/jet structure
                visibility requires professional equipment (2m+ telescopes, 150+ stacked exposures). Amateur astrophotography may reveal
                faint hints but will not achieve the clarity shown in professional imaging.
              </p>
            </div>
          </section>

          {/* Attribution & License */}
          <section id="license" className="bg-gradient-to-br from-blue-900/20 to-indigo-900/10 border border-blue-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">⚖️</span>
              <h2 className="text-2xl font-bold text-[var(--color-status-info)]">Licensing & Attribution</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-2 py-1 bg-[var(--color-status-success)]/20 text-[var(--color-status-success)] rounded text-xs font-mono border border-[var(--color-status-success)]/30">MIT</span>
                  <h3 className="text-[var(--color-text-primary)] font-semibold">Dashboard Code</h3>
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm mb-3">
                  Free to use and modify. Attribution appreciated.
                </p>
                <a href="https://github.com/hook-365/3idashboard" target="_blank" rel="noopener noreferrer"
                   className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 text-sm underline">
                  View on GitHub →
                </a>
              </div>

              <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-2 py-1 bg-[var(--color-status-warning)]/20 text-[var(--color-status-warning)] rounded text-xs font-mono border border-[var(--color-status-warning)]/30">CC BY-NC-SA</span>
                  <h3 className="text-[var(--color-text-primary)] font-semibold">COBS Data</h3>
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  Non-commercial use only. Attribution: &quot;Data courtesy of COBS&quot;
                </p>
              </div>

              <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-block px-2 py-1 bg-[var(--color-chart-primary)]/20 text-[var(--color-chart-primary)] rounded text-xs font-mono border border-[var(--color-chart-primary)]/30">PUBLIC</span>
                  <h3 className="text-[var(--color-text-primary)] font-semibold">NASA/JPL Data</h3>
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  Public domain with no restrictions on use
                </p>
              </div>
            </div>
          </section>

          {/* Join the Observer Network - Call to Action */}
          <section id="join-network" className="bg-gradient-to-br from-emerald-900/30 to-green-900/20 border-2 border-emerald-500/50 rounded-xl p-8 mb-8 shadow-lg">
            <div className="text-center mb-6">
              <span className="text-5xl mb-4 block">🔭</span>
              <h2 className="text-3xl font-bold text-[var(--color-status-success)] mb-3">Join the Global Observer Network</h2>
              <p className="text-[var(--color-text-secondary)] text-lg mb-6">
                Your observations matter! Amateur astronomers around the world contribute vital data to track comets like 3I/ATLAS.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[var(--color-bg-secondary)]/70 rounded-lg p-6 border border-emerald-500/30">
                <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                  <span>📝</span> How to Submit Observations
                </h3>
                <ol className="space-y-3 text-[var(--color-text-secondary)] text-sm">
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-status-success)]/20 text-[var(--color-status-success)] font-bold text-xs flex-shrink-0">1</span>
                    <span><strong>Observe 3I/ATLAS</strong> using an 8-10 inch (200-254mm) telescope minimum. ⚠️ NOT visible with binoculars - too faint at mag 12!</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-status-success)]/20 text-[var(--color-status-success)] font-bold text-xs flex-shrink-0">2</span>
                    <span><strong>Estimate brightness</strong> by comparing to nearby stars of known magnitude</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-status-success)]/20 text-[var(--color-status-success)] font-bold text-xs flex-shrink-0">3</span>
                    <span><strong>Submit to COBS</strong> at <a href="https://cobs.si" target="_blank" rel="noopener noreferrer" className="text-[var(--color-chart-senary)] hover:underline">cobs.si</a> with date, time (UTC), magnitude, and equipment details</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-status-success)]/20 text-[var(--color-status-success)] font-bold text-xs flex-shrink-0">4</span>
                    <span><strong>See your data appear</strong> on this dashboard within 5 minutes!</span>
                  </li>
                </ol>
              </div>

              <div className="bg-[var(--color-bg-secondary)]/70 rounded-lg p-6 border border-emerald-500/30">
                <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                  <span>🎯</span> What You Need
                </h3>
                <div className="space-y-4 text-[var(--color-text-secondary)] text-sm">
                  <div>
                    <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Equipment for 3I/ATLAS (mag 12):</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• ✓ 8-10 inch (200-254mm) telescope (MINIMUM for visual coma observation)</li>
                      <li>• ✓ 12+ inch (300mm+) telescope (recommended for visual)</li>
                      <li>• ✓ Astrophotography (60-120 sec exposures, 50-100+ frames stacked for faint tail hints)</li>
                      <li>• ⚠️ Tail structure requires professional equipment (2m+ telescope, 150+ stacked frames)</li>
                      <li>• ✗ Binoculars - too faint</li>
                      <li>• ✗ Small scopes (under 200mm) - too faint</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--color-text-primary)] mb-2">Skills needed:</h4>
                    <ul className="space-y-1 ml-4">
                      <li>• Ability to find objects in the sky</li>
                      <li>• Basic magnitude estimation (can be learned!)</li>
                      <li>• Patience and clear skies</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <a href="https://cobs.si" target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 bg-[var(--color-status-success)] hover:bg-[var(--color-status-success)]/80
                            text-white px-8 py-4 rounded-lg font-bold text-lg transition-all shadow-lg">
                <span>Start Contributing to COBS</span>
                <span>→</span>
              </a>
              <p className="text-[var(--color-text-tertiary)] mt-4 text-sm">
                Free registration • No professional equipment required • Help science!
              </p>
            </div>
          </section>

          {/* Visual Appearance & Astrophotography Section */}
          <section id="astrophotography" className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border border-violet-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">📷</span>
              <h2 className="text-2xl font-bold text-[var(--color-chart-quaternary)]">Visual Appearance & Astrophotography</h2>
            </div>

            {/* What Does It Look Like? */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <span>👁️</span> What Does It Look Like?
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-5 border border-violet-500/20">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Visual Appearance (Through Eyepiece)</h4>
                  <ul className="space-y-2 text-[var(--color-text-secondary)] text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-quaternary)] mt-0.5">▸</span>
                      <span><strong>Color:</strong> Faint greenish tint in coma (from C2 gas emission), but most observers will see gray due to low light levels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-quaternary)] mt-0.5">▸</span>
                      <span><strong>Coma:</strong> Fuzzy, diffuse cloud surrounding central condensation. Appears round or slightly elongated</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-quaternary)] mt-0.5">▸</span>
                      <span><strong>Nucleus:</strong> False nucleus (bright central region) may be visible in larger telescopes. True nucleus too small to resolve</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-quaternary)] mt-0.5">▸</span>
                      <span><strong>Tail:</strong> Gas tail (blue-green) points away from Sun. Dust tail (white/yellow) follows orbit. Both visible in <strong>photography only</strong> (requires long exposures and stacking). NOT visible through eyepiece even with large amateur telescopes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-quaternary)] mt-0.5">▸</span>
                      <span><strong>Angular Size:</strong> Coma typically 2-10 arcminutes (compare: full Moon is 30 arcminutes). Tail can extend 1-5 degrees</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-5 border border-violet-500/20">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Size Comparison</h4>
                  <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-secondary)]">
                      <span>Moon (full disk)</span>
                      <span className="font-mono font-bold text-[var(--color-chart-primary)]">~30&apos;</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-secondary)]">
                      <span>Jupiter disk</span>
                      <span className="font-mono font-bold text-[var(--color-chart-secondary)]">~45&quot;</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-secondary)]">
                      <span>3I/ATLAS coma (typical)</span>
                      <span className="font-mono font-bold text-[var(--color-chart-tertiary)]">2-10&apos;</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded border border-[var(--color-border-secondary)]">
                      <span>3I/ATLAS tail (est.)</span>
                      <span className="font-mono font-bold text-[var(--color-chart-quaternary)]">1-5°</span>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-[var(--color-bg-tertiary)]/50 rounded border border-[var(--color-border-secondary)]">
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      <strong>Note:</strong> 1° = 60 arcminutes (&apos;), 1 arcminute = 60 arcseconds (&quot;). The Moon&apos;s width is about 0.5° or 30&apos;.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Photography Guide */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <span>📸</span> Astrophotography Guide
              </h3>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {/* Camera Settings */}
                <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-5 border border-violet-500/20">
                  <h4 className="font-semibold text-[var(--color-chart-primary)] mb-3 flex items-center gap-2">
                    <span>⚙️</span> Camera Settings
                  </h4>
                  <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)] mb-1">DSLR/Mirrorless:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• <strong>ISO:</strong> 1600-3200</li>
                        <li>• <strong>Aperture:</strong> f/2.8-f/4 (wide open)</li>
                        <li>• <strong>Exposure:</strong> 30-60 sec (tracked)</li>
                        <li>• <strong>Exposure:</strong> 3-5 sec (untracked)</li>
                        <li>• <strong>Format:</strong> RAW (not JPEG)</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)] mb-1">CCD/CMOS Camera:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• <strong>Gain:</strong> Unity gain (~100-139)</li>
                        <li>• <strong>Exposure:</strong> 60-300 sec</li>
                        <li>• <strong>Binning:</strong> 1x1 or 2x2</li>
                        <li>• <strong>Cooling:</strong> -10 to -20°C</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Tracking Requirements */}
                <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-5 border border-violet-500/20">
                  <h4 className="font-semibold text-[var(--color-chart-secondary)] mb-3 flex items-center gap-2">
                    <span>🔄</span> Tracking Requirements
                  </h4>
                  <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)] mb-1">No Tracking:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Max 3-5 seconds (depends on focal length)</li>
                        <li>• Use 500 rule: 500 ÷ focal length = max seconds</li>
                        <li>• Wide angle lenses (14-35mm) work best</li>
                        <li>• Will show star trails if longer</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)] mb-1">With Star Tracker:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• 30-60 sec exposures possible</li>
                        <li>• Use polar alignment app (PoleMaster, SharpCap)</li>
                        <li>• Comet will trail slightly (differential rate)</li>
                        <li>• Stack frames for better SNR</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)] mb-1">With Guided Mount:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• 120-300 sec exposures</li>
                        <li>• Use comet-tracking rate for best results</li>
                        <li>• Stars will trail, comet stays sharp</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Stacking & Processing */}
                <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-5 border border-violet-500/20">
                  <h4 className="font-semibold text-[var(--color-chart-tertiary)] mb-3 flex items-center gap-2">
                    <span>🖼️</span> Stacking & Processing
                  </h4>
                  <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)] mb-1">Image Stacking:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• <strong>Software:</strong> DeepSkyStacker (free), PixInsight, Siril</li>
                        <li>• <strong>Frames:</strong> 50-100+ light frames minimum for tail structure. Professional results require 150+ frames (<InlineCitation id="atlas-ttt3-sunward-jet" style="short" /> used 159 frames)</li>
                        <li>• <strong>Calibration:</strong> 20 darks, 20 flats, 20 bias</li>
                        <li>• <strong>Alignment:</strong> Use comet as reference (not stars)</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--color-text-primary)] mb-1">Post-Processing:</div>
                      <ul className="space-y-1 ml-4">
                        <li>• Stretch histogram to reveal faint details</li>
                        <li>• Remove light pollution gradient</li>
                        <li>• Enhance green coma (C2 emission)</li>
                        <li>• Sharpen nucleus, preserve tail smoothness</li>
                        <li>• Adjust color balance (don&apos;t oversaturate)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Software Recommendations */}
              <div className="bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)] rounded-lg p-5 border-2 border-violet-500/30">
                <h4 className="font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                  <span>💻</span> Free Software Recommendations
                </h4>
                <div className="grid md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="font-bold text-[var(--color-chart-primary)] mb-1">Planning:</div>
                    <ul className="space-y-1 text-[var(--color-text-secondary)]">
                      <li>• Stellarium (sky maps)</li>
                      <li>• SkySafari (mobile)</li>
                      <li>• Heavens-Above</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--color-chart-secondary)] mb-1">Capture:</div>
                    <ul className="space-y-1 text-[var(--color-text-secondary)]">
                      <li>• SharpCap (webcam)</li>
                      <li>• BackyardEOS (Canon)</li>
                      <li>• digiCamControl (Nikon)</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--color-chart-tertiary)] mb-1">Stacking:</div>
                    <ul className="space-y-1 text-[var(--color-text-secondary)]">
                      <li>• DeepSkyStacker</li>
                      <li>• Siril</li>
                      <li>• Sequator</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--color-chart-quaternary)] mb-1">Processing:</div>
                    <ul className="space-y-1 text-[var(--color-text-secondary)]">
                      <li>• GIMP (Photoshop alt)</li>
                      <li>• RawTherapee</li>
                      <li>• Darktable</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div>
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <span>✨</span> Best Practices for Observing
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-5 border border-violet-500/20">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">Before You Observe:</h4>
                  <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-primary)] mt-0.5">1.</span>
                      <span><strong>Dark adaptation:</strong> 30 minutes minimum. Use red flashlight only.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-primary)] mt-0.5">2.</span>
                      <span><strong>Check Moon phase:</strong> New Moon ± 5 days is ideal. Avoid bright moonlight.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-primary)] mt-0.5">3.</span>
                      <span><strong>Light pollution:</strong> Drive to dark sky site (Bortle 3-4 or darker). Use <a href="https://www.lightpollutionmap.info" target="_blank" rel="noopener noreferrer" className="text-[var(--color-chart-senary)] hover:underline">lightpollutionmap.info</a></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-primary)] mt-0.5">4.</span>
                      <span><strong>Weather:</strong> Clear skies, low humidity, stable atmosphere (minimal twinkling)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-primary)] mt-0.5">5.</span>
                      <span><strong>Plan coordinates:</strong> Use this dashboard&apos;s RA/DEC, input to Stellarium or telescope mount</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-5 border border-violet-500/20">
                  <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">During Observation:</h4>
                  <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-secondary)] mt-0.5">1.</span>
                      <span><strong>Start with low magnification:</strong> 40-60x for wide field of view</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-secondary)] mt-0.5">2.</span>
                      <span><strong>Use averted vision:</strong> Look slightly to the side to engage more sensitive rod cells</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-secondary)] mt-0.5">3.</span>
                      <span><strong>Try filters:</strong> UHC or OIII filters enhance gas emissions (green coma)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-secondary)] mt-0.5">4.</span>
                      <span><strong>Patience:</strong> Eyes need time to adapt. Spend 10-15 minutes per object.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-chart-secondary)] mt-0.5">5.</span>
                      <span><strong>Take notes:</strong> Sketch what you see, note coma size, tail direction, brightness estimate</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="bg-gradient-to-br from-indigo-900/20 to-blue-900/10 border border-indigo-500/30 rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">❓</span>
              <h2 className="text-2xl font-bold text-[var(--color-chart-primary)]">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-4">
              <details className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-indigo-500/20">
                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-chart-primary)] transition-colors">
                  Why is there no JPL Vec/Eph data showing?
                </summary>
                <p className="mt-3 text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  JPL Horizons may not have complete data for newly discovered objects yet. As 3I/ATLAS was only recently discovered and confirmed as interstellar,
                  it can take time for NASA/JPL to incorporate it into their ephemeris system. We use what&apos;s available and display &quot;N/A&quot; when data is unavailable.
                  Check back periodically as more data becomes available!
                </p>
              </details>

              <details className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-indigo-500/20">
                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-chart-primary)] transition-colors">
                  How often does the data update?
                </summary>
                <p className="mt-3 text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  <strong>COBS observations:</strong> Every 5 minutes (our cache refreshes automatically)<br />
                  <strong>NASA/JPL Horizons:</strong> Orbital calculations are relatively static and recalculated when new observations refine the orbit<br />
                  <strong>TheSkyLive:</strong> Real-time coordinates update with page refresh<br />
                  The dashboard shows the last update timestamp for each data source at the bottom of each page.
                </p>
              </details>

              <details className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-indigo-500/20">
                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-chart-primary)] transition-colors">
                  How can I contribute my own observations?
                </summary>
                <p className="mt-3 text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  Submit your brightness measurements to <a href="https://cobs.si" target="_blank" rel="noopener noreferrer" className="text-[var(--color-chart-senary)] hover:underline">COBS (Comet Observation Database)</a>.
                  You&apos;ll need to create a free account, then submit observations with date, time (UTC), magnitude estimate, equipment used, and observing conditions.
                  Your data will appear on this dashboard within 5 minutes! See the &quot;Join the Global Observer Network&quot; section above for detailed steps.
                </p>
              </details>

              <details className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-indigo-500/20">
                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-chart-primary)] transition-colors">
                  What equipment do I need to see 3I/ATLAS?
                </summary>
                <p className="mt-3 text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  It depends on the object&apos;s brightness (magnitude). For extended objects like comets:<br />
                  <strong>Mag 6-7:</strong> Naked eye or binoculars (dark skies)<br />
                  <strong>Mag 8-10.5:</strong> Binoculars (10x50) or small telescope (4-6 inch)<br />
                  <strong>Mag 11-11.5:</strong> Medium telescope (6-8 inch aperture)<br />
                  <strong>Mag 12-12.5:</strong> Large telescope (8-10 inch) - dark skies essential<br />
                  <strong>Mag 13+:</strong> Very large telescope (10-12+ inch) or astrophotography<br /><br />
                  <strong>⚠️ 3I/ATLAS is currently magnitude ~12.0</strong>, requiring an <strong>8-10 inch (200-254mm) telescope minimum</strong> under dark skies (Bortle 3-4). Astrophotography recommended for best results.
                </p>
              </details>

              <details className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-indigo-500/20">
                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-chart-primary)] transition-colors">
                  Why does &quot;lower magnitude&quot; mean brighter?
                </summary>
                <p className="mt-3 text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  The astronomical magnitude scale is historical and counterintuitive! It dates back to ancient Greek astronomer Hipparchus (~150 BC),
                  who classified the brightest stars as &quot;1st magnitude&quot; and the faintest visible stars as &quot;6th magnitude.&quot;
                  Modern measurements extended this scale: brighter objects have <em>lower</em> numbers (even negative values like the Sun at -26.7),
                  while fainter objects have higher numbers. Each step of 1 magnitude = 2.512× brightness difference.
                  So magnitude 6 is 2.512× brighter than magnitude 7, and 100× brighter than magnitude 11.
                </p>
              </details>

              <details className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-indigo-500/20">
                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-chart-primary)] transition-colors">
                  When will 3I/ATLAS be visible from my location?
                </summary>
                <p className="mt-3 text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  Visibility depends on three factors: <strong>brightness (magnitude)</strong>, <strong>position in the sky</strong>, and <strong>solar elongation</strong> (angle from the Sun).
                  Check the <strong>&quot;Can I See It Tonight?&quot;</strong> banner on the Details page for current visibility status.
                  Generally, objects need to be:
                  - At least 30° away from the Sun (to avoid twilight glare)
                  - Above your horizon during dark hours
                  - Bright enough for your equipment (see magnitude scale)
                  <br /><br />
                  For precise visibility predictions from your exact location, use planetarium software like Stellarium (free) with 3I/ATLAS&apos;s coordinates from this dashboard.
                </p>
              </details>

              <details className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-indigo-500/20">
                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-chart-primary)] transition-colors">
                  What makes 3I/ATLAS special? Why track it?
                </summary>
                <p className="mt-3 text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  3I/ATLAS is only the <strong>third confirmed interstellar object</strong> ever detected passing through our solar system!
                  The first was &apos;Oumuamua (2017), the second was 2I/Borisov (2019), and now 3I/ATLAS (2025).
                  These objects originated from another star system entirely, traveled for millions of years through interstellar space, and are now
                  making a one-time flyby of our Sun. They&apos;ll never return. Studying them gives us a rare glimpse into the composition and
                  characteristics of planetary systems around other stars. Every observation helps scientists understand these cosmic messengers!
                </p>
              </details>

              <details className="bg-[var(--color-bg-secondary)]/50 rounded-lg p-4 border border-indigo-500/20">
                <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-chart-primary)] transition-colors">
                  Can I use this data for my research paper or school project?
                </summary>
                <p className="mt-3 text-[var(--color-text-secondary)] text-sm leading-relaxed">
                  <strong>For education and outreach:</strong> Yes! This dashboard is perfect for school projects, presentations, or public engagement.
                  Please cite this dashboard and the underlying data sources (COBS, NASA/JPL Horizons, TheSkyLive).<br /><br />
                  <strong>For peer-reviewed research:</strong> Use the authoritative sources directly (COBS, JPL Horizons, MPC) rather than this aggregated dashboard.
                  This dashboard uses simplified models and is not peer-reviewed. Always verify critical data with primary sources for publication-quality work.
                </p>
              </details>
            </div>
          </section>

          {/* Footer Note */}
          <div className="bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-xl p-8 text-center shadow-lg">
            <span className="text-4xl mb-4 block">🚀</span>
            <p className="text-[var(--color-text-primary)] text-xl font-bold mb-3">
              Built by enthusiasts, for enthusiasts
            </p>
            <p className="text-[var(--color-text-tertiary)] mb-6">
              Questions, issues, or want to contribute?
            </p>
            <a href="https://github.com/hook-365/3idashboard" target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 bg-[var(--color-chart-primary)] hover:bg-[var(--color-chart-primary)]/80
                          text-[var(--color-text-primary)] px-6 py-3 rounded-lg font-semibold transition-all shadow-lg">
              <span>Visit GitHub Repository</span>
              <span>→</span>
            </a>
            <p className="text-[var(--color-text-tertiary)] mt-6 text-sm">
              Dashboard updated September 30, 2025
            </p>
          </div>

          {/* Data Attribution Footer */}
          <DataAttribution full={true} />
        </div>
      </div>
    </ExtensionSafeWrapper>
  );
}
