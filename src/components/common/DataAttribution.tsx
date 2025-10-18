/**
 * Data Attribution Footer Component
 *
 * Standardized footer for all pages showing data sources and licensing.
 * Ensures consistent attribution across the entire dashboard.
 */

'use client';

import { DataSourceAttribution } from './Citation';

interface DataAttributionProps {
  /** Show all sources (true) or minimal version (false) */
  full?: boolean;
  /** Additional className for styling */
  className?: string;
}

export default function DataAttribution({ full = true, className = '' }: DataAttributionProps) {
  return (
    <div className={`bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-6 mt-8 ${className}`}>
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📚</span>
          <h3 className="text-lg font-bold text-[var(--color-text-heading)]">
            Data Sources & Attribution
          </h3>
        </div>

          {full ? (
            // Full version - show all sources with descriptions
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {/* COBS */}
              <div className="flex flex-col gap-1">
                <DataSourceAttribution id="cobs" showLicense={true} />
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Global observation network providing brightness measurements
                </p>
              </div>

              {/* JPL Horizons */}
              <div className="flex flex-col gap-1">
                <DataSourceAttribution id="jpl-horizons" showLicense={false} />
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  NASA orbital mechanics and ephemeris calculations
                </p>
              </div>

              {/* TheSkyLive */}
              <div className="flex flex-col gap-1">
                <DataSourceAttribution id="theskylive" showLicense={false} />
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Real-time astronomical coordinates and positions
                </p>
              </div>
            </div>
          ) : (
            // Minimal version - single line
            <p className="text-xs text-[var(--color-text-tertiary)]">
              Data from{' '}
              <DataSourceAttribution id="cobs" showLicense={false} className="inline" />,{' '}
              <DataSourceAttribution id="jpl-horizons" showLicense={false} className="inline" />, and{' '}
              <DataSourceAttribution id="theskylive" showLicense={false} className="inline" />
            </p>
          )}

          {/* Research Citations */}
          <div className="border-t border-[var(--color-border-secondary)] pt-4">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              <strong className="text-[var(--color-text-secondary)]">Research & Analysis:</strong>{' '}
              Tail structure observations from{' '}
              <a
                href="https://avi-loeb.medium.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 underline"
              >
                Avi Loeb et al. (2025)
              </a>
              {' '}via TTT3, Keck II KCWI, and VLT UVES spectroscopy. See{' '}
              <a
                href="/about#citations"
                className="text-[var(--color-chart-senary)] hover:text-[var(--color-chart-senary)]/80 underline"
              >
                About page
              </a>
              {' '}for full references.
            </p>
          </div>

        {/* License Notice */}
        <div className="text-xs text-[var(--color-text-tertiary)] border-t border-[var(--color-border-secondary)] pt-4">
          <p>
            <strong className="text-[var(--color-text-secondary)]">License:</strong>{' '}
            COBS data used under CC BY-NC-SA 4.0 (non-commercial with attribution).
            NASA/JPL data is public domain. Dashboard code is open source.
          </p>
        </div>
      </div>
    </div>
  );
}
