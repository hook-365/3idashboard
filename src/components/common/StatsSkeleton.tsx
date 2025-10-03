import React from 'react';

interface StatsSkeletonProps {
  columns?: number;
  className?: string;
  showHeader?: boolean;
  compact?: boolean;
}

/**
 * Skeleton loader for statistics cards
 * Used for BrightnessStats and similar stat displays
 */
export default function StatsSkeleton({
  columns = 4,
  className = '',
  showHeader = true,
  compact = false
}: StatsSkeletonProps) {
  if (compact) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {/* Header */}
          <div className="h-5 w-40 bg-gray-700 rounded"></div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-8 w-20 bg-gray-700 rounded mx-auto"></div>
                <div className="h-3 w-24 bg-gray-700 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="animate-pulse space-y-6">
        {/* Header */}
        {showHeader && (
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-700 rounded"></div>
            <div className="h-4 w-64 bg-gray-700 rounded"></div>
          </div>
        )}

        {/* Stats Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${columns} gap-4`}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="bg-gray-700 rounded-lg p-4 space-y-3">
              <div className="h-4 w-24 bg-gray-600 rounded"></div>
              <div className="h-8 w-16 bg-gray-600 rounded"></div>
              <div className="h-3 w-32 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>

        {/* Additional Info Section */}
        <div className="border-t border-gray-700 pt-4 space-y-3">
          <div className="h-4 w-32 bg-gray-700 rounded"></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-3 w-full bg-gray-700 rounded"></div>
            <div className="h-3 w-full bg-gray-700 rounded"></div>
            <div className="h-3 w-full bg-gray-700 rounded"></div>
            <div className="h-3 w-full bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for global collaboration stats section
 */
export function CollaborationStatsSkeleton({
  className = '',
  showDescription = false
}: {
  className?: string;
  showDescription?: boolean;
}) {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="animate-pulse space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="h-6 w-56 bg-gray-700 rounded"></div>
          {showDescription && (
            <div className="h-4 w-96 bg-gray-700 rounded"></div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-8 w-20 bg-gray-700 rounded mx-auto"></div>
              <div className="h-4 w-28 bg-gray-700 rounded mx-auto"></div>
            </div>
          ))}
        </div>

        {/* Chart Area */}
        <div className="mt-6 h-64 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}
