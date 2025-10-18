'use client';

import { useState, useEffect } from 'react';
import { getChartColors, getStatusColors } from '@/utils/chart-theme';
import { formatSkyPosition } from '@/utils/formatCoordinates';
import InfoTooltip from '@/components/common/InfoTooltip';
import { formatDistance, formatLargeNumber, auToMiles, auToKm } from '@/utils/unit-conversions';

export interface MissionStatusData {
  current_distance_au: number;
  days_to_perihelion: number;
  current_velocity_km_s: number;
  velocity_trend?: 'accelerating' | 'constant' | 'decelerating';
  brightness_trend?: 'brightening' | 'stable' | 'dimming';
  activity_level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'INSUFFICIENT_DATA';
  source_health: {
    cobs: boolean;
    jpl: boolean;
    theskylive: boolean;
  };
  last_update: string;
  brightness_magnitude: number;
  geocentric_distance_au: number;
  jpl_ephemeris?: {
    current_position?: {
      ra: number;
      dec: number;
      last_updated: string;
    };
  };
}

interface VisibilityData {
  isVisible: boolean;
  magnitude?: number;
  nextVisibleDate?: string;
  reason?: string;
}

interface MissionStatusWidgetProps {
  data?: MissionStatusData;
  loading?: boolean;
  simplified?: boolean; // When true, hides technical metrics for overview page
  visibilityData?: VisibilityData;
}

