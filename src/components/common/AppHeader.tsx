'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import InfoTooltip from './InfoTooltip';

// Dynamically import ThemeSelector to avoid SSR issues
const ThemeSelector = dynamic(() => import('./ThemeSelector'), {
  ssr: false,
  loading: () => <div className="w-24 h-10"></div>,
});

interface SourceStatus {
  active: boolean;
  last_updated: string;
  error?: string;
}

interface AppHeaderProps {
  sourceStatus?: {
    cobs?: SourceStatus;
    jpl_horizons?: SourceStatus;
    jpl_ephemeris?: SourceStatus;
    theskylive?: SourceStatus;
    mpc?: SourceStatus;
  };
}

function formatTimeAgo(timestamp: string | undefined): string {
  if (!timestamp) return 'Never';

  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const milliseconds = now - then;

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export default function AppHeader({ sourceStatus: sourceStatusProp }: AppHeaderProps) {
  const [sourceStatus, setSourceStatus] = useState<AppHeaderProps['sourceStatus']>(sourceStatusProp);

  // Fetch source status if not provided via props
  useEffect(() => {
    if (!sourceStatusProp) {
      fetch('/api/comet-data?smooth=false&predict=false&limit=1')
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data?.source_status) {
            setSourceStatus(result.data.source_status);
          }
        })
        .catch(() => {
          // Silently fail - data status just won't show
        });
    } else {
      setSourceStatus(sourceStatusProp);
    }
  }, [sourceStatusProp]);

  return (
    <div className="bg-[var(--color-bg-primary)] border-b border-[var(--color-border-primary)]">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-6">
          {/* Left: Mission Control with Status */}
          <div className="flex items-start gap-3 flex-1">
            <span className="text-5xl">☄️</span>
            <div className="flex-1">
              <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                <h1 className="text-4xl font-bold cursor-pointer" style={{ background: 'var(--gradient-title)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  3I/Atlas Dashboard
                </h1>
              </Link>
              <p className="text-[var(--color-text-tertiary)] text-sm italic mt-1">
                Tracking the third interstellar object visiting our solar system
              </p>

              {/* Data Status */}
              {sourceStatus && (sourceStatus.cobs?.last_updated || sourceStatus.jpl_horizons?.last_updated) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[var(--color-text-tertiary)]">Data Sources:</span>

                  {/* COBS */}
                  <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <span className="inline-flex items-center">
                      COBS
                      <InfoTooltip
                        content="COBS (Comet Observation Database) - Global network of amateur and professional astronomers contributing brightness observations."
                        position="bottom"
                      />
                    </span>
                    <span className={`font-mono font-semibold ${sourceStatus.cobs?.active ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-error)]'}`}>{formatTimeAgo(sourceStatus.cobs?.last_updated)}</span>
                  </span>

                  {/* TSL */}
                  <span className="text-[var(--color-text-tertiary)]">•</span>
                  <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <span className="inline-flex items-center">
                      TSL
                      <InfoTooltip
                        content="TheSkyLive - Real-time astronomical data service providing current coordinates and orbital positions."
                        position="bottom"
                      />
                    </span>
                    <span className={`font-mono font-semibold ${sourceStatus.theskylive?.active ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-error)]'}`}>{formatTimeAgo(sourceStatus.theskylive?.last_updated)}</span>
                  </span>

                  {/* MPC */}
                  {sourceStatus.mpc?.last_updated && (
                    <>
                      <span className="text-[var(--color-text-tertiary)]">•</span>
                      <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                        <span className="inline-flex items-center">
                          MPC
                          <InfoTooltip
                            content="MPC (Minor Planet Center) - International authority for observational data on minor planets and comets."
                            position="bottom"
                          />
                        </span>
                        <span className={`font-mono font-semibold ${sourceStatus.mpc?.active ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-error)]'}`}>{formatTimeAgo(sourceStatus.mpc?.last_updated)}</span>
                      </span>
                    </>
                  )}

                  {/* JPL Vec */}
                  <span className="text-[var(--color-text-tertiary)]">•</span>
                  <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <span className="inline-flex items-center">
                      JPL-Vec
                      <InfoTooltip
                        content="JPL Horizons Vectors - NASA's orbital mechanics calculations (position and velocity)."
                        position="bottom"
                      />
                    </span>
                    <span className={`font-mono font-semibold ${sourceStatus.jpl_horizons?.active ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-warning)]'}`} title={sourceStatus.jpl_horizons?.error || 'NASA API temporarily unavailable - using TheSkyLive fallback data'}>{sourceStatus.jpl_horizons?.last_updated ? formatTimeAgo(sourceStatus.jpl_horizons.last_updated) : 'unavailable'}</span>
                  </span>

                  {/* JPL Eph */}
                  <span className="text-[var(--color-text-tertiary)]">•</span>
                  <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
                    <span className="inline-flex items-center">
                      JPL-Eph
                      <InfoTooltip
                        content="JPL Ephemeris - NASA's sky position predictions (RA/DEC coordinates)."
                        position="bottom"
                      />
                    </span>
                    <span className={`font-mono font-semibold ${sourceStatus.jpl_ephemeris?.active ? 'text-[var(--color-status-success)]' : 'text-[var(--color-status-warning)]'}`} title={sourceStatus.jpl_ephemeris?.error || 'NASA API temporarily unavailable - using TheSkyLive fallback coordinates'}>{sourceStatus.jpl_ephemeris?.last_updated ? formatTimeAgo(sourceStatus.jpl_ephemeris.last_updated) : 'unavailable'}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Theme Selector and Coffee Button */}
          <div className="flex items-center gap-3">
            <ThemeSelector />
            <a
              href="https://buymeacoffee.com/anthonyhook"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 border shadow-lg"
              style={{
                background: 'var(--gradient-button)',
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border-secondary)'
              }}
            >
              <span className="text-lg">☕</span>
              <span className="hidden sm:inline font-['Cookie'] text-lg tracking-wide">Buy me a coffee</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
