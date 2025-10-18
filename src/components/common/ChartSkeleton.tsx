import React from 'react';

interface ChartSkeletonProps {
  height?: number;
  className?: string;
  title?: string;
  showLegend?: boolean;
}

/**
 * Skeleton loader for chart components
 * Mimics the chart layout with shimmer effect
 */
export default function ChartSkeleton({
  height = 400,
  className = '',
  title,
  showLegend = true
}: ChartSkeletonProps) {
  return (
    <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-6 ${className}`}>
      {/* Chart Title */}
      {title && (
        <div className="mb-4">
          <div className="h-6 w-48 bg-[var(--color-bg-tertiary)] rounded animate-pulse"></div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex gap-4 mb-4 justify-center">
          <div className="flex items-center gap-2 animate-pulse">
            <div className="h-3 w-3 bg-[var(--color-bg-tertiary)] rounded"></div>
            <div className="h-3 w-20 bg-[var(--color-bg-tertiary)] rounded"></div>
          </div>
          <div className="flex items-center gap-2 animate-pulse">
            <div className="h-3 w-3 bg-[var(--color-bg-tertiary)] rounded"></div>
            <div className="h-3 w-24 bg-[var(--color-bg-tertiary)] rounded"></div>
          </div>
        </div>
      )}

      {/* Chart Area */}
      <div className="relative animate-pulse" style={{ height: `${height}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-8 bg-[var(--color-bg-tertiary)] rounded"></div>
          ))}
        </div>

        {/* Chart background with grid lines */}
        <div className="ml-14 mr-4 h-full border-l border-b border-[var(--color-border-primary)] relative">
          {/* Horizontal grid lines */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-[var(--color-border-primary)]/50"
              style={{ top: `${(i + 1) * 16.67}%` }}
            ></div>
          ))}

          {/* Simulated chart line */}
          <svg className="w-full h-full" style={{ opacity: 0.3 }}>
            <path
              d={`M 0,${height * 0.6} Q ${height * 0.25},${height * 0.4} ${height * 0.5},${height * 0.5} T ${height},${height * 0.3}`}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-[var(--color-text-secondary)]"
            />
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="ml-14 mr-4 flex justify-between mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-16 bg-[var(--color-bg-tertiary)] rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact chart skeleton for smaller visualizations
 */
export function ChartSkeletonCompact({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[var(--color-bg-secondary)] rounded-lg p-4 ${className}`}>
      <div className="h-48 flex items-end justify-between gap-1 animate-pulse">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-[var(--color-bg-tertiary)] rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}
