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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      case 'brightening': return '📈';
      case 'decelerating':
      case 'dimming': return '📉';
      case 'constant':
      case 'stable': return '➡️';
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

  const activeSources = Object.entries(data.source_health).filter(([, active]) => active).length;
  const totalSources = Object.keys(data.source_health).length;

  // Calculate current position on timeline based on orbital progress
  const calculateTimelinePosition = () => {
    // Key orbital parameters for 3I/ATLAS
    const discoveryDate = new Date('2025-07-01T00:00:00Z');
    const perihelionDate = new Date('2025-10-30T00:00:00Z');
    const departureDate = new Date('2025-12-31T00:00:00Z');

    const now = new Date();
    const totalMissionDays = (departureDate.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceDiscovery = (now.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysToPerihelion = (perihelionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Calculate mission progress as percentage (0-100%)
    const missionProgress = Math.min(Math.max((daysSinceDiscovery / totalMissionDays) * 100, 0), 100);

    // Calculate perihelion position for validation
    const perihelionDays = (perihelionDate.getTime() - discoveryDate.getTime()) / (1000 * 60 * 60 * 24);
    const perihelionProgress = (perihelionDays / totalMissionDays) * 100;

    return {
      missionProgress, // 0-100%
      perihelionProgress, // Should be ~63.5%
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Distance from Sun */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl mb-1">☀️</div>
          <div className="text-xl font-bold text-orange-400">
            {data.current_distance_au.toFixed(2)} AU
          </div>
          <div className="text-xs text-gray-400">Solar Distance</div>
        </div>

        {/* Distance from Earth */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl mb-1">🌍</div>
          <div className="text-xl font-bold text-blue-400">
            {data.geocentric_distance_au.toFixed(2)} AU
          </div>
          <div className="text-xs text-gray-400">Earth Distance</div>
        </div>

        {/* Current Velocity */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="text-2xl">⚡</div>
            <div className={`text-lg ${getTrendColor(data.velocity_trend)}`}>
              {getTrendIcon(data.velocity_trend)}
            </div>
          </div>
          <div className="text-xl font-bold text-cyan-400">
            {data.current_velocity_km_s.toFixed(1)} km/s
          </div>
          <div className="text-xs text-gray-400">
            Orbital Velocity {data.velocity_trend ? `(${data.velocity_trend})` : ''}
          </div>
        </div>

        {/* Current Brightness */}
        <div className="bg-gray-700 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="text-2xl">✨</div>
            <div className={`text-lg ${getTrendColor(data.brightness_trend)}`}>
              {getTrendIcon(data.brightness_trend)}
            </div>
          </div>
          <div className="text-xl font-bold text-yellow-400">
            {data.brightness_magnitude.toFixed(1)} mag
          </div>
          <div className="text-xs text-gray-400">
            Visual Magnitude {data.brightness_trend ? `(${data.brightness_trend})` : ''}
          </div>
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
      </div>

      {/* Orbital Journey - Visual Timeline */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4 text-purple-300 flex items-center gap-2">
          🚀 Orbital Journey
        </h3>

        {/* Simplified Timeline Container */}
        <div className="relative">
          {/* Timeline Progress Bar - Clean Design */}
          <div className="w-full h-4 bg-gray-600 rounded-full mb-6 relative overflow-hidden">
            {/* Progress Fill - Flat Front Edge */}
            <div
              className="absolute left-0 top-0 h-full bg-blue-500 bg-opacity-70 rounded-l-full transition-all duration-1000"
              style={{ width: `${timelinePos.missionProgress}%` }}
            >
              <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-l-full animate-pulse"></div>
            </div>


            {/* Current Position Indicator */}
            <div
              className="absolute top-0 h-full w-1 bg-white z-20 shadow-lg"
              style={{ left: `${timelinePos.missionProgress}%` }}
            ></div>
          </div>

          {/* Timeline Labels */}
          <div className="flex justify-between text-xs mb-4">
            <div className="text-green-300 font-semibold">
              <div>DISCOVERY</div>
              <div className="text-gray-400">July 1, 2025</div>
              <div className="text-green-200">✓ Complete</div>
            </div>

            <div className="text-yellow-300 font-semibold text-center">
              <div>PERIHELION</div>
              <div className="text-gray-400">Oct 30, 2025</div>
              <div className="text-yellow-200">{timelinePos.daysToPerihelion > 0 ? `${timelinePos.daysToPerihelion} days` : 'Active'}</div>
            </div>

            <div className="text-gray-400 font-semibold text-right">
              <div>DEPARTURE</div>
              <div className="text-gray-400">Dec 31, 2025</div>
              <div className="text-gray-400">⏳ Future</div>
            </div>
          </div>

          {/* Current Position Banner */}
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
              <div className="text-xs font-bold">📍 YOU ARE HERE</div>
              <div className="text-sm">Day {timelinePos.daysSinceDiscovery} • {timelinePos.missionProgress.toFixed(1)}% Complete</div>
            </div>
          </div>


          {/* Mission Details */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-green-900 bg-opacity-30 rounded p-2">
              <div className="text-green-300 font-semibold">Initial Tracking</div>
              <div className="text-gray-300">Trajectory confirmed</div>
            </div>
            <div className="bg-yellow-900 bg-opacity-30 rounded p-2 border border-yellow-600">
              <div className="text-yellow-300 font-semibold">Approaching Sun</div>
              <div className="text-gray-300">{data.current_distance_au.toFixed(2)} AU distance</div>
            </div>
            <div className="bg-gray-700 bg-opacity-30 rounded p-2">
              <div className="text-gray-400 font-semibold">Final Observations</div>
              <div className="text-gray-400">Beyond Neptune</div>
            </div>
          </div>

        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Level */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Activity Level</span>
            <span className="text-lg">{getActivityIcon(data.activity_level)}</span>
          </div>
          <div className={`text-lg font-bold ${getActivityColor(data.activity_level)}`}>
            {data.activity_level === 'INSUFFICIENT_DATA' ? 'N/A' : data.activity_level}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Physics-based brightness analysis
          </div>
        </div>

        {/* Data Sources Health */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Data Sources</span>
            <span className="text-sm font-bold text-green-400">
              {activeSources}/{totalSources} Active
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {Object.entries(data.source_health).map(([source, active]) => (
              <div key={source} className="text-center">
                <div className={`text-xs ${active ? 'text-green-400' : 'text-red-400'}`}>
                  {active ? '●' : '●'}
                </div>
                <div className="text-xs text-gray-400 uppercase">
                  {source === 'theskylive' ? 'TSL' : source}
                </div>
              </div>
            ))}
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