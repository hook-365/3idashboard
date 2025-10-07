'use client';

interface CanISeeItBannerProps {
  isVisible: boolean;
  magnitude?: number;
  nextVisibleDate?: string;
  reason?: string;
}

export default function CanISeeItBanner({
  isVisible,
  magnitude,
  nextVisibleDate = 'Late 2025',
  reason = 'Currently too close to the Sun'
}: CanISeeItBannerProps) {
  // Determine equipment needed based on magnitude
  const getEquipmentNeeded = (mag?: number): string => {
    if (!mag) return 'Telescope or strong binoculars';
    if (mag <= 6) return 'Naked eye (dark skies only)';
    if (mag <= 9) return 'Binoculars (7x50 or 10x50)';
    if (mag <= 12) return 'Small telescope (4-6 inch / 100-150mm)';
    return 'Large telescope (8+ inch / 200mm+)';
  };

  const equipment = getEquipmentNeeded(magnitude);

  // Color scheme based on visibility
  const bgColor = isVisible
    ? magnitude && magnitude <= 9
      ? 'bg-[var(--color-status-success)]/10 border-[var(--color-status-success)]/30'
      : 'bg-[var(--color-status-warning)]/10 border-[var(--color-status-warning)]/30'
    : 'bg-[var(--color-status-error)]/10 border-[var(--color-status-error)]/30';

  const textColor = isVisible
    ? magnitude && magnitude <= 9
      ? 'text-[var(--color-status-success)]'
      : 'text-[var(--color-status-warning)]'
    : 'text-[var(--color-status-error)]';

  const emoji = isVisible
    ? magnitude && magnitude <= 9 ? '🟢' : '🟡'
    : '🔴';

  return (
    <div className={`${bgColor} border-2 rounded-lg p-6`}>
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-3">
        <span>🔭</span> Can I See It Tonight?
      </h2>

      <div className="space-y-4">
        {/* Visibility status */}
        <div className={`text-xl font-semibold ${textColor} flex items-center gap-2`}>
          <span>{emoji}</span>
          {isVisible ? (
            magnitude && magnitude <= 9 ? 'YES - Observable!' : 'MAYBE - Difficult'
          ) : (
            'NO - Not Visible'
          )}
        </div>

        {/* Details */}
        {!isVisible ? (
          <>
            <p className="text-[var(--color-text-primary)]">
              3I/ATLAS is currently not observable from Earth.
            </p>
            <p className="text-[var(--color-text-secondary)]">
              <strong>Reason:</strong> {reason}
            </p>
            <p className="text-[var(--color-text-secondary)]">
              <strong>Next visibility:</strong> {nextVisibleDate}
            </p>
          </>
        ) : (
          <>
            <p className="text-[var(--color-text-primary)]">
              {magnitude && magnitude <= 9
                ? '3I/ATLAS is currently bright enough to observe!'
                : '3I/ATLAS is visible but requires dark skies and optical aid.'
              }
            </p>
            {magnitude && (
              <div className="space-y-2">
                <p className="text-[var(--color-text-secondary)]">
                  <strong>Current brightness:</strong> Magnitude {magnitude.toFixed(1)}
                  <span className="text-xs ml-2">(Lower = Brighter)</span>
                </p>
                <p className="text-[var(--color-text-secondary)]">
                  <strong>Equipment needed:</strong> {equipment}
                </p>
              </div>
            )}
          </>
        )}

        {/* Tips section */}
        <div className="mt-4 pt-4 border-t border-[var(--color-border-secondary)]">
          <p className="text-sm text-[var(--color-text-tertiary)]">
            <span>💡</span> <strong>Tip:</strong> {isVisible
              ? 'Look during astronomical twilight (when the sky is dark). Avoid nights with a bright moon.'
              : 'Set a reminder for the next visibility window. You can track the brightness predictions below.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}
