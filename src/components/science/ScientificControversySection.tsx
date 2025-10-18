'use client';

import { useState } from 'react';
import CompositionAnomalies from './CompositionAnomalies';
import ActivityScalingChart from './ActivityScalingChart';
import InterstellarComparison from './InterstellarComparison';
import InfoTooltip from '@/components/common/InfoTooltip';

/**
 * ScientificControversySection Component
 *
 * Main container that presents the scientific controversy around 3I/ATLAS.
 * Combines all anomaly components with open questions and hypothesis discussion.
 *
 * This section explains why 3I/ATLAS is forcing astronomers to rethink
 * theories about interstellar objects and cometary chemistry.
 */

interface ScientificControversySectionProps {
  className?: string;
}

export default function ScientificControversySection({ className = '' }: ScientificControversySectionProps) {
  const [expandedHypothesis, setExpandedHypothesis] = useState<string | null>(null);

  const hypotheses = [
    {
      id: 'photodesorption',
      title: 'Photon-Stimulated Desorption',
      icon: '☀️',
      summary: 'UV photons knock Ni atoms off grain surfaces without thermal sublimation',
      details: [
        'UV radiation from the Sun breaks chemical bonds, releasing Ni atoms from grain surfaces',
        'This process can occur at lower temperatures than thermal sublimation',
        'Could explain why Ni appears without Fe if they are in different chemical environments',
        'Requires specific surface chemistry (possibly metalated organics)',
      ],
      likelihood: 'Moderate - explains temperature discrepancy',
    },
    {
      id: 'thermolysis',
      title: 'Organometallic Thermolysis',
      icon: '🧪',
      summary: 'Ni-containing organic compounds decompose, releasing Ni atoms',
      details: [
        'Nickel carbonyl [Ni(CO)₄] or other Ni-organic compounds break down with heating',
        'This could produce Ni emission without requiring Fe-bearing organics to be present',
        'CO₂ dominance (JWST) supports carbonyl formation chemistry',
        'Suggests formation in a carbon-rich, metal-enriched stellar nursery',
      ],
      likelihood: 'High - best fits CO₂ + Ni correlation',
    },
    {
      id: 'metal-rich-origin',
      title: 'Metal-Rich Stellar Nursery',
      icon: '⭐',
      summary: 'Object formed in an unusual stellar environment with high Ni/Fe ratio',
      details: [
        'Some stellar nurseries have anomalous metal abundances from supernovae',
        'Type Ia supernovae produce more Ni-56 (decays to Fe-56) than Type II',
        'Differential condensation could create Ni-rich, Fe-depleted grains',
        'Retrograde orbit (175°) suggests origin outside our local stellar neighborhood',
      ],
      likelihood: 'Moderate - requires specific formation conditions',
    },
    {
      id: 'grain-separation',
      title: 'Differential Grain Processing',
      icon: '💎',
      summary: 'Ni and Fe incorporated into different grain populations with different sublimation',
      details: [
        'Fe locked in refractory silicate grains (high sublimation temperature)',
        'Ni in more volatile phases like sulfides or organics (lower sublimation)',
        'Dust-dominated coma (red continuum) consistent with complex grain composition',
        'Could result from unusual disk chemistry during formation',
      ],
      likelihood: 'Moderate - needs laboratory confirmation',
    },
  ];

  return (
    <div className={`bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border-primary)] ${className}`}>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-4xl">🔬</span>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text-heading)]">
              Why It's Special
            </h2>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              Unique characteristics and scientific debate • Chemical anomalies unlike any comet ever observed
            </p>
          </div>
        </div>

      <div className="bg-[var(--color-bg-primary)] rounded-lg p-6">
      {/* Introduction */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8 border border-[var(--color-border-primary)]">
        <div className="prose prose-invert max-w-none">
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            Since its discovery in July 2025, <strong className="text-[var(--color-text-primary)]">3I/ATLAS</strong>{' '}
            has challenged fundamental assumptions about cometary chemistry and interstellar object composition.
            High-resolution spectroscopy from the VLT and JWST has revealed a chemical fingerprint that
            <strong className="text-orange-400"> has never been seen before</strong> in any solar system or
            interstellar comet.
          </p>
          <p className="text-[var(--color-text-secondary)] leading-relaxed mt-4">
            The object displays three major anomalies that are forcing astronomers to reconsider theories about
            how comets form in other stellar systems:
          </p>
          <ul className="list-none space-y-2 mt-4 text-[var(--color-text-secondary)]">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">1.</span>
              <span><strong>Metal emission anomaly:</strong> Strong nickel (Ni I) emission without accompanying iron (Fe I)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">2.</span>
              <span><strong>Extreme activity scaling:</strong> Gas production increases with r<sub>h</sub><sup>-9.38</sup> instead of normal r<sub>h</sub><sup>-2 to -4</sup></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">3.</span>
              <span><strong>CO₂ dominance:</strong> Carbon dioxide is the primary volatile, not water or CO as in typical comets</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Anomaly Components */}
      <div className="space-y-8 mb-8">
        <CompositionAnomalies />
        <ActivityScalingChart />
        <InterstellarComparison />
      </div>

      {/* Hypotheses Section */}
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 mb-8 border border-[var(--color-border-primary)]">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-[var(--color-text-heading)] mb-2 flex items-center gap-2">
            🤔 Leading Hypotheses
            <InfoTooltip content="Click each hypothesis to expand details and evidence" />
          </h3>
          <p className="text-[var(--color-text-tertiary)] text-sm">
            Scientists are exploring several mechanisms to explain 3I/ATLAS's unprecedented chemistry
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {hypotheses.map((hypothesis) => (
            <div
              key={hypothesis.id}
              className={`bg-[var(--color-bg-tertiary)] rounded-lg p-5 border-2 transition-all cursor-pointer ${
                expandedHypothesis === hypothesis.id
                  ? 'border-orange-500 shadow-lg'
                  : 'border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)]'
              }`}
              onClick={() => setExpandedHypothesis(expandedHypothesis === hypothesis.id ? null : hypothesis.id)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">{hypothesis.icon}</div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
                    {hypothesis.title}
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {hypothesis.summary}
                  </p>
                </div>
                <div className="text-[var(--color-text-tertiary)]">
                  {expandedHypothesis === hypothesis.id ? '▼' : '▶'}
                </div>
              </div>

              {expandedHypothesis === hypothesis.id && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)] space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-[var(--color-text-tertiary)] mb-2">
                      DETAILED MECHANISM:
                    </div>
                    <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                      {hypothesis.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-orange-500 mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-3 mt-3 border-t border-[var(--color-border-primary)]">
                    <div className="text-xs font-semibold text-[var(--color-text-tertiary)] mb-1">
                      ASSESSMENT:
                    </div>
                    <p className="text-sm text-orange-400 font-semibold">
                      {hypothesis.likelihood}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-[var(--color-text-secondary)]">
            <strong className="text-blue-400">Note:</strong> These hypotheses are not mutually exclusive.
            The true explanation may involve a combination of these mechanisms, or something entirely new
            that we haven't yet considered. More observations and laboratory studies are needed.
          </p>
        </div>
      </div>

      {/* Open Questions */}
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg p-6 mb-8 border-2 border-purple-500">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-[var(--color-text-heading)] mb-2 flex items-center gap-2">
            ❓ Unanswered Questions
          </h3>
          <p className="text-[var(--color-text-tertiary)] text-sm">
            Key mysteries that scientists are racing to solve
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔬</div>
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-2">
                  Where is the iron?
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  In every known comet, Ni and Fe appear together because they sublime at the same temperature
                  (~400K) and are chemically similar. Why is 3I/ATLAS different?
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📈</div>
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-2">
                  Why such extreme activity scaling?
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  The r<sub>h</sub><sup>-9.38</sup> power law means the comet started outgassing at distances
                  where normal comets are completely inactive. What super-volatile ices enable this?
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🌌</div>
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-2">
                  What stellar environment created it?
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  The unusual chemistry suggests formation in a stellar nursery very different from our Sun's.
                  Was it near a supernova? In a metal-rich molecular cloud?
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚗️</div>
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-2">
                  Is Ni-CO₂ chemistry connected?
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Could nickel carbonyl [Ni(CO)₄] chemistry explain both the CO₂ dominance and the Ni emission?
                  This would require very specific formation conditions.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🛰️</div>
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-2">
                  Will other interstellar comets show this?
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Is 3I/ATLAS a rare outlier, or do many interstellar comets have exotic compositions
                  that we're only now detecting with better instruments?
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔭</div>
              <div>
                <h4 className="font-bold text-[var(--color-text-primary)] mb-2">
                  What will post-perihelion reveal?
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  After October 30, 2025 perihelion, peak heating may reveal new spectral features or
                  change the Ni/Fe ratio. Continuous monitoring is critical.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>
      </div>
    </div>
  );
}
