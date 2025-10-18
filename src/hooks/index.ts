/**
 * SWR-powered data fetching hooks
 *
 * These hooks provide:
 * - Automatic request deduplication
 * - Shared cache across components and pages
 * - Background revalidation
 * - Optimistic UI updates
 * - Error retry logic
 *
 * Usage:
 * ```tsx
 * import { useCometData, useObservers } from '@/hooks';
 *
 * function MyComponent() {
 *   const { data, isLoading, error } = useCometData({ smooth: true, limit: 200 });
 *   const { observers } = useObservers({ stats: true });
 *
 *   if (isLoading) return <LoadingSkeleton />;
 *   if (error) return <ErrorDisplay error={error} />;
 *
 *   return <div>...</div>;
 * }
 * ```
 */

export { useCometData } from './useCometData';
export { useObservers } from './useObservers';
export { useActivity } from './useActivity';
export { useVelocity, useOrbitalVelocity } from './useVelocity';
