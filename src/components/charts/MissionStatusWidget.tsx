'use client';

import { useState, useEffect } from 'react';

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
}

interface MissionStatusWidgetProps {
  data?: MissionStatusData;
  loading?: boolean;
}

export default function MissionStatusWidget({ data, loading }: MissionStatusWidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

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
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-48 bg-gray-600 rounded"></div>
            <div className="h-4 w-24 bg-gray-600 rounded"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-600 rounded"></div>
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
      case 'LOW': return 'text-green-400';
      case 'MODERATE': return 'text-yellow-400';
      case 'HIGH': return 'text-orange-400';
      case 'EXTREME': return 'text-red-400';
      case 'INSUFFICIENT_DATA': return 'text-gray-400';
      default: return 'text-gray-400';
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
      case 'brightening': return 'text-green-400';
      case 'decelerating':
      case 'dimming': return 'text-red-400';
      case 'constant':
      case 'stable': return 'text-yellow-400';
      default: return 'text-gray-400';
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
    <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 border border-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🚀 3I/ATLAS Mission Control
          </h2>
          <p className="text-gray-400 text-sm">
            Real-time interstellar comet tracking dashboard
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Live UTC</div>
          <div className="font-mono text-green-400">
            {currentTime.toISOString().slice(11, 19)}
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-6">
        {/* Distance from Sun */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl mb-1">☀️</div>
          <div className="text-xl font-bold text-orange-400">
            {data.current_distance_au.toFixed(2)} AU
          </div>
          <div className="text-xs text-gray-400">Distance from Sun</div>
          <div className="text-xs text-gray-500">1 AU = 93 million mi (150 million km)</div>
        </div>

        {/* Distance from Earth */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl mb-1">🌍</div>
          <div className="text-xl font-bold text-blue-400">
            {data.geocentric_distance_au.toFixed(2)} AU
          </div>
          <div className="text-xs text-gray-400">Distance from Earth</div>
          <div className="text-xs text-gray-500">1 AU = 93 million mi (150 million km)</div>
        </div>

        {/* Current Velocity */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="text-2xl">🚀</div>
            <div className={`text-lg ${getTrendColor(data.velocity_trend)}`}>
              {getTrendIcon(data.velocity_trend)}
            </div>
          </div>
          <div className="text-xl font-bold text-cyan-400">
            {data.current_velocity_km_s.toFixed(1)} km/s
          </div>
          <div className="text-xs text-gray-400">
            Current Speed {data.velocity_trend ? `(${data.velocity_trend})` : ''}
          </div>
          <div className="text-xs text-gray-500">
            {(data.current_velocity_km_s * 2237).toLocaleString('en-US', {maximumFractionDigits: 0})} mph • {(data.current_velocity_km_s * 3600).toLocaleString('en-US', {maximumFractionDigits: 0})} km/h
          </div>
        </div>

        {/* Current Brightness */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="text-2xl">🌟</div>
            <div className={`text-lg ${getTrendColor(data.brightness_trend)}`}>
              {getTrendIcon(data.brightness_trend)}
            </div>
          </div>
          <div className="text-xl font-bold text-yellow-400">
            {data.brightness_magnitude.toFixed(1)} mag
          </div>
          <div className="text-xs text-gray-400">
            Brightness {data.brightness_trend ? `(${data.brightness_trend})` : ''}
          </div>
          <div className="text-xs text-gray-500">Apparent brightness (lower = brighter)</div>
        </div>

        {/* Activity Level */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl mb-1">{getActivityIcon(data.activity_level)}</div>
          <div className={`text-xl font-bold ${getActivityColor(data.activity_level)}`}>
            {data.activity_level === 'INSUFFICIENT_DATA' ? 'N/A' : data.activity_level}
          </div>
          <div className="text-xs text-gray-400">Activity Level</div>
          <div className="text-xs text-gray-500">Based on brightness analysis</div>
        </div>
      </div>

      {/* Perihelion Countdown */}
      <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-4 mb-6 text-center">
        <div className="text-lg font-semibold text-white mb-2">
          🎯 Perihelion Approach Countdown
        </div>
        <div className="flex justify-center items-baseline gap-4 text-white">
          <div>
            <div className="text-3xl font-bold text-blue-300">{daysUntilPerihelion}</div>
            <div className="text-xs">Days</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-300">{hoursUntilPerihelion}</div>
            <div className="text-xs">Hours</div>
          </div>
        </div>
        <div className="text-xs text-blue-200 mt-2">
          Closest approach: October 30, 2025
        </div>
        <div className="mt-3 text-sm text-gray-300 max-w-2xl mx-auto">
          <strong>Perihelion</strong> is when the comet reaches its closest point to the Sun. This is critical because intense solar heat triggers peak outgassing and brightness, revealing the comet&apos;s composition and allowing scientists to study material from another star system.
        </div>
      </div>

      {/* Key Events Timeline */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 text-purple-300">
          📅 Key Events
        </h3>

        {/* Timeline Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 text-xs text-gray-300">
            <span>Day {timelinePos.daysSinceDiscovery}</span>
            <span className="text-blue-300 font-bold"><span className="animate-pulse">☄️</span> Current Position</span>
            <span>{Math.floor((new Date('2025-12-31').getTime() - new Date('2025-07-01').getTime()) / (1000 * 60 * 60 * 24))} Days</span>
          </div>

          {/* Progress Bar Container */}
          <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            {/* Progress Fill */}
            <div
              className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-1000"
              style={{ width: `${timelinePos.missionProgress}%` }}
            ></div>

            {/* Current Position Marker - White pulsing */}
            <div
              className="absolute top-0 h-full w-1 bg-white z-20 animate-pulse"
              style={{ left: `${timelinePos.missionProgress}%` }}
              title="Current Position"
            ></div>

            {/* Event Markers */}
            {/* Discovery Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-green-400 z-10"
              style={{ left: '0%' }}
              title="Discovery - July 1"
            ></div>

            {/* Mars Encounter Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-cyan-400 z-10"
              style={{ left: `${timelinePos.marsEncounterStartProgress}%` }}
              title="Mars Encounter - Oct 3-7"
            ></div>

            {/* Perihelion Marker */}
            <div
              className={`absolute top-0 h-full w-2 z-10 ${timelinePos.daysToPerihelion > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-400'}`}
              style={{ left: `${timelinePos.perihelionProgress}%` }}
              title="Perihelion - Oct 30"
            ></div>

            {/* Juice Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-purple-400 z-10"
              style={{ left: `${timelinePos.juiceStartProgress}%` }}
              title="Juice Mission - Nov 2-25"
            ></div>

            {/* Earth Visibility Return Marker */}
            <div
              className="absolute top-0 h-full w-1 bg-emerald-400 z-10"
              style={{ left: `${timelinePos.earthVisibilityReturnProgress}%` }}
              title="Earth Visibility Returns - Nov 15"
            ></div>
          </div>
        </div>

        {/* Event Details Grid - Acts as Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Discovery */}
          <div className="bg-gray-800 bg-opacity-40 rounded p-3 border-l-4 border-green-400">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔭</span>
              <span className="font-semibold text-green-300 text-sm">Discovery</span>
            </div>
            <div className="text-xs text-gray-300">July 1, 2025</div>
          </div>

          {/* Mars Encounter */}
          <div className="bg-gray-800 bg-opacity-40 rounded p-3 border-l-4 border-cyan-400">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔴</span>
              <span className="font-semibold text-cyan-300 text-sm">Mars Encounter</span>
            </div>
            <div className="text-xs text-gray-300">Oct 3-7, 2025</div>
          </div>

          {/* Perihelion */}
          <div className={`rounded p-3 border-l-4 border-yellow-400 ${timelinePos.daysToPerihelion > 0 ? 'bg-yellow-900 bg-opacity-40' : 'bg-gray-800 bg-opacity-40'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎯</span>
              <span className="font-semibold text-yellow-300 text-sm">Perihelion</span>
              {timelinePos.daysToPerihelion > 0 && (
                <span className="text-xs bg-yellow-600 text-yellow-100 px-1.5 py-0.5 rounded ml-auto">{timelinePos.daysToPerihelion}d</span>
              )}
            </div>
            <div className="text-xs text-gray-300">Oct 30, 2025</div>
          </div>

          {/* Juice Mission */}
          <div className="bg-gray-800 bg-opacity-40 rounded p-3 border-l-4 border-purple-400">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🛰️</span>
              <span className="font-semibold text-purple-300 text-sm">Juice Mission</span>
            </div>
            <div className="text-xs text-gray-300">Nov 2-25, 2025</div>
          </div>

          {/* Earth Visibility */}
          <div className="bg-gray-800 bg-opacity-40 rounded p-3 border-l-4 border-emerald-400">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌅</span>
              <span className="font-semibold text-emerald-300 text-sm">Earth Visible</span>
            </div>
            <div className="text-xs text-gray-300">Nov 15+, 2025</div>
          </div>

          {/* Departure */}
          <div className="bg-gray-800 bg-opacity-40 rounded p-3 border-l-4 border-gray-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🌌</span>
              <span className="font-semibold text-gray-300 text-sm">Departs</span>
            </div>
            <div className="text-xs text-gray-400">Dec 31, 2025</div>
          </div>
        </div>
      </div>

      {/* Last Update */}
      <div className="mt-4 pt-4 border-t border-gray-600 text-center">
        <div className="text-xs text-gray-400">
          Last data update: {new Date(data.last_update).toLocaleString()} UTC
        </div>
      </div>
    </div>
  );
}