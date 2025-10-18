'use client';

import { useState, useEffect } from 'react';

interface CometInfo {
  designation: string;
  name: string;
  magnitude: number;
  perihelion: {
    date: string;
    distance_au: number;
  };
  current: {
    earthDistance: number;
    sunDistance: number;
    ra: number;
    dec: number;
  };
  orbital: {
    eccentricity: number;
    inclination: number;
    perihelion_distance: number;
  };
  status: string;
  color: string;
}

interface CometsData {
  comets: CometInfo[];
  featured_comet: string;
}

export default function CometComparisonTable() {
  const [data, setData] = useState<CometsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/comets-comparison');
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.message || 'Failed to fetch comet comparison data');
        }

        setData(json.data);
      } catch (err) {
        console.error('Error fetching comet comparison data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border-primary)]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--color-bg-tertiary)] rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-1/2 mx-auto"></div>
          <div className="h-64 bg-[var(--color-bg-tertiary)] rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <div className="text-red-300 font-semibold mb-1">Failed to Load Comparison Data</div>
            <div className="text-red-400/80 text-sm">{error || 'Unknown error'}</div>
          </div>
        </div>
      </div>
    );
  }

  // Sort comets by perihelion date
  const sortedComets = [...data.comets].sort((a, b) =>
    new Date(a.perihelion.date).getTime() - new Date(b.perihelion.date).getTime()
  );

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-[var(--color-bg-secondary)] rounded-lg p-6 border-2 border-indigo-500/30">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)] mb-2 flex items-center justify-center gap-2">
          <span className="text-3xl">⚖️</span>
          Compare All Five Comets
        </h2>
        <p className="text-sm md:text-base text-[var(--color-text-secondary)]">
          Five remarkable comets reaching perihelion from September 2025 through January 2026
        </p>
      </div>

      {/* Mobile: Card View */}
      <div className="md:hidden space-y-4">
        {sortedComets.map((comet) => {
          const perihelionDate = new Date(comet.perihelion.date);
          const daysUntilPerihelion = Math.round((perihelionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const isPastPerihelion = daysUntilPerihelion < 0;
          const isInterstellar = comet.name === '3I/ATLAS';

          return (
            <div
              key={comet.designation}
              className="bg-[var(--color-bg-tertiary)] rounded-lg p-4 border-2"
              style={{ borderColor: comet.color }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                    {comet.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    {comet.designation}
                  </p>
                </div>
                {isInterstellar && (
                  <span className="px-2 py-1 bg-purple-600/30 border border-purple-400 text-purple-300 text-xs rounded-full font-semibold">
                    Interstellar
                  </span>
                )}
              </div>

              {/* Stats Grid */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-tertiary)]">Current Magnitude:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {comet.magnitude > 0 ? comet.magnitude.toFixed(1) : 'N/A'} mag
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-tertiary)]">Sun Distance:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {comet.current.sunDistance.toFixed(2)} AU
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-tertiary)]">Earth Distance:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {comet.current.earthDistance.toFixed(2)} AU
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-tertiary)]">Perihelion:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {perihelionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-tertiary)]">Status:</span>
                  <span className="text-xs text-[var(--color-text-secondary)] text-right">
                    {isPastPerihelion ? `Passed ${Math.abs(daysUntilPerihelion)}d ago` : `${daysUntilPerihelion}d until perihelion`}
                  </span>
                </div>
              </div>

              {/* Orbital Info */}
              <div className="mt-3 pt-3 border-t border-[var(--color-border-secondary)] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[var(--color-text-tertiary)]">Eccentricity:</span>{' '}
                  <span className="font-mono text-[var(--color-text-primary)]">
                    {comet.orbital.eccentricity.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--color-text-tertiary)]">Inclination:</span>{' '}
                  <span className="font-mono text-[var(--color-text-primary)]">
                    {comet.orbital.inclination.toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-[var(--color-border-primary)]">
              <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--color-text-secondary)]">
                Comet
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--color-text-secondary)]">
                Magnitude
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--color-text-secondary)]">
                Sun Distance
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--color-text-secondary)]">
                Earth Distance
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--color-text-secondary)]">
                Perihelion
              </th>
              <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--color-text-secondary)]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedComets.map((comet, index) => {
              const perihelionDate = new Date(comet.perihelion.date);
              const daysUntilPerihelion = Math.round((perihelionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isPastPerihelion = daysUntilPerihelion < 0;
              const isInterstellar = comet.name === '3I/ATLAS';
              const isFeatured = comet.designation === 'C/2025 N1';

              return (
                <tr
                  key={comet.designation}
                  className={`border-b border-[var(--color-border-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors ${
                    isFeatured ? 'bg-[var(--color-bg-tertiary)]' : ''
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                        style={{ borderColor: comet.color, backgroundColor: `${comet.color}40` }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {comet.name}
                          </span>
                          {isInterstellar && (
                            <span className="px-1.5 py-0.5 bg-purple-600/30 border border-purple-400 text-purple-300 text-[10px] rounded-full font-semibold">
                              Interstellar
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">
                          {comet.designation}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-lg font-bold text-[var(--color-text-primary)]">
                      {comet.magnitude > 0 ? comet.magnitude.toFixed(1) : 'N/A'}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)] ml-1">mag</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-[var(--color-text-primary)] font-semibold">
                      {comet.current.sunDistance.toFixed(2)}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)] ml-1">AU</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-[var(--color-text-primary)] font-semibold">
                      {comet.current.earthDistance.toFixed(2)}
                    </span>
                    <span className="text-xs text-[var(--color-text-tertiary)] ml-1">AU</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {perihelionDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                      {comet.perihelion.distance_au.toFixed(2)} AU
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {isPastPerihelion ? (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-900/20 border border-blue-700/50 rounded text-xs">
                        <span className="text-blue-300 font-semibold">
                          Passed
                        </span>
                        <span className="text-blue-400/80">
                          {Math.abs(daysUntilPerihelion)}d ago
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-900/20 border border-amber-700/50 rounded text-xs">
                        <span className="text-amber-300 font-semibold">
                          {daysUntilPerihelion}d
                        </span>
                        <span className="text-amber-400/80">
                          until
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Orbital Elements Comparison */}
      <div className="mt-6 pt-6 border-t border-[var(--color-border-primary)]">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4 text-center">
          Orbital Characteristics
        </h3>

        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-secondary)]">
                <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--color-text-tertiary)]">
                  Comet
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-[var(--color-text-tertiary)]">
                  Eccentricity
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-[var(--color-text-tertiary)]">
                  Inclination
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-[var(--color-text-tertiary)]">
                  Perihelion Dist.
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--color-text-tertiary)]">
                  Orbit Type
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedComets.map((comet) => {
                const isHyperbolic = comet.orbital.eccentricity > 1;
                const isRetrograde = comet.orbital.inclination > 90;

                // Determine orbit fate based on comet name and eccentricity
                let orbitType = '';
                if (comet.name === '3I/ATLAS') {
                  orbitType = 'Interstellar (passing through)';
                } else if (comet.name === 'K1 ATLAS') {
                  orbitType = 'Escaping (perturbed to hyperbolic)';
                } else if (comet.name === 'Wierzchos') {
                  orbitType = 'Being captured (e → 0.99997)';
                } else if (isHyperbolic) {
                  orbitType = 'Hyperbolic';
                } else {
                  orbitType = 'Elliptical (bound)';
                }

                return (
                  <tr
                    key={comet.designation}
                    className="border-b border-[var(--color-border-secondary)]"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: comet.color }}
                        />
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {comet.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[var(--color-text-primary)]">
                        {comet.orbital.eccentricity.toFixed(2)}
                      </span>
                      {isHyperbolic && (
                        <div className="text-[10px] text-purple-400 mt-0.5">
                          hyperbolic
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[var(--color-text-primary)]">
                        {comet.orbital.inclination.toFixed(1)}°
                      </span>
                      {isRetrograde && (
                        <div className="text-[10px] text-cyan-400 mt-0.5">
                          retrograde
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[var(--color-text-primary)]">
                        {comet.orbital.perihelion_distance.toFixed(2)} AU
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {orbitType}
                        {isRetrograde && ', retrograde'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: Cards */}
        <div className="md:hidden space-y-3">
          {sortedComets.map((comet) => {
            const isHyperbolic = comet.orbital.eccentricity > 1;
            const isRetrograde = comet.orbital.inclination > 90;

            return (
              <div
                key={comet.designation}
                className="bg-[var(--color-bg-primary)] rounded p-3 border border-[var(--color-border-secondary)]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: comet.color }}
                  />
                  <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                    {comet.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--color-text-tertiary)]">Eccentricity:</span>{' '}
                    <span className="font-mono text-[var(--color-text-primary)]">
                      {comet.orbital.eccentricity.toFixed(2)}
                    </span>
                    {isHyperbolic && (
                      <span className="text-[10px] text-purple-400 ml-1">(hyperbolic)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[var(--color-text-tertiary)]">Inclination:</span>{' '}
                    <span className="font-mono text-[var(--color-text-primary)]">
                      {comet.orbital.inclination.toFixed(1)}°
                    </span>
                    {isRetrograde && (
                      <span className="text-[10px] text-cyan-400 ml-1">(retrograde)</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded text-xs text-[var(--color-text-tertiary)] text-center">
        <p>
          <strong className="text-[var(--color-text-secondary)]">Why This Fall Is Special:</strong>{' '}
          Five comets from September 2025 through January 2026 is a rare astronomical alignment.
          3I/ATLAS stands out as only the 3rd confirmed interstellar object ever detected.
          K1 ATLAS is being ejected from the solar system after planetary perturbations, while Wierzchos is being gravitationally captured!
        </p>
      </div>
    </div>
  );
}
