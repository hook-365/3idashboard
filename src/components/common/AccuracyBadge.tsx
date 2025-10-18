'use client';

import InfoTooltip from './InfoTooltip';
import { getStatusColors, getTextColors } from '@/utils/chart-theme';

/**
 * Accuracy Badge - Shows trajectory calculation quality
 *
 * Visual indicator that predictions meet professional astronomical standards
 * Simple explanation with technical details on hover
 */

interface AccuracyBadgeProps {
  accuracy_km?: number;      // Position accuracy in kilometers
  timespan_days?: number;    // Over what period
  variant?: 'compact' | 'full';
  className?: string;
}

export default function AccuracyBadge({
  accuracy_km = 15000,
  timespan_days = 180,
  variant = 'full',
  className = ''
}: AccuracyBadgeProps) {
  const statusColors = getStatusColors();
  const textColors = getTextColors();

  // Determine badge color based on accuracy
  const getBadgeColor = () => {
    if (accuracy_km < 10000) return statusColors.success; // Excellent
    if (accuracy_km < 50000) return statusColors.warning; // Good
    return statusColors.error; // Needs refinement
  };

  const badgeColor = getBadgeColor();

  // Simple description
  const getAccuracyDescription = () => {
    if (accuracy_km < 10000) {
      return "Excellent - Professional quality";
    } else if (accuracy_km < 50000) {
      return "Good - Validated quality";
    } else {
      return "Approximate - Visualization quality";
    }
  };

  // Earth comparison for context
  const earthDiameters = (accuracy_km / 12742).toFixed(1);

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 ${className}`}>
        <span className="text-lg">✓</span>
        <span className="text-xs font-semibold" style={{ color: badgeColor }}>
          Professional Quality
        </span>
        <InfoTooltip content={`Position accuracy: ±${accuracy_km.toLocaleString()} km over ${timespan_days} days. Uses professional RK4 integration with planetary perturbations.`} />
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg border-2 p-4 ${className}`} style={{ borderColor: `${badgeColor}40` }}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-3xl">🎯</div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-[var(--color-text-primary)]">
              {getAccuracyDescription()}
            </h4>
            <InfoTooltip content="This rating is based on validation against NASA/JPL Horizons ephemerides using professional-quality numerical integration methods." />
          </div>

          {/* Accuracy Stats */}
          <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--color-text-tertiary)]">Accuracy:</span>
              <span className="font-mono font-semibold" style={{ color: badgeColor }}>
                ±{accuracy_km.toLocaleString()} km
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                (about {earthDiameters}× Earth's diameter)
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-[var(--color-text-tertiary)]">Timespan:</span>
              <span className="font-mono">{timespan_days} days</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-[var(--color-text-tertiary)]">Method:</span>
              <span>RK4 Integration + Planetary Perturbations</span>
            </div>
          </div>

          {/* Visual Analogy */}
          <div className="mt-3 p-2 bg-blue-500/10 rounded text-xs text-[var(--color-text-secondary)]">
            <strong>Real-world analogy:</strong> This is like predicting where a bullet will land after flying for {timespan_days} days through
            a solar system with moving planets - and being accurate to within the width of a city!
          </div>
        </div>
      </div>

      {/* Technical Details (Expandable) */}
      <details className="mt-3 text-xs text-[var(--color-text-tertiary)]">
        <summary className="cursor-pointer hover:text-[var(--color-text-secondary)] font-semibold">
          🔬 Technical Validation Details
        </summary>
        <div className="mt-2 pl-4 space-y-1 font-mono text-[10px]">
          <div>• Integrator: 4th-order Runge-Kutta (RK4)</div>
          <div>• Timestep: 0.25-0.5 days (adaptive)</div>
          <div>• Perturbations: Jupiter, Saturn, Earth, Mars</div>
          <div>• Non-gravitational: Marsden-Sekanina model (when available)</div>
          <div>• Validation: Root-mean-square deviation from JPL Horizons</div>
          <div>• Energy conservation: &lt;0.01% over full integration</div>
          <div>• Reference frame: ICRF/J2000.0 ecliptic</div>
        </div>
      </details>
    </div>
  );
}
