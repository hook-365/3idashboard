/**
 * Where To Look Card Component
 * Displays current sky position in an observer-friendly format
 * Includes solar elongation calculation and observability warnings
 * Theme-aware and accessible
 */

'use client';

import React, { useMemo } from 'react';
import { formatSkyPosition, calculateObservability, getDirectionGuidance } from '@/utils/formatCoordinates';

interface WhereToLookCardProps {
  position: {
    ra: number;           // Right Ascension in decimal degrees
    dec: number;          // Declination in decimal degrees
    lastUpdated: string;  // ISO timestamp of last update
  };
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

export default function WhereToLookCard({ position }: WhereToLookCardProps) {
  const { ra: raFormatted, dec: decFormatted } = formatSkyPosition(
    position.ra,
    position.dec
  );
  const timeAgo = getTimeAgo(position.lastUpdated);

  // Calculate observability status using current date
  const observability = useMemo(() => {
    return calculateObservability(position.ra, position.dec, new Date(position.lastUpdated));
  }, [position.ra, position.dec, position.lastUpdated]);

  // Get general direction guidance
  const directionGuidance = useMemo(() => {
    return getDirectionGuidance(position.ra, position.dec, new Date(position.lastUpdated));
  }, [position.ra, position.dec, position.lastUpdated]);

  // Determine status banner colors based on observability
  const getStatusStyles = () => {
    switch (observability.status) {
      case 'not-visible':
        return {
          bgClass: 'bg-[var(--color-status-error)]/15',
          border: 'var(--color-status-error)',
          text: 'var(--color-status-error)',
          icon: '⚠️'
        };
      case 'difficult':
        return {
          bgClass: 'bg-[var(--color-status-warning)]/15',
          border: 'var(--color-status-warning)',
          text: 'var(--color-status-warning)',
          icon: '⚠️'
        };
      case 'observable':
        return {
          bgClass: 'bg-[var(--color-status-success)]/15',
          border: 'var(--color-status-success)',
          text: 'var(--color-status-success)',
          icon: '✓'
        };
    }
  };

  const statusStyles = getStatusStyles();

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border-primary)] p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl" aria-hidden="true">
          🔭
        </span>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Where to Look Tonight
        </h3>
      </div>

      {/* Observability Status Banner */}
      <div
        className={`mb-4 p-3 rounded-lg border-2 ${statusStyles.bgClass}`}
        style={{
          borderColor: statusStyles.border
        }}
      >
        <div className="flex items-start gap-2">
          <span className="text-xl mt-0.5" aria-hidden="true">
            {statusStyles.icon}
          </span>
          <div className="flex-1">
            <div
              className="font-bold text-sm mb-1"
              style={{ color: statusStyles.text }}
            >
              {observability.statusText}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mb-2">
              {observability.reason}
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)]">
              Solar elongation: {observability.solarElongation.toFixed(1)}°
              {observability.bestViewingTime && (
                <div className="mt-1 text-[var(--color-text-secondary)]">
                  {observability.bestViewingTime}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cardinal Direction Compass */}
      <div className="mb-4 p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border-secondary)]">
        <div className="flex items-center gap-4">
          {/* Compass Rose */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 relative">
              {/* Compass background circle */}
              <div className="absolute inset-0 border-4 border-[var(--color-border-primary)] rounded-full"></div>

              {/* Cardinal directions */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* N */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-xs font-bold text-[var(--color-text-tertiary)]">
                    N
                  </div>
                  {/* E */}
                  <div className="absolute top-1/2 right-0 translate-x-1 -translate-y-1/2 text-xs font-bold text-[var(--color-text-tertiary)]">
                    E
                  </div>
                  {/* S */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-xs font-bold text-[var(--color-text-tertiary)]">
                    S
                  </div>
                  {/* W */}
                  <div className="absolute top-1/2 left-0 -translate-x-1 -translate-y-1/2 text-xs font-bold text-[var(--color-text-tertiary)]">
                    W
                  </div>

                  {/* Direction indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-2xl font-bold text-[var(--color-chart-primary)]">
                      {directionGuidance.primaryDirection}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Direction details */}
          <div className="flex-1 space-y-1">
            <div className="text-lg font-bold text-[var(--color-chart-primary)]">
              {directionGuidance.compass}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              {directionGuidance.timeGuidance}
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)]">
              {directionGuidance.elevationGuidance}
            </div>
          </div>
        </div>

        {/* Important note about general guidance */}
        <div className="mt-3 pt-3 border-t border-[var(--color-border-secondary)]">
          <p className="text-xs text-[var(--color-text-tertiary)] italic">
            📍 Directions are approximate and based on universal RA/DEC coordinates.
            For precise directions from your location, use a planetarium app with your GPS coordinates.
          </p>
        </div>
      </div>

      {/* Coordinates */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Right Ascension:
          </span>
          <span className="text-[var(--color-chart-primary)] font-mono font-semibold">
            {raFormatted}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Declination:
          </span>
          <span className="text-[var(--color-chart-tertiary)] font-mono font-semibold">
            {decFormatted}
          </span>
        </div>

        <div className="border-t border-[var(--color-border-secondary)] pt-3 mt-3">
          <div className="text-xs text-[var(--color-text-tertiary)] text-center">
            Last Updated: {timeAgo} (JPL)
          </div>
        </div>
      </div>
    </div>
  );
}
