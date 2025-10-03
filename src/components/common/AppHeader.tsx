'use client';

import { useState, useEffect } from 'react';

interface SourceStatus {
  active: boolean;
  last_updated: string;
  error?: string;
}

interface AppHeaderProps {
  sourceStatus?: {
    cobs?: SourceStatus;
    jpl_horizons?: SourceStatus;
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
    <div className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-6">
          {/* Left: Mission Control with Status */}
          <div className="flex items-start gap-3">
            <span className="text-5xl">☄️</span>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
                3I/ATLAS Comet Dashboard
              </h1>
              <p className="text-gray-400 text-sm italic mt-1">
                Tracking the third interstellar object visiting our solar system
              </p>

              {/* Data Status */}
              {sourceStatus && (sourceStatus.cobs?.last_updated || sourceStatus.jpl_horizons?.last_updated) && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Data Status:</span>
                    <div className="flex items-center gap-1.5 text-green-400">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                      <span className="font-medium">Live</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-600">
                      COBS: <span className={`font-mono ${sourceStatus.cobs?.active ? 'text-green-400' : 'text-red-400'}`}>{formatTimeAgo(sourceStatus.cobs?.last_updated)}</span>
                    </span>
                    <span className="text-gray-600">
                      JPL: <span className={`font-mono ${sourceStatus.jpl_horizons?.active ? 'text-green-400' : 'text-red-400'}`}>{formatTimeAgo(sourceStatus.jpl_horizons?.last_updated)}</span>
                    </span>
                    <span className="text-gray-600">
                      TSL: <span className={`font-mono ${sourceStatus.theskylive?.active ? 'text-green-400' : 'text-red-400'}`}>{formatTimeAgo(sourceStatus.theskylive?.last_updated)}</span>
                    </span>
                    {sourceStatus.mpc?.last_updated && (
                      <span className="text-gray-600">
                        MPC: <span className={`font-mono ${sourceStatus.mpc?.active ? 'text-green-400' : 'text-red-400'}`}>{formatTimeAgo(sourceStatus.mpc?.last_updated)}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Coffee Button */}
          <a
            href="https://buymeacoffee.com/anthonyhook"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-600/90 to-yellow-500/90 hover:from-yellow-500 hover:to-yellow-400 text-white px-4 py-2 rounded-lg transition-all duration-300 border border-yellow-500/30 shadow-lg hover:shadow-yellow-500/20"
          >
            <span className="text-lg">☕</span>
            <span className="hidden sm:inline font-['Cookie'] text-lg tracking-wide">Buy me a coffee</span>
          </a>
        </div>
      </div>
    </div>
  );
}
