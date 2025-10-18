/**
 * Current Position Banner Component
 * Displays the current sky position (RA/DEC) from JPL Ephemeris data
 * Theme-aware and accessible
 */

'use client';

import React from 'react';
import { formatSkyPosition } from '@/utils/formatCoordinates';

interface CurrentPositionBannerProps {
  ra: number;           // Right Ascension in decimal degrees
  dec: number;          // Declination in decimal degrees
  lastUpdated: string;  // ISO timestamp of last update
}

/**
 * Format timestamp as "X minutes/hours ago"
 */
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now.getTime() - updated.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export default function CurrentPositionBanner({
  ra,
  dec,
  lastUpdated,
}: CurrentPositionBannerProps) {
  const { ra: raFormatted, dec: decFormatted } = formatSkyPosition(ra, dec);
  const timeAgo = getTimeAgo(lastUpdated);

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-secondary)] rounded-lg p-4 mb-8">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {/* Icon */}
        <div className="text-2xl" aria-hidden="true">
          🎯
        </div>

        {/* Content */}
        <div className="text-center flex-1 min-w-[200px]">
          <div className="text-sm font-semibold text-[var(--color-text-secondary)] mb-1">
            Current Sky Position (JPL Ephemeris)
          </div>
          <div className="text-lg font-bold text-[var(--color-text-primary)] flex items-center justify-center gap-2 flex-wrap">
            <span>RA: {raFormatted}</span>
            <span className="text-[var(--color-text-tertiary)]">•</span>
            <span>DEC: {decFormatted}</span>
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
            Updated: {timeAgo}
          </div>

          {/* Visibility warning */}
          <div className="mt-3 pt-3 border-t border-[var(--color-border-secondary)]">
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-[var(--color-status-warning)]/10 border border-[var(--color-status-warning)]/30 rounded-full">
              <span className="text-[var(--color-status-warning)]">⚠️</span>
              <span className="text-[var(--color-text-secondary)]">
                <strong className="text-[var(--color-status-warning)]">Not currently visible from Earth</strong> - Too close to the Sun (solar elongation &lt; 30°)
              </span>
            </div>
          </div>
        </div>

        {/* Icon */}
        <div className="text-2xl" aria-hidden="true">
          ⏱️
        </div>
      </div>
    </div>
  );
}
