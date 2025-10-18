'use client';

import { useEffect, useState } from 'react';

interface SimpleSkyCompassProps {
  ra?: number;
  dec?: number;
  isVisible?: boolean;
  magnitude?: number;
}

// Helper function to determine compass direction from RA/DEC
function getCompassDirection(ra: number, dec: number, date: Date = new Date()): {
  primaryDirection: string;
  compassFull: string;
  timeGuidance: string;
  elevationGuidance: string;
  hemisphere: 'northern' | 'southern' | 'equatorial';
} {
  // Calculate Sun's RA (rough approximation)
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const sunRA = (dayOfYear * 360 / 365) % 360;

  // Hour angle: where object is relative to Sun
  let hourAngle = ra - sunRA;
  if (hourAngle < 0) hourAngle += 360;
  if (hourAngle > 180) hourAngle -= 360;

  // Determine E/W based on hour angle
  let ewDirection = '';
  if (hourAngle > -45 && hourAngle < 45) {
    ewDirection = ''; // Near Sun
  } else if (hourAngle >= 45 && hourAngle < 135) {
    ewDirection = 'E';
  } else if (hourAngle <= -45 && hourAngle > -135) {
    ewDirection = 'W';
  }

  // Determine N/S based on declination
  let nsDirection = '';
  if (Math.abs(dec) < 20) {
    nsDirection = ''; // Near equator
  } else if (dec > 0) {
    nsDirection = 'N';
  } else {
    nsDirection = 'S';
  }

  // Combine for primary direction
  const primary = nsDirection + ewDirection || 'Center';

  // Full compass direction
  const compassMap: { [key: string]: string } = {
    'N': 'North',
    'NE': 'Northeast',
    'E': 'East',
    'SE': 'Southeast',
    'S': 'South',
    'SW': 'Southwest',
    'W': 'West',
    'NW': 'Northwest',
    'Center': 'Near Sun'
  };

  // Time guidance
  let timeGuidance = '';
  if (hourAngle > -45 && hourAngle < 45) {
    timeGuidance = 'Near the Sun (not visible)';
  } else if (hourAngle >= 45 && hourAngle < 135) {
    timeGuidance = 'Morning sky before sunrise';
  } else if (hourAngle <= -45 && hourAngle > -135) {
    timeGuidance = 'Evening sky after sunset';
  } else {
    timeGuidance = 'Visible most of the night';
  }

  // Elevation guidance
  let elevationGuidance = '';
  const hemisphere = Math.abs(dec) < 20 ? 'equatorial' : (dec > 0 ? 'northern' : 'southern');

  if (Math.abs(dec) < 30) {
    elevationGuidance = 'Low on the horizon';
  } else if (Math.abs(dec) < 60) {
    elevationGuidance = 'Medium height in the sky';
  } else {
    elevationGuidance = 'High in the sky';
  }

  return {
    primaryDirection: primary,
    compassFull: compassMap[primary] || 'Unknown',
    timeGuidance,
    elevationGuidance,
    hemisphere
  };
}

export default function SimpleSkyCompass({ ra, dec, isVisible = true, magnitude }: SimpleSkyCompassProps) {
  const [direction, setDirection] = useState<ReturnType<typeof getCompassDirection> | null>(null);

  useEffect(() => {
    if (ra !== undefined && dec !== undefined) {
      setDirection(getCompassDirection(ra, dec));
    }
  }, [ra, dec]);

  if (!direction || ra === undefined || dec === undefined) {
    return (
      <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-8 text-center">
        <p className="text-[var(--color-text-tertiary)]">Loading position data...</p>
      </div>
    );
  }

  const angle = ((ra || 0) % 360) - 90; // Convert RA to compass rotation

  return (
    <div className="bg-[var(--color-bg-tertiary)] rounded-lg p-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
        <span>🧭</span> Where to Look Tonight
      </h3>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Compass Rose */}
        <div className="relative w-48 h-48 flex-shrink-0">
          {/* Outer circle */}
          <div className="absolute inset-0 border-4 border-[var(--color-border-primary)] rounded-full" />

          {/* Cardinal directions */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xl font-bold text-[var(--color-text-primary)]">N</span>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xl font-bold text-[var(--color-text-primary)]">S</span>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xl font-bold text-[var(--color-text-primary)]">W</span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xl font-bold text-[var(--color-text-primary)]">E</span>
          </div>

          {/* Comet marker */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="absolute top-8 text-3xl" style={{ transform: `rotate(${-angle}deg)` }}>
              ☄️
            </div>
          </div>

          {/* Center direction label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-[var(--color-bg-primary)] px-3 py-1 rounded-lg border border-[var(--color-border-secondary)]">
              <span className="text-2xl font-bold text-[var(--color-chart-primary)]">
                {direction.primaryDirection}
              </span>
            </div>
          </div>
        </div>

        {/* Direction details */}
        <div className="flex-1 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-1">Direction</h4>
            <p className="text-xl font-semibold text-[var(--color-text-primary)]">{direction.compassFull}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-1">When to Look</h4>
            <p className="text-[var(--color-text-primary)]">{direction.timeGuidance}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-1">Height in Sky</h4>
            <p className="text-[var(--color-text-primary)]">{direction.elevationGuidance}</p>
          </div>

          {!isVisible && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ Currently not visible from Earth (too close to the Sun)
              </p>
            </div>
          )}

          <div className="mt-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg text-xs text-[var(--color-text-tertiary)]">
            <span>📍</span> <strong>Note:</strong> Directions are approximate and based on celestial coordinates.
            For precise directions from your location, use a planetarium app with your GPS coordinates.
          </div>
        </div>
      </div>

      {/* Technical details (collapsible) */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-[var(--color-chart-primary)] hover:underline">
          Show technical coordinates →
        </summary>
        <div className="mt-3 p-4 bg-[var(--color-bg-secondary)] rounded-lg text-sm space-y-2">
          <div>
            <span className="text-[var(--color-text-tertiary)]">Right Ascension (RA):</span>{' '}
            <span className="font-mono text-[var(--color-text-primary)]">{ra.toFixed(2)}°</span>
          </div>
          <div>
            <span className="text-[var(--color-text-tertiary)]">Declination (DEC):</span>{' '}
            <span className="font-mono text-[var(--color-text-primary)]">{dec.toFixed(2)}°</span>
          </div>
        </div>
      </details>
    </div>
  );
}
