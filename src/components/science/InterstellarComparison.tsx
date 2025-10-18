'use client';

import InfoTooltip from '@/components/common/InfoTooltip';
import { InlineCitation } from '@/components/common/Citation';

/**
 * InterstellarComparison Component
 *
 * Compares 3I/ATLAS with the two previous confirmed interstellar visitors:
 * - 1I/'Oumuamua (2017): Non-cometary, elongated, no coma
 * - 2I/Borisov (2019): "Normal" comet with familiar chemistry
 * - 3I/ATLAS (2025): Exotic chemistry, extreme activity, unprecedented anomalies
 *
 * Highlights what makes 3I/ATLAS unique among interstellar objects
 */

interface InterstellarComparisonProps {
  className?: string;
}

export default function InterstellarComparison({ className = '' }: InterstellarComparisonProps) {
  return (
    <div id="interstellar-comparison" className={`min-h-[400px] bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-primary)] ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-[var(--color-text-heading)] mb-2 flex items-center gap-2">
          🌌 Interstellar Visitors Compared
        </h3>
        <p className="text-[var(--color-text-tertiary)] text-sm">
          How 3I/ATLAS differs from the two previous confirmed interstellar objects
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 1I/'Oumuamua */}
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 border-2 border-[var(--color-border-primary)] hover:border-[var(--color-chart-primary)] transition-colors">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🪨</div>
            <h4 className="text-xl font-bold text-[var(--color-chart-primary)]">1I/'Oumuamua</h4>
            <p className="text-xs text-[var(--color-text-tertiary)]">October 2017 • First confirmed</p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Characteristics:</div>
              <ul className="space-y-1 text-[var(--color-text-secondary)] text-xs ml-4">
                <li>• No coma or tail detected</li>
                <li>• Highly elongated (~10:1 ratio)</li>
                <li>• Rapid tumbling motion</li>
                <li>• Reddish surface color</li>
                <li>• Non-gravitational acceleration</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Size:</div>
              <p className="text-[var(--color-text-secondary)] text-xs">~100-400m length</p>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Chemistry:</div>
              <p className="text-[var(--color-text-secondary)] text-xs">
                None detected (no spectroscopy possible - too faint)
              </p>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Classification:</div>
              <p className="text-[var(--color-status-info)] text-xs font-mono">
                Unknown type - possibly asteroid, icy body, or artificial
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-[var(--color-border-primary)]">
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Legacy:</div>
              <p className="text-[var(--color-text-tertiary)] text-xs italic">
                "Proved interstellar objects visit our solar system"
              </p>
            </div>
          </div>
        </div>

        {/* 2I/Borisov */}
        <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 border-2 border-[var(--color-border-primary)] hover:border-[var(--color-chart-secondary)] transition-colors">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">☄️</div>
            <h4 className="text-xl font-bold text-[var(--color-chart-secondary)]">2I/Borisov</h4>
            <p className="text-xs text-[var(--color-text-tertiary)]">August 2019 • First interstellar comet</p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Characteristics:</div>
              <ul className="space-y-1 text-[var(--color-text-secondary)] text-xs ml-4">
                <li>• Clear coma and tail</li>
                <li>• Normal comet morphology</li>
                <li>• Stable rotation</li>
                <li>• Reddish nucleus</li>
                <li>• Typical outgassing behavior</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Size:</div>
              <p className="text-[var(--color-text-secondary)] text-xs">~1 km nucleus diameter</p>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Chemistry:</div>
              <ul className="space-y-1 text-[var(--color-text-secondary)] text-xs ml-4">
                <li>• CN detected (normal)</li>
                <li>• C₂ detected (normal)</li>
                <li>• CO-rich (unusual but not extreme)</li>
                <li>• H₂O present (typical)</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Classification:</div>
              <p className="text-[var(--color-status-success)] text-xs font-mono">
                Normal comet - familiar behavior
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-[var(--color-border-primary)]">
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Legacy:</div>
              <p className="text-[var(--color-text-tertiary)] text-xs italic">
                "Showed interstellar comets can be remarkably similar to solar system comets"
              </p>
            </div>
          </div>
        </div>

        {/* 3I/ATLAS */}
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg p-6 border-2 border-orange-500 hover:border-orange-400 transition-colors">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">🔥</div>
            <h4 className="text-xl font-bold text-orange-400">3I/ATLAS</h4>
            <p className="text-xs text-[var(--color-text-tertiary)]">July 2025 • Most anomalous yet</p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Characteristics:</div>
              <ul className="space-y-1 text-[var(--color-text-secondary)] text-xs ml-4">
                <li>• Strong coma and tail</li>
                <li>• Dust-dominated emission</li>
                <li>• Extreme activity scaling ⚠️</li>
                <li>• Red optical continuum</li>
                <li>• CO₂-dominant atmosphere</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Size:</div>
              <p className="text-[var(--color-text-secondary)] text-xs">~few km (estimate from brightness)</p>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Chemistry:</div>
              <ul className="space-y-1 text-[var(--color-text-secondary)] text-xs ml-4">
                <li>• <span className="text-orange-400 font-bold">Ni I detected WITHOUT Fe I</span> 🚨</li>
                <li>• CN detected (extreme scaling)</li>
                <li>• CO₂ dominant (JWST)</li>
                <li>• CH₄ + hydrocarbons (traces)</li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Classification:</div>
              <p className="text-orange-400 text-xs font-mono">
                Anomalous comet - unprecedented chemistry
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-orange-500/30">
              <div className="font-semibold text-[var(--color-text-primary)] mb-1">Legacy:</div>
              <p className="text-[var(--color-text-tertiary)] text-xs italic">
                "Proving that interstellar objects can have wildly exotic compositions"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Differences Table */}
      <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6 mb-6">
        <h4 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          📊 Direct Comparison
          <InfoTooltip content="Side-by-side comparison of key properties" />
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-primary)]">
                <th className="text-left py-3 px-4 text-[var(--color-text-secondary)] font-semibold">Property</th>
                <th className="text-left py-3 px-4 text-[var(--color-chart-primary)] font-semibold">1I/'Oumuamua</th>
                <th className="text-left py-3 px-4 text-[var(--color-chart-secondary)] font-semibold">2I/Borisov</th>
                <th className="text-left py-3 px-4 text-orange-400 font-semibold">3I/ATLAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-primary)]">
              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Activity Type</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">None detected</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">Normal comet</td>
                <td className="py-3 px-4 text-orange-400 font-bold">Extreme (r<sub>h</sub><sup>-9.38</sup>)</td>
              </tr>

              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Metal Emission</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">N/A (no spectrum)</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">None/trace</td>
                <td className="py-3 px-4 text-orange-400 font-bold">Ni I without Fe I ⚠️</td>
              </tr>

              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Dominant Volatile</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">Unknown</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">CO + H₂O</td>
                <td className="py-3 px-4 text-orange-400 font-bold">CO₂ (JWST)</td>
              </tr>

              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Perihelion Distance</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">0.25 AU</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">2.01 AU</td>
                <td className="py-3 px-4 text-orange-400 font-bold">1.36 AU</td>
              </tr>

              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Orbital Inclination</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">122.7° (retrograde)</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">44.0° (prograde)</td>
                <td className="py-3 px-4 text-orange-400 font-bold">175° (highly retrograde)</td>
              </tr>

              <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">Uniqueness Factor</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">First confirmed ISO</td>
                <td className="py-3 px-4 text-[var(--color-text-secondary)]">Normal behavior</td>
                <td className="py-3 px-4 text-orange-400 font-bold">Unprecedented anomalies</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insight */}
      <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-l-4 border-orange-500 rounded-r-lg p-5">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💡</div>
          <div>
            <h4 className="text-lg font-bold text-orange-400 mb-2">
              What Makes 3I/ATLAS Special
            </h4>
            <div className="text-[var(--color-text-secondary)] text-sm space-y-2">
              <p>
                <strong className="text-[var(--color-text-primary)]">1I/'Oumuamua</strong> showed us interstellar
                objects exist, but we couldn't study its chemistry.
              </p>
              <p>
                <strong className="text-[var(--color-text-primary)]">2I/Borisov</strong> was remarkably "normal" -
                proving some interstellar comets form similarly to our own.
              </p>
              <p>
                <strong className="text-orange-400">3I/ATLAS</strong> is the first to show{' '}
                <span className="font-bold">truly alien chemistry</span> - nickel without iron, extreme activity
                scaling, CO₂ dominance. It's proof that interstellar space can produce objects with compositions
                unlike anything in our solar system.
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-3 italic">
                Each interstellar visitor teaches us something new about planetary system formation across the galaxy.
                3I/ATLAS suggests some stellar nurseries create objects with radically different compositions than
                our Sun's protoplanetary disk.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Citation */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border-primary)]">
        <p className="text-xs text-[var(--color-text-tertiary)]">
          <strong>Sources:</strong>{' '}
          1I/'Oumuamua: <InlineCitation id="oumuamua-meech-2017" style="short" /> •{' '}
          2I/Borisov: <InlineCitation id="borisov-cordiner-2020" style="short" />, <InlineCitation id="borisov-fitzsimmons-2019" style="short" /> •{' '}
          3I/ATLAS: <InlineCitation id="atlas-vlt-spectroscopy" style="short" /> + <InlineCitation id="atlas-jwst-nirspec" style="short" />
        </p>
      </div>
    </div>
  );
}
