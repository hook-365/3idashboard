import { DataSourceAttribution } from './Citation';

export default function DataSourcesSection() {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 mt-8">
      <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">📊 Data Sources & Attribution</h3>
      <div className="text-xs text-[var(--color-text-tertiary)] space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[var(--color-status-info)]">🔭</span>
          <DataSourceAttribution id="cobs" showLicense={true} />
          <span className="text-[var(--color-text-tertiary)]">•</span>
          <span className="text-[var(--color-status-success)]">🛰️</span>
          <DataSourceAttribution id="jpl-horizons" showLicense={false} />
          <span className="text-[var(--color-text-tertiary)]">•</span>
          <span className="text-[var(--color-chart-quaternary)]">🌌</span>
          <DataSourceAttribution id="theskylive" showLicense={false} />
        </div>
        <p className="mt-2">
          This dashboard aggregates data from multiple astronomical sources to provide comprehensive 3I/ATLAS tracking with intelligent fallback mechanisms. All source attributions are preserved in API responses.
        </p>
      </div>
    </div>
  );
}
