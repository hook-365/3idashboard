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
  // Determine equipment needed based on magnitude (for extended objects like comets)
  const getEquipmentNeeded = (mag?: number): string => {
    if (!mag) return '8-10 inch telescope (200-254mm) minimum';
    if (mag <= 6) return 'Naked eye (dark skies only)';
    if (mag <= 10.5) return 'Binoculars (10x50) or small telescope';
    if (mag <= 11.5) return 'Medium telescope (6-8 inch / 150-200mm)';
    if (mag <= 12.5) return 'Large telescope (8-10 inch / 200-254mm)';
    return 'Very large telescope (12+ inch / 300mm+) or astrophotography';
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
    <div className={`${bgColor} border-l-4 rounded-lg p-4`}>
      <div className="flex items-center justify-between gap-4">
        {/* Left: Quick Status */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="text-sm text-[var(--color-text-tertiary)] font-medium">Can I see it tonight?</div>
            <div className={`text-xl font-bold ${textColor}`}>
              {isVisible ? (
                magnitude && magnitude <= 9 ? 'YES' : 'MAYBE'
              ) : (
                'NO'
              )}
            </div>
          </div>
        </div>

        {/* Right: Key Info */}
        <div className="text-right">
          {!isVisible ? (
            <>
              <div className="text-sm text-[var(--color-text-secondary)]">{reason}</div>
              <div className="text-sm font-semibold text-[var(--color-text-primary)] mt-1">
                Next visible: <span className={textColor}>{nextVisibleDate}</span>
              </div>
            </>
          ) : (
            <>
              {magnitude && (
                <>
                  <div className="text-sm text-[var(--color-text-secondary)]">Magnitude {magnitude.toFixed(1)}</div>
                  <div className="text-sm font-semibold text-[var(--color-text-primary)] mt-1">{equipment}</div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
