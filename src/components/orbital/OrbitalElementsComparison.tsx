'use client';

import { useMemo } from 'react';
import type { MPCOrbitalElements } from '@/types/enhanced-comet-data';
import type { JPLHorizonsData } from '@/lib/data-sources/jpl-horizons';
import {
  validateOrbitalElements,
  formatElementValue,
  getValidationColor,
  getValidationIcon,
  type OrbitalValidationResult,
} from '@/utils/orbital-validation';

interface OrbitalElementsComparisonProps {
  mpcElements?: MPCOrbitalElements;
  jplData?: JPLHorizonsData | null;
}

export default function OrbitalElementsComparison({
  mpcElements,
  jplData,
}: OrbitalElementsComparisonProps) {
  // Validate orbital elements and memoize result
  const validation: OrbitalValidationResult = useMemo(() => {
    return validateOrbitalElements(mpcElements, jplData);
  }, [mpcElements, jplData]);

  // Don't render if no data available
  if (!mpcElements && !jplData) {
    return null;
  }

  // Confidence percentage
  const confidencePercent = Math.round(validation.confidence * 100);

  // Determine confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Format metadata
  const formatMetadata = () => {
    const metadata: Array<{ label: string; value: string }> = [];

    if (mpcElements) {
      if (mpcElements.number_of_observations) {
        metadata.push({
          label: 'MPC Observations',
          value: mpcElements.number_of_observations.toString(),
        });
      }
      if (mpcElements.observation_arc) {
        const firstYear = mpcElements.observation_arc.first.split('-')[0];
        const lastYear = mpcElements.observation_arc.last.split('-')[0];
        metadata.push({
          label: 'MPC Observation Arc',
          value: `${firstYear}-${lastYear}`,
        });
      }
      if (mpcElements.epoch) {
        metadata.push({
          label: 'MPC Epoch',
          value: new Date(mpcElements.epoch).toISOString().split('T')[0],
        });
      }
    }

    if (jplData) {
      metadata.push({
        label: 'JPL Last Updated',
        value: new Date(jplData.last_updated).toISOString().split('T')[0],
      });
    }

    return metadata;
  };

  const metadata = formatMetadata();

  return (
    <div className="bg-gradient-to-br from-[var(--color-bg-secondary)]/50 to-[var(--color-bg-primary)]/50 backdrop-blur-sm rounded-2xl border border-[var(--color-border-primary)]/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">
            Orbital Elements Comparison
          </h3>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            Cross-validation: MPC vs JPL Horizons
          </p>
        </div>

        {/* Validation Confidence Badge */}
        {validation.summary.total_elements > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`text-2xl font-bold ${getConfidenceColor(validation.confidence)}`}>
                {confidencePercent}%
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)]">Agreement</div>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
              validation.isValid ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              {validation.isValid ? '✓' : '⚠'}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border-primary)]/50">
              <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-tertiary)]">Element</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--color-text-tertiary)]">MPC Value</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--color-text-tertiary)]">JPL Value</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--color-text-tertiary)]">Δ Difference</th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--color-text-tertiary)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {validation.elements.map((element, index) => (
              <tr
                key={index}
                className={`border-b border-[var(--color-border-primary)]/30 hover:bg-[var(--color-bg-secondary)]/20 transition-colors ${
                  element.mpc_value === 'N/A' || element.jpl_value === 'N/A' ? 'opacity-50' : ''
                }`}
              >
                <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">
                  {element.element}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono text-cyan-400">
                  {formatElementValue(element.mpc_value)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono text-blue-400">
                  {formatElementValue(element.jpl_value)}
                </td>
                <td className="py-3 px-4 text-sm text-right font-mono text-[var(--color-text-tertiary)]">
                  {element.mpc_value !== 'N/A' && element.jpl_value !== 'N/A'
                    ? formatElementValue(element.difference)
                    : '-'}
                  {element.percent_difference && element.percent_difference < 100 && (
                    <span className="text-xs ml-1">({element.percent_difference.toFixed(1)}%)</span>
                  )}
                </td>
                <td className={`py-3 px-4 text-center text-lg ${getValidationColor(
                  element.agrees,
                  element.mpc_value,
                  element.jpl_value
                )}`}>
                  {getValidationIcon(element.agrees, element.mpc_value, element.jpl_value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      {validation.summary.total_elements > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-[var(--color-bg-secondary)]/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-cyan-400">{validation.summary.total_elements}</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Total Elements</div>
          </div>
          <div className="bg-[var(--color-bg-secondary)]/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-400">{validation.summary.agreeing_elements}</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Agreeing</div>
          </div>
          <div className="bg-[var(--color-bg-secondary)]/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-yellow-400">{validation.summary.disagreeing_elements}</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Disagreeing</div>
          </div>
          <div className="bg-[var(--color-bg-secondary)]/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[var(--color-text-tertiary)]">{validation.summary.missing_elements}</div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Missing</div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--color-border-primary)]/50">
          <h4 className="text-sm font-semibold text-[var(--color-text-tertiary)] mb-3">Data Source Metadata</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metadata.map((item, index) => (
              <div key={index} className="bg-[var(--color-bg-secondary)]/20 rounded-lg p-3">
                <div className="text-xs text-[var(--color-text-tertiary)]">{item.label}</div>
                <div className="text-sm font-mono text-cyan-400 mt-1">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--color-border-primary)]/50">
          <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <span>⚠</span>
            Validation Warnings
          </h4>
          <ul className="space-y-2">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-[var(--color-text-tertiary)] flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tolerance Information */}
      <div className="mt-6 pt-6 border-t border-[var(--color-border-primary)]/50">
        <details className="group">
          <summary className="text-sm font-semibold text-[var(--color-text-tertiary)] cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors flex items-center gap-2">
            <span className="transform group-open:rotate-90 transition-transform">▶</span>
            Tolerance Thresholds
          </summary>
          <div className="mt-3 text-xs text-[var(--color-text-tertiary)] space-y-1 ml-6">
            <p>• Perihelion Distance (q): ±0.001 AU (~150,000 km)</p>
            <p>• Eccentricity (e): ±0.01 (1%)</p>
            <p>• Inclination (i): ±0.1°</p>
            <p>• Argument of Perihelion (ω): ±0.5°</p>
            <p>• Longitude of Ascending Node (Ω): ±0.5°</p>
            <p>• Perihelion Time (T): ±0.1 days (~2.4 hours)</p>
          </div>
        </details>
      </div>

      {/* Data Attribution */}
      <div className="mt-6 pt-6 border-t border-[var(--color-border-primary)]/50 text-xs text-[var(--color-text-tertiary)] text-center">
        <p>
          MPC data from{' '}
          <a
            href="https://www.minorplanetcenter.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Minor Planet Center
          </a>
          {' • '}
          JPL data from{' '}
          <a
            href="https://ssd.jpl.nasa.gov/horizons.cgi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            JPL Horizons
          </a>
        </p>
      </div>
    </div>
  );
}
