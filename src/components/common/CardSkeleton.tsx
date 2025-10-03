import React from 'react';

interface CardSkeletonProps {
  className?: string;
  height?: number;
  showHeader?: boolean;
  rows?: number;
}

/**
 * Generic skeleton loader for card layouts
 * Flexible component for various card-based content
 */
export default function CardSkeleton({
  className = '',
  height,
  showHeader = true,
  rows = 3
}: CardSkeletonProps) {
  return (
    <div
      className={`bg-gray-800 rounded-lg p-6 ${className}`}
      style={height ? { height: `${height}px` } : undefined}
    >
      <div className="animate-pulse space-y-4">
        {/* Header */}
        {showHeader && (
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-700 rounded"></div>
            <div className="h-4 w-64 bg-gray-700 rounded"></div>
          </div>
        )}

        {/* Content Rows */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-full bg-gray-700 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Mission Status Widget
 */
export function MissionStatusSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700 ${className}`}>
      <div className="animate-pulse space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-8 w-64 bg-gray-700 rounded mx-auto"></div>
          <div className="h-4 w-48 bg-gray-700 rounded mx-auto"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <div className="h-4 w-24 bg-gray-600 rounded"></div>
              <div className="h-10 w-20 bg-gray-600 rounded"></div>
              <div className="h-3 w-32 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>

        {/* Status Indicators */}
        <div className="flex justify-around pt-4 border-t border-gray-700">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 bg-gray-600 rounded-full"></div>
              <div className="h-3 w-20 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for 3D Visualization
 */
export function VisualizationSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 h-[600px] ${className}`}>
      <div className="h-full flex flex-col animate-pulse">
        {/* Header */}
        <div className="mb-4 space-y-2">
          <div className="h-6 w-48 bg-gray-700 rounded"></div>
          <div className="h-4 w-64 bg-gray-700 rounded"></div>
        </div>

        {/* Visualization Area */}
        <div className="flex-1 bg-gray-900 rounded-lg flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent text-cyan-400 rounded-full"></div>
            <div className="h-4 w-48 bg-gray-700 rounded mx-auto"></div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for Observer Performance Dashboard
 */
export function ObserverDashboardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="animate-pulse space-y-2">
        <div className="h-8 w-64 bg-gray-700 rounded"></div>
        <div className="h-4 w-96 bg-gray-700 rounded"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-6 space-y-3">
            <div className="h-5 w-32 bg-gray-700 rounded"></div>
            <div className="h-10 w-20 bg-gray-700 rounded"></div>
            <div className="h-3 w-40 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 bg-gray-700 rounded-full"></div>
                <div className="h-4 w-32 bg-gray-700 rounded"></div>
              </div>
              <div className="h-4 w-16 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
