'use client';

import Link from 'next/link';

interface CometComparisonCardProps {
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
  lightCurve?: Array<{
    date: string;
    magnitude: number;
  }>;
  isInterstellar?: boolean;
  isFeatured?: boolean;
}

export default function CometComparisonCard({
  designation,
  name,
  magnitude,
  perihelion,
  current,
  orbital,
  status,
  color,
  lightCurve,
  isInterstellar,
  isFeatured
}: CometComparisonCardProps) {
  // Calculate days until perihelion
  const perihelionDate = new Date(perihelion.date);
  const now = new Date();
  const daysUntilPerihelion = Math.round((perihelionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isPastPerihelion = daysUntilPerihelion < 0;

  // Determine brightness trend from last 7 days of light curve
  let brightnessTrend: 'brightening' | 'fading' | 'stable' = 'stable';
  if (lightCurve && lightCurve.length >= 2) {
    const recent = lightCurve.slice(-7);
    const magChange = recent[recent.length - 1].magnitude - recent[0].magnitude;
    if (magChange < -0.1) brightnessTrend = 'brightening'; // Magnitude decreasing = brightening
    else if (magChange > 0.1) brightnessTrend = 'fading';
  }

  // Format perihelion date
  const perihelionDateStr = perihelionDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className={`rounded-lg p-6 transition-all hover:scale-105 ${
      isFeatured
        ? 'bg-gradient-to-br from-purple-600/20 to-[var(--color-bg-tertiary)] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
        : 'bg-gradient-to-br from-slate-600/10 to-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-accent)]'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
              {name}
            </h3>
            {isInterstellar && (
              <span className="px-2 py-0.5 bg-purple-600/20 border border-purple-500 text-purple-300 text-xs rounded-full font-semibold">
                Interstellar
              </span>
            )}
          </div>
          <div className="text-sm text-[var(--color-text-tertiary)]">
            {designation}
          </div>
        </div>
        <div
          className="w-4 h-4 rounded-full border-2"
          style={{ borderColor: color, backgroundColor: `${color}40` }}
          title={`Trail color in 3D view: ${color}`}
        />
      </div>

      {/* Current Magnitude */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold" style={{ color }}>
            {magnitude > 0 ? magnitude.toFixed(1) : 'N/A'}
          </span>
          <span className="text-sm text-[var(--color-text-tertiary)]">mag</span>
          {brightnessTrend !== 'stable' && (
            <span className={`text-sm ${
              brightnessTrend === 'brightening' ? 'text-green-400' : 'text-orange-400'
            }`}>
              {brightnessTrend === 'brightening' ? '↑ Brightening' : '↓ Fading'}
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
          {status}
        </div>
      </div>

      {/* Perihelion Info */}
      <div className="mb-4 p-3 bg-[var(--color-bg-primary)] rounded border border-[var(--color-border-secondary)]">
        <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Perihelion</div>
        <div className="text-sm text-[var(--color-text-primary)] font-semibold">
          {perihelionDateStr}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] mt-1">
          {perihelion.distance_au.toFixed(2)} AU from Sun
        </div>
        {!isPastPerihelion && daysUntilPerihelion >= 0 && (
          <div className="text-xs mt-2 px-2 py-1 bg-amber-900/20 border border-amber-700/50 rounded">
            <span className="text-amber-300 font-semibold">
              {daysUntilPerihelion} days
            </span>
            <span className="text-amber-400/80"> until perihelion</span>
          </div>
        )}
        {isPastPerihelion && (
          <div className="text-xs mt-2 px-2 py-1 bg-blue-900/20 border border-blue-700/50 rounded">
            <span className="text-blue-300">
              Perihelion passed {Math.abs(daysUntilPerihelion)} days ago
            </span>
          </div>
        )}
      </div>

      {/* Current Distances */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">From Earth</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {current.earthDistance.toFixed(2)} AU
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">From Sun</div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {current.sunDistance.toFixed(2)} AU
          </div>
        </div>
      </div>

      {/* Orbital Elements */}
      <div className="border-t border-[var(--color-border-secondary)] pt-3 mb-4">
        <div className="text-xs text-[var(--color-text-tertiary)] mb-2">Orbital Elements</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[var(--color-text-secondary)]">Eccentricity:</span>{' '}
            <span className="text-[var(--color-text-primary)] font-mono">
              {orbital.eccentricity.toFixed(2)}
            </span>
            {orbital.eccentricity > 1 && (
              <span className="ml-1 text-purple-400">(hyperbolic)</span>
            )}
          </div>
          <div>
            <span className="text-[var(--color-text-secondary)]">Inclination:</span>{' '}
            <span className="text-[var(--color-text-primary)] font-mono">
              {orbital.inclination.toFixed(1)}°
            </span>
            {orbital.inclination > 90 && (
              <span className="ml-1 text-cyan-400">(retrograde)</span>
            )}
          </div>
        </div>
      </div>

      {/* Mini Light Curve */}
      {lightCurve && lightCurve.length > 0 && (
        <div className="border-t border-[var(--color-border-secondary)] pt-3 mb-4">
          <div className="text-xs text-[var(--color-text-tertiary)] mb-2">Last 30 Days</div>
          <div className="h-12 flex items-end justify-between gap-0.5">
            {lightCurve.slice(-30).map((point, i) => {
              const maxMag = Math.max(...lightCurve.map(p => p.magnitude));
              const minMag = Math.min(...lightCurve.map(p => p.magnitude));
              const range = maxMag - minMag || 1;
              const height = ((maxMag - point.magnitude) / range) * 100;

              return (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.max(10, height)}%`,
                    backgroundColor: color,
                    opacity: 0.4 + (i / lightCurve.length) * 0.6
                  }}
                  title={`${point.date}: ${point.magnitude.toFixed(1)} mag`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Action Button */}
      {designation === 'C/2025 N1' ? (
        <Link
          href="/details"
          className="block w-full text-center px-4 py-2 bg-[var(--color-bg-primary)] hover:bg-[var(--color-border-accent)] border border-[var(--color-border-primary)] rounded text-sm font-semibold text-[var(--color-text-primary)] transition-colors"
        >
          View Full Details →
        </Link>
      ) : (
        <div className="text-xs text-[var(--color-text-tertiary)] text-center py-2">
          Observational data from published elements
        </div>
      )}
    </div>
  );
}
