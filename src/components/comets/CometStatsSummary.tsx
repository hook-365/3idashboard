'use client';

interface CometStats {
  name: string;
  designation: string;
  magnitude: number;
  perihelion: {
    date: string;
    distance_au: number;
  };
  orbital: {
    eccentricity: number;
    inclination: number;
  };
  status: string;
  color: string;
}

interface CometStatsSummaryProps {
  comets: CometStats[];
}

export default function CometStatsSummary({ comets }: CometStatsSummaryProps) {
  // Categorize comets
  const hyperbolic = comets.filter(c => c.orbital.eccentricity >= 1.0);
  const elliptical = comets.filter(c => c.orbital.eccentricity < 1.0);
  const interstellar = comets.filter(c => c.name === '3I/ATLAS');
  const brightestComet = comets.reduce((prev, curr) =>
    curr.magnitude < prev.magnitude ? curr : prev
  );
  const closestPerihelion = comets.reduce((prev, curr) =>
    curr.perihelion.distance_au < prev.perihelion.distance_au ? curr : prev
  );

  // Calculate viewing window
  const dates = comets.map(c => new Date(c.perihelion.date));
  const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const monthsDiff = (latestDate.getMonth() - earliestDate.getMonth()) +
    (12 * (latestDate.getFullYear() - earliestDate.getFullYear()));

  return (
    <div className="bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 border-2 border-purple-500/30 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">☄️</span>
        <h3 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Active Comets Overview
        </h3>
      </div>

      {/* Key Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Comets */}
        <div className="bg-gradient-to-br from-blue-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border border-blue-500/30 hover:scale-105 transition-transform">
          <div className="text-4xl mb-2">☄️</div>
          <div className="text-3xl font-bold text-blue-400 mb-1">
            {comets.length}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            Active Comets
          </div>
        </div>

        {/* Interstellar Count */}
        <div className="bg-gradient-to-br from-purple-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border border-purple-500/30 hover:scale-105 transition-transform">
          <div className="text-4xl mb-2">🌌</div>
          <div className="text-3xl font-bold text-purple-400 mb-1">
            {interstellar.length}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            Truly Interstellar
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
            3rd ever detected
          </div>
        </div>

        {/* Viewing Window */}
        <div className="bg-gradient-to-br from-cyan-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border border-cyan-500/30 hover:scale-105 transition-transform">
          <div className="text-4xl mb-2">📅</div>
          <div className="text-3xl font-bold text-cyan-400 mb-1">
            {monthsDiff}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            Month Window
          </div>
        </div>

        {/* Brightest */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-5 text-center border border-yellow-500/30 hover:scale-105 transition-transform">
          <div className="text-4xl mb-2">✨</div>
          <div className="text-3xl font-bold text-yellow-400 mb-1">
            {brightestComet.magnitude.toFixed(1)}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            Brightest (mag)
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
            {brightestComet.name}
          </div>
        </div>
      </div>

      {/* Highlighted Comets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Brightest Comet */}
        <div className="bg-[var(--color-bg-secondary)]/60 rounded-lg p-4 border border-amber-400/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⭐</span>
            <h4 className="font-bold text-[var(--color-text-primary)]">
              Brightest: {brightestComet.name}
            </h4>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
            <div className="flex justify-between">
              <span>Magnitude:</span>
              <span className="text-amber-400 font-bold">{brightestComet.magnitude.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span>Perihelion:</span>
              <span className="text-[var(--color-text-primary)]">
                {new Date(brightestComet.perihelion.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Distance:</span>
              <span className="text-[var(--color-text-primary)]">
                {brightestComet.perihelion.distance_au.toFixed(2)} AU
              </span>
            </div>
          </div>
        </div>

        {/* Closest Perihelion */}
        <div className="bg-[var(--color-bg-secondary)]/60 rounded-lg p-4 border border-blue-400/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🔥</span>
            <h4 className="font-bold text-[var(--color-text-primary)]">
              Closest: {closestPerihelion.name}
            </h4>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
            <div className="flex justify-between">
              <span>Perihelion:</span>
              <span className="text-blue-400 font-bold">
                {closestPerihelion.perihelion.distance_au.toFixed(2)} AU
              </span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="text-[var(--color-text-primary)]">
                {new Date(closestPerihelion.perihelion.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Eccentricity:</span>
              <span className="text-[var(--color-text-primary)]">
                {closestPerihelion.orbital.eccentricity.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Orbit Type Breakdown */}
      <div className="mt-6 pt-4 border-t border-[var(--color-border-secondary)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-center md:justify-start gap-2 bg-[var(--color-bg-secondary)]/40 rounded-lg p-3">
            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            <span className="text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)] text-lg">{hyperbolic.length}</strong> Hyperbolic
              <span className="text-[var(--color-text-tertiary)] ml-1 text-xs">(e ≥ 1.0)</span>
            </span>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2 bg-[var(--color-bg-secondary)]/40 rounded-lg p-3">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)] text-lg">{elliptical.length}</strong> Elliptical
              <span className="text-[var(--color-text-tertiary)] ml-1 text-xs">(e &lt; 1.0)</span>
            </span>
          </div>
          <div className="flex flex-col items-center md:items-start justify-center bg-[var(--color-bg-secondary)]/40 rounded-lg p-3">
            <span className="text-[var(--color-text-tertiary)] text-xs mb-1">Viewing Window</span>
            <span className="text-[var(--color-text-primary)] font-bold">
              {earliestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {latestDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