export default function MissionStatusWidget({ data, loading, simplified = false, visibilityData }: MissionStatusWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get theme colors
  const chartColors = getChartColors();
  const statusColors = getStatusColors();

  useEffect(() => {
    // Update every minute instead of every second
    // Only update when minutes actually change
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Changed from 1s to 60s (60000ms)

    return () => clearInterval(timer);
  }, []);

  if (loading || !data) {
    return (
      <div className="bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] rounded-lg p-6 border border-[var(--color-border-secondary)]">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-48 bg-[var(--color-bg-tertiary)] rounded"></div>
            <div className="h-4 w-24 bg-[var(--color-bg-tertiary)] rounded"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-[var(--color-bg-tertiary)] rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const perihelionDate = new Date('2025-10-30T00:00:00Z');
  const timeUntilPerihelion = perihelionDate.getTime() - currentTime.getTime();
  const daysUntilPerihelion = Math.floor(timeUntilPerihelion / (1000 * 60 * 60 * 24));
  const hoursUntilPerihelion = Math.floor((timeUntilPerihelion % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-[var(--color-status-success)]';
      case 'MODERATE': return 'text-[var(--color-status-warning)]';
      case 'HIGH': return 'text-[var(--color-chart-quinary)]';
      case 'EXTREME': return 'text-[var(--color-status-error)]';
      case 'INSUFFICIENT_DATA': return 'text-[var(--color-text-tertiary)]';
      default: return 'text-[var(--color-text-tertiary)]';
    }
  };

  const getActivityIcon = (level: string) => {
    switch (level) {
      case 'LOW': return '🟢';
      case 'MODERATE': return '🟡';
      case 'HIGH': return '🟠';
      case 'EXTREME': return '🔴';
      case 'INSUFFICIENT_DATA': return '❓';
      default: return '⚪';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'accelerating':
      case 'brightening': return '↗️';
      case 'decelerating':
      case 'dimming': return '↘️';
      case 'constant':
      case 'stable': return '→';
      default: return '❓';
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'accelerating':
      case 'brightening': return 'text-[var(--color-status-success)]';
      case 'decelerating':
      case 'dimming': return 'text-[var(--color-status-error)]';
      case 'constant':
      case 'stable': return 'text-[var(--color-status-warning)]';
      default: return 'text-[var(--color-text-tertiary)]';
    }
  };

  // Calculate current position on timeline based on orbital progress
  const calculateTimelinePosition = () => {
    // Key orbital parameters for 3I/ATLAS
    const discoveryDate = new Date('2025-07-01T00:00:00Z');
    const marsEncounterStart = new Date('2025-10-03T00:00:00Z');
    const marsEncounterEnd = new Date('2025-10-07T00:00:00Z');
    const earthBlackoutStart = new Date('2025-10-01T00:00:00Z');
    const perihelionDate = new Date('2025-10-30T00:00:00Z');
    const earthBlackoutEnd = new Date('2025-11-09T00:00:00Z');
    const earthVisibilityReturn = new Date('2025-11-15T00:00:00Z');
    const juiceStart = new Date('2025-11-02T00:00:00Z');
    const juiceEnd = new Date('2025-11-25T00:00:00Z');
    const departureDate = new Date('2025-12-31T00:00:00Z');

    const now = new Date();
    const totalMissionDays = (departureDate.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceDiscovery = (now.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysToPerihelion = (perihelionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Calculate mission progress as percentage (0-100%)
    const missionProgress = Math.min(Math.max((daysSinceDiscovery / totalMissionDays) * 100, 0), 100);

    // Calculate positions for all milestones
    const calcProgress = (date: Date) => ((date.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60 * 24) / totalMissionDays) * 100;

    return {
      missionProgress, // 0-100%
      perihelionProgress: calcProgress(perihelionDate),
      marsEncounterStartProgress: calcProgress(marsEncounterStart),
      marsEncounterEndProgress: calcProgress(marsEncounterEnd),
      earthBlackoutStartProgress: calcProgress(earthBlackoutStart),
      earthBlackoutEndProgress: calcProgress(earthBlackoutEnd),
      earthVisibilityReturnProgress: calcProgress(earthVisibilityReturn),
      juiceStartProgress: calcProgress(juiceStart),
      juiceEndProgress: calcProgress(juiceEnd),
      daysSinceDiscovery: Math.floor(daysSinceDiscovery),
      daysToPerihelion: Math.floor(daysToPerihelion),
      phase: missionProgress < 33 ? 'discovery' :
             missionProgress < 75 ? 'approach' : 'departure'
    };
  };

  const timelinePos = calculateTimelinePosition();

  return (
    <div className="bg-gradient-to-r from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] rounded-lg p-6 border border-[var(--color-border-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            🚀 3I/ATLAS Mission Control
          </h2>
          <p className="text-[var(--color-text-tertiary)] text-sm">
            Real-time interstellar comet tracking dashboard
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--color-text-tertiary)]">Live UTC</div>
          <div className="font-mono text-[var(--color-status-success)]">
            {currentTime.toISOString().slice(11, 19)}
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className={`grid ${simplified ? 'grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'} gap-2 md:gap-4 ${simplified ? 'mb-4' : 'mb-6'}`}>
        {/* Current Brightness */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 md:p-5 text-center border border-yellow-500/30 hover:scale-105 transition-transform">
          <div className="flex items-center justify-center gap-1 mb-2">
            <div className="text-3xl md:text-4xl">🌟</div>
            <div className={`text-lg ${getTrendColor(data.brightness_trend)}`}>
              {getTrendIcon(data.brightness_trend)}
            </div>
          </div>
          <div className="text-xl md:text-2xl font-bold text-yellow-400 mb-1">
            {data.brightness_magnitude.toFixed(1)}
            <span className="inline-flex items-center">
              {' '}mag
              <InfoTooltip
                content="Magnitude - Astronomical brightness scale. Lower numbers = brighter objects. Each whole number represents 2.5x brightness difference. Naked eye limit is ~6.0 mag in dark skies."
                position="bottom"
              />
            </span>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">
            Current Magnitude
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-2">Lower = Brighter</div>
        </div>

        {/* Perihelion Countdown - Show in simplified mode instead of velocity */}
        {simplified && (
          <div className="bg-gradient-to-br from-orange-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 md:p-5 text-center border border-orange-500/30 hover:scale-105 transition-transform">
            <div className="text-3xl md:text-4xl mb-2">🎯</div>
            <div className="text-xl md:text-2xl font-bold text-orange-400 mb-1">
              {daysUntilPerihelion}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">Days to Perihelion</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-2">Oct 30, 2025</div>
          </div>
        )}

        {/* Distance from Sun */}
        <div className="bg-gradient-to-br from-orange-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 md:p-5 text-center border border-orange-500/30 hover:scale-105 transition-transform">
          <div className="text-3xl md:text-4xl mb-2">☀️</div>
          <div className="text-xl md:text-2xl font-bold text-orange-400 mb-1">
            {data.current_distance_au.toFixed(2)}
            <span className="inline-flex items-center">
              {' '}AU
              <InfoTooltip
                content="AU (Astronomical Unit) - The average distance from Earth to the Sun, about 93 million miles or 150 million kilometers. Used to measure distances within our solar system."
                position="bottom"
              />
            </span>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)]">Current Distance</div>
          {!simplified && (
            <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
              ~{formatLargeNumber(auToMiles(data.current_distance_au))} mi • {formatLargeNumber(auToKm(data.current_distance_au))} km
            </div>
          )}
        </div>

        {/* Activity Level */}
        <div className="bg-gradient-to-br from-green-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 md:p-5 text-center border border-green-500/30 hover:scale-105 transition-transform">
          <div className="text-3xl md:text-4xl mb-2">{getActivityIcon(data.activity_level)}</div>
          <div className={`text-xl md:text-2xl font-bold mb-1 ${getActivityColor(data.activity_level)}`}>
            {data.activity_level === 'INSUFFICIENT_DATA' ? 'N/A' : data.activity_level}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] inline-flex items-center justify-center">
            Activity Level
            <InfoTooltip
              content="Activity measures how much gas and dust the comet is releasing. EXTREME = very active outgassing visible in telescopes. HIGH = strong coma development. MODERATE = tail structure visible in photography (not visual). LOW = minimal outgassing."
              position="bottom"
            />
          </div>
          {!simplified && (
            <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
              {data.activity_level === 'EXTREME' ? 'Very active outgassing' :
               data.activity_level === 'HIGH' ? 'Strong coma visible' :
               data.activity_level === 'MODERATE' ? 'Tail (photography only)' :
               data.activity_level === 'LOW' ? 'Minimal outgassing' :
               'Needs more data'}
            </div>
          )}
        </div>

        {/* Can I See It Tonight - Show in simplified mode */}
        {simplified && visibilityData && (
          <div className={`bg-gradient-to-br ${
            visibilityData.isVisible
              ? visibilityData.magnitude && visibilityData.magnitude <= 9
                ? 'from-emerald-600/20 border-emerald-500/30'
                : 'from-amber-600/20 border-amber-500/30'
              : 'from-red-600/20 border-red-500/30'
          } to-[var(--color-bg-tertiary)] rounded-lg p-4 md:p-5 text-center border hover:scale-105 transition-transform`}>
            <div className="text-3xl md:text-4xl mb-2">
              {visibilityData.isVisible
                ? visibilityData.magnitude && visibilityData.magnitude <= 9 ? '🟢' : '🟡'
                : '🔴'}
            </div>
            <div className={`text-xl md:text-2xl font-bold mb-1 ${
              visibilityData.isVisible
                ? visibilityData.magnitude && visibilityData.magnitude <= 9
                  ? 'text-emerald-400'
                  : 'text-amber-400'
                : 'text-red-400'
            }`}>
              {visibilityData.isVisible
                ? visibilityData.magnitude && visibilityData.magnitude <= 9 ? 'YES' : 'MAYBE'
                : 'NO'}
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">
              Visible Tonight?
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
              {visibilityData.isVisible
                ? visibilityData.magnitude ? `${visibilityData.magnitude.toFixed(1)} mag` : 'Check equipment'
                : visibilityData.nextVisibleDate || 'Check back later'}
            </div>
          </div>
        )}

        {/* Show these only when NOT simplified */}
        {!simplified && (
          <>
            {/* Distance from Earth */}
            <div className="bg-gradient-to-br from-blue-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 md:p-5 text-center border border-blue-500/30 hover:scale-105 transition-transform">
              <div className="text-3xl md:text-4xl mb-2">🌍</div>
              <div className="text-xl md:text-2xl font-bold text-blue-400 mb-1">
                {data.geocentric_distance_au.toFixed(2)} AU
              </div>
              <div className="text-sm text-[var(--color-text-secondary)]">Distance from Earth</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
                ~{formatLargeNumber(auToMiles(data.geocentric_distance_au))} mi • {formatLargeNumber(auToKm(data.geocentric_distance_au))} km
              </div>
            </div>

            {/* Current Velocity */}
            <div className="bg-gradient-to-br from-red-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 md:p-5 text-center border border-red-500/30 hover:scale-105 transition-transform">
              <div className="flex items-center justify-center gap-1 mb-2">
                <div className="text-3xl md:text-4xl">🚀</div>
                <div className={`text-lg ${getTrendColor(data.velocity_trend)}`}>
                  {getTrendIcon(data.velocity_trend)}
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-red-400 mb-1">
                {data.current_velocity_km_s.toFixed(1)} km/s
              </div>
              <div className="text-sm text-[var(--color-text-secondary)]">
                Current Speed {data.velocity_trend ? `(${data.velocity_trend})` : ''}
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-2">
                {(data.current_velocity_km_s * 2237).toLocaleString('en-US', {maximumFractionDigits: 0})} mph • {(data.current_velocity_km_s * 3600).toLocaleString('en-US', {maximumFractionDigits: 0})} km/h
              </div>
            </div>

            {/* Sky Position */}
            {data.jpl_ephemeris?.current_position && (
              <div className="bg-gradient-to-br from-cyan-600/20 to-[var(--color-bg-tertiary)] rounded-lg p-4 md:p-5 text-center border border-cyan-500/30 hover:scale-105 transition-transform">
                <div className="text-3xl md:text-4xl mb-2">🎯</div>
                <div className="text-lg md:text-xl font-bold text-cyan-400 mb-1">
                  {formatSkyPosition(
                    data.jpl_ephemeris.current_position.ra,
                    data.jpl_ephemeris.current_position.dec
                  ).ra}
                </div>
                <div className="text-lg md:text-xl font-bold text-cyan-400 mb-1">
                  {formatSkyPosition(
                    data.jpl_ephemeris.current_position.ra,
                    data.jpl_ephemeris.current_position.dec
                  ).dec}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">Sky Position</div>
                <div className="text-xs text-[var(--color-text-tertiary)] mt-2 inline-flex items-center justify-center">
                  RA / DEC
                  <InfoTooltip
                    content="RA/DEC (Right Ascension/Declination) - Celestial coordinates that tell you where to point your telescope. Like longitude/latitude for the night sky. Use a planetarium app to convert to horizon coordinates for your location."
                    position="bottom"
                  />
                  {' '}(JPL)
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Perihelion Countdown - Hide in simplified mode */}
      {!simplified && (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-4 mb-6 text-center">
        <div className="text-lg font-semibold text-[var(--color-text-primary)] mb-2 inline-flex items-center justify-center">
          🎯 Perihelion
          <InfoTooltip
            content="Perihelion - The closest point in a comet's orbit to the Sun. From Greek 'peri' (near) + 'helios' (sun). At perihelion, intense solar heating causes maximum outgassing and brightness."
            position="bottom"
          />
          {' '}Approach Countdown
        </div>
        <div className="flex justify-center items-baseline gap-4 text-[var(--color-text-primary)]">
          <div>
            <div className="text-3xl font-bold text-[var(--color-chart-primary)]">{daysUntilPerihelion}</div>
            <div className="text-xs">Days</div>
          </div>
          <div>
            <div className="text-xl font-bold text-[var(--color-chart-quaternary)]">{hoursUntilPerihelion}</div>
            <div className="text-xs">Hours</div>
          </div>
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] mt-2">
          Closest approach: October 30, 2025 00:00 UTC
        </div>
        <div className="mt-3 text-sm text-[var(--color-text-secondary)] max-w-2xl mx-auto">
          At perihelion, intense solar heat triggers peak outgassing and brightness, revealing 3I/ATLAS&apos;s composition and allowing scientists to study material from another star system.
        </div>
      </div>
      )}

      {/* Key Events Timeline - Hide in simplified mode */}
      {!simplified && (
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 text-[var(--color-text-heading)]">
          📅 Key Events
        </h3>

        {/* Timeline Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 text-xs text-[var(--color-text-secondary)]">
            <span>Day {timelinePos.daysSinceDiscovery}</span>
            <span>{Math.floor((new Date('2025-12-31').getTime() - new Date('2025-07-01').getTime()) / (1000 * 60 * 60 * 24))} Days</span>
          </div>

          {/* Comet indicator above progress bar */}
          <div className="relative w-full h-8 mb-1">
            <div
              className="absolute -bottom-1 flex items-center gap-2 transition-all duration-1000"
              style={{ left: `calc(${timelinePos.missionProgress}% - 16px)` }}
              title="Current Position"
            >
              <span className="text-2xl animate-pulse">☄️</span>
              <div className="flex flex-col">
                <span className="text-[var(--color-status-success)] font-bold text-xs whitespace-nowrap bg-[var(--color-status-success)]/10 px-2 py-0.5 rounded border border-[var(--color-status-success)]/30">
                  YOU ARE HERE
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="relative w-full h-3 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
            {/* Progress Fill */}
            <div
              className="absolute left-0 top-0 h-full bg-[var(--color-chart-primary)] transition-all duration-1000"
              style={{ width: `${timelinePos.missionProgress}%` }}
            ></div>

            {/* Not Visible from Earth Region - Shaded area */}
            <div
              className="absolute top-0 h-full bg-[var(--color-chart-blackout)] z-5"
              style={{
                left: `${timelinePos.earthBlackoutStartProgress}%`,
                width: `${timelinePos.earthBlackoutEndProgress - timelinePos.earthBlackoutStartProgress}%`
              }}
              title="Not Visible from Earth - Oct 1 to Nov 9"
            ></div>

            {/* Current Position Marker - White pulsing */}
            <div
              className="absolute top-0 h-full w-1 bg-white z-10 animate-pulse"
              style={{ left: `${timelinePos.missionProgress}%` }}
              title="Current Position"
            ></div>

            {/* Event Markers */}
            {/* Discovery Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-[var(--color-status-success)] z-10"
              style={{ left: '0%' }}
              title="Discovery - July 1"
            ></div>

            {/* Mars Encounter Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-[var(--color-chart-senary)] z-10"
              style={{ left: `${timelinePos.marsEncounterStartProgress}%` }}
              title="Mars Encounter - Oct 3-7"
            ></div>

            {/* Perihelion Marker */}
            <div
              className="absolute top-0 h-full w-2 z-10 bg-[var(--color-status-warning)]"
              style={{ left: `${timelinePos.perihelionProgress}%` }}
              title="Perihelion - Oct 30"
            ></div>

            {/* Juice Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-[var(--color-chart-quaternary)] z-10"
              style={{ left: `${timelinePos.juiceStartProgress}%` }}
              title="Juice Mission - Nov 2-25"
            ></div>

            {/* Earth Visibility Return Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-[var(--color-status-success)] z-10"
              style={{ left: `${timelinePos.earthVisibilityReturnProgress}%` }}
              title="Earth Visibility Returns - Nov 15"
            ></div>
          </div>
        </div>

        {/* Event Details Grid - Acts as Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Discovery */}
          <div className="bg-[var(--color-bg-tertiary)] bg-opacity-60 rounded p-3 border-l-4 border-[var(--color-status-success)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔭</span>
              <span className="font-semibold text-[var(--color-status-success)] text-sm">Discovery</span>
              {(() => {
                const daysUntil = Math.floor((new Date('2025-07-01').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil > 0 ? (
                  <span className="text-xs bg-[var(--color-status-success)] text-white px-1.5 py-0.5 rounded ml-auto">{daysUntil}d</span>
                ) : null;
              })()}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">July 1, 2025</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Predicted: ~13.0 mag</div>
          </div>

          {/* Mars Encounter */}
          <div className="bg-[var(--color-bg-tertiary)] bg-opacity-60 rounded p-3 border-l-4 border-[var(--color-chart-senary)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔴</span>
              <span className="font-semibold text-[var(--color-chart-senary)] text-sm">Mars Encounter</span>
              {(() => {
                const daysUntil = Math.floor((new Date('2025-10-03').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil > 0 ? (
                  <span className="text-xs bg-[var(--color-chart-senary)] text-white px-1.5 py-0.5 rounded ml-auto">{daysUntil}d</span>
                ) : null;
              })()}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Oct 3-7, 2025</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Predicted: ~11.5 mag</div>
          </div>

          {/* Perihelion */}
          <div className={`rounded p-3 border-l-4 border-[var(--color-status-warning)] ${timelinePos.daysToPerihelion > 0 ? 'bg-[var(--color-bg-tertiary)] bg-opacity-60' : 'bg-[var(--color-bg-tertiary)] bg-opacity-60'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎯</span>
              <span className="font-semibold text-[var(--color-status-warning)] text-sm">Perihelion</span>
              {timelinePos.daysToPerihelion > 0 && (
                <span className="text-xs bg-[var(--color-status-warning)] text-white px-1.5 py-0.5 rounded ml-auto font-bold">{timelinePos.daysToPerihelion}d</span>
              )}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Oct 30, 2025</div>
            <div className="text-xs font-semibold text-[var(--color-status-warning)] mt-1">Peak: ~10.5 mag (best viewing)</div>
          </div>

          {/* Juice Mission */}
          <div className="bg-[var(--color-bg-tertiary)] bg-opacity-60 rounded p-3 border-l-4 border-[var(--color-chart-quaternary)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🛰️</span>
              <span className="font-semibold text-[var(--color-chart-quaternary)] text-sm">Juice Mission</span>
              {(() => {
                const daysUntil = Math.floor((new Date('2025-11-02').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil > 0 ? (
                  <span className="text-xs bg-[var(--color-chart-quaternary)] text-white px-1.5 py-0.5 rounded ml-auto">{daysUntil}d</span>
                ) : null;
              })()}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Nov 2-25, 2025</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Predicted: ~11.0-11.5 mag</div>
          </div>

          {/* Not Visible from Earth */}
          <div className="bg-[var(--color-bg-tertiary)] bg-opacity-60 rounded p-3 border-l-4 border-[var(--color-status-error)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌑</span>
              <span className="font-semibold text-[var(--color-status-error)] text-sm">Not Visible from Earth</span>
              {(() => {
                const daysUntil = Math.floor((new Date('2025-10-01').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil > 0 ? (
                  <span className="text-xs bg-[var(--color-status-error)] text-white px-1.5 py-0.5 rounded ml-auto">{daysUntil}d</span>
                ) : null;
              })()}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Oct 1 - Nov 9, 2025</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Too close to Sun in sky</div>
          </div>

          {/* Earth Visibility Returns */}
          <div className="bg-[var(--color-bg-tertiary)] bg-opacity-60 rounded p-3 border-l-4 border-[var(--color-status-success)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌅</span>
              <span className="font-semibold text-[var(--color-status-success)] text-sm">Visibility Returns</span>
              {(() => {
                const daysUntil = Math.floor((new Date('2025-11-15').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil > 0 ? (
                  <span className="text-xs bg-[var(--color-status-success)] text-white px-1.5 py-0.5 rounded ml-auto">{daysUntil}d</span>
                ) : null;
              })()}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Nov 15+, 2025</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Predicted: ~11.5-12.0 mag</div>
          </div>

          {/* Departure */}
          <div className="bg-[var(--color-bg-tertiary)] bg-opacity-60 rounded p-3 border-l-4 border-[var(--color-border-secondary)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌌</span>
              <span className="font-semibold text-[var(--color-text-primary)] text-sm">Departs</span>
              {(() => {
                const daysUntil = Math.floor((new Date('2025-12-31').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil > 0 ? (
                  <span className="text-xs bg-[var(--color-text-tertiary)] text-white px-1.5 py-0.5 rounded ml-auto">{daysUntil}d</span>
                ) : null;
              })()}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">Dec 31, 2025</div>
            <div className="text-xs text-[var(--color-text-tertiary)] mt-1">Predicted: ~13.0+ mag (faint)</div>
          </div>
        </div>
      </div>
      )}

      {/* Last Update */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border-secondary)] text-center">
        <div className="text-xs text-[var(--color-text-tertiary)]">
          Last data update: {new Date(data.last_update).toLocaleString()} UTC
        </div>
      </div>
    </div>
  );
}