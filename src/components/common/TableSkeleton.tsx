import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

/**
 * Skeleton loader for observation tables
 * Provides shimmer effect while data is loading
 */
export default function TableSkeleton({
  rows = 8,
  columns = 8,
  className = '',
  showHeader = true
}: TableSkeletonProps) {
  // Stable widths for SSR/CSR consistency - no Math.random()
  const headerWidths = [75, 82, 68, 90, 78, 85, 72, 88, 80, 76];
  const cellWidths = [65, 72, 58, 85, 70, 78, 62, 88, 75, 68];

  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          {showHeader && (
            <thead className="bg-gray-700">
              <tr>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <th key={colIndex} className="px-6 py-4 text-left">
                    <div className="h-4 bg-gray-600 rounded animate-pulse" style={{ width: `${headerWidths[colIndex % headerWidths.length]}%` }}></div>
                  </th>
                ))}
              </tr>
            </thead>
          )}

          {/* Table Body */}
          <tbody className="divide-y divide-gray-700">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="animate-pulse">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-700 rounded" style={{ width: `${cellWidths[(rowIndex * columns + colIndex) % cellWidths.length]}%` }}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Mobile card-based skeleton for observation tables
 */
export function TableSkeletonMobile({ rows = 8, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="bg-gray-800 rounded-lg p-4 space-y-3 animate-pulse">
          {/* Header Row */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-6 w-16 bg-gray-700 rounded"></div>
              <div className="h-3 w-24 bg-gray-700 rounded"></div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-5 w-12 bg-gray-700 rounded-full"></div>
              <div className="h-5 w-16 bg-gray-700 rounded-full"></div>
            </div>
          </div>

          {/* Observer Info */}
          <div className="border-t border-gray-700 pt-3 space-y-2">
            <div className="h-4 w-32 bg-gray-700 rounded"></div>
            <div className="h-3 w-40 bg-gray-700 rounded"></div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-2 border-t border-gray-700 pt-3">
            <div className="h-3 w-full bg-gray-700 rounded"></div>
            <div className="h-3 w-full bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
