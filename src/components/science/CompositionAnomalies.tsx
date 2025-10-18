'use client';

import InfoTooltip from '@/components/common/InfoTooltip';
import { InlineCitation } from '@/components/common/Citation';

/**
 * CompositionAnomalies Component
 *
 * Displays the chemical composition anomalies detected in 3I/ATLAS,
 * highlighting the unprecedented detection of Ni I emission without
 * accompanying Fe I emission - a first in cometary science.
 *
 * Based on arXiv:2508.18382 spectroscopic observations
 * and JWST NIRSpec data (Aug 6, 2025)
 */

interface CompositionAnomaliesProps {
  className?: string;
}

export default function CompositionAnomalies({ className = '' }: CompositionAnomaliesProps) {
  return (
    <div id="chemical-anomalies" className={`min-h-[400px] bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-primary)] ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-[var(--color-text-heading)] mb-2 flex items-center gap-2">
          🔬 Chemical Composition Anomalies
        </h3>
        <p className="text-[var(--color-text-tertiary)] text-sm">
          Spectroscopic analysis reveals unprecedented chemistry never before seen in comets
        </p>
      </div>

      {/* Key Finding Callout */}
      <div className="bg-orange-500/15 border-l-4 border-orange-500 rounded-r-lg p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="text-3xl">⚠️</div>
          <div>
            <h4 className="text-lg font-bold text-orange-400 mb-2">
              UNPRECEDENTED DETECTION
            </h4>
            <p className="text-[var(--color-text-primary)] font-semibold">
              Pure nickel emission detected - no iron
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              This has never been observed in any comet before. Nickel and iron are created together in dying stars,
              cool together, condense together, and are found together in every meteorite, asteroid, and comet ever
              studied. Earth's core is an iron-nickel alloy. <strong className="text-orange-400">Separating them
              requires industrial processing</strong> - it doesn't happen naturally. Yet 3I/ATLAS is releasing
              pure nickel gas with no detectable iron, suggesting exotic formation conditions in another star system.
            </p>
          </div>
        </div>
      </div>

      {/* Detected vs Expected Comparison Table */}
      <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 mb-6">
        <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Observed Chemistry: Expected vs Detected
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-primary)]">
                <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Species</th>
                <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Expected in Comets</th>
                <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">3I/ATLAS Status</th>
                <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Production Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              {/* Nickel - ANOMALY */}
              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 text-[var(--color-text-primary)]">
                  Nickel (Ni I)
                  <InfoTooltip content="Neutral nickel atoms - typically sublimate at ~400K from metallic grains" />
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-tertiary)]">
                    Rare, with iron
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold">
                    ✓ DETECTED
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-[var(--color-status-success)]">
                  log Q(Ni) = 22.67 ± 0.07 atoms/s
                </td>
              </tr>

              {/* Iron - ANOMALY */}
              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors bg-red-500/5">
                <td className="py-3 px-4 text-[var(--color-text-primary)]">
                  Iron (Fe I)
                  <InfoTooltip content="Neutral iron atoms - should always appear with nickel in normal comets" />
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-tertiary)]">
                    With nickel (paired)
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                    ✗ NOT DETECTED
                  </span>
                </td>
                <td className="py-3 px-4 text-[var(--color-text-tertiary)]">
                  Below detection limit
                </td>
              </tr>

              {/* CN - Normal */}
              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 font-mono text-[var(--color-text-primary)]">
                  CN
                  <InfoTooltip content="Cyanogen radical - common tracer of volatile carbon/nitrogen chemistry" />
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-tertiary)]">
                    Common
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                    ✓ DETECTED
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-[var(--color-status-success)]">
                  log Q(CN) = 23.61 ± 0.05 molecules/s
                </td>
              </tr>

              {/* CO2 - Dominant */}
              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors bg-blue-500/5">
                <td className="py-3 px-4 font-mono text-[var(--color-text-primary)]">
                  CO₂
                  <InfoTooltip content="Carbon dioxide - detected via JWST NIRSpec infrared spectroscopy" />
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-tertiary)]">
                    Common
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                    ✓ DOMINANT
                  </span>
                </td>
                <td className="py-3 px-4 text-[var(--color-chart-primary)]">
                  CO₂-rich atmosphere (JWST)
                </td>
              </tr>

              {/* Hydrocarbons */}
              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 font-mono text-[var(--color-text-primary)]">
                  CH₄ + HC
                  <InfoTooltip content="Methane and hydrocarbon traces detected by JWST NIRSpec" />
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1 text-[var(--color-text-tertiary)]">
                    Variable
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">
                    ✓ TRACES
                  </span>
                </td>
                <td className="py-3 px-4 text-[var(--color-text-tertiary)]">
                  Minor components
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Characteristics */}
      <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6">
        <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Additional Chemical Properties
        </h4>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="text-xl">🟢</div>
            <div>
              <span className="font-semibold text-[var(--color-text-primary)]">Green Coma Appearance:</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                Appears green in photos due to CN and C₂ gas emissions, despite having a dust-rich coma with reddish spectral characteristics (21-22%/1000Å slope from refractory particles)
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">💎</div>
            <div>
              <span className="font-semibold text-[var(--color-text-primary)]">Dust vs Gas:</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                Heavily dust-dominated emission, suggesting significant refractory material content
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-xl">🌡️</div>
            <div>
              <span className="font-semibold text-[var(--color-text-primary)]">Temperature Puzzles:</span>
              <span className="text-[var(--color-text-secondary)] ml-2">
                Nickel sublimation without iron suggests unusual grain composition or exotic formation processes
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Citation */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border-primary)]">
        <p className="text-xs text-[var(--color-text-tertiary)]">
          <strong>Sources:</strong>{' '}
          <InlineCitation id="atlas-vlt-spectroscopy" style="short" /> (Spectroscopic observations) •{' '}
          <InlineCitation id="atlas-jwst-nirspec" style="short" /> (August 6, 2025) • Data analysis: VLT/UVES spectrograph
        </p>
      </div>
    </div>
  );
}
