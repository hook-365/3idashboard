import useSWR from 'swr';
import type { EnhancedCometData } from '@/types/enhanced-comet-data';

interface UseCometDataParams {
  smooth?: boolean;
  predict?: boolean;
  limit?: number;
  trendDays?: number;
  refresh?: boolean;
}

interface CometDataResponse {
  success: boolean;
  data: EnhancedCometData;
  metadata: {
    totalObservations: number;
    totalObservers: number;
    lightCurvePoints: number;
    smoothed: boolean;
    trendPeriodDays: number;
    processingTimeMs: number;
    dataSource: string;
    apiVersion: string;
    sources_active?: string[];
    enhanced_features: boolean;
  };
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
});

/**
 * SWR hook for comet data with automatic caching and revalidation
 *
 * Benefits:
 * - Automatic deduplication (same params = 1 request)
 * - Shared cache across components/pages
 * - Background revalidation keeps data fresh
 * - Optimistic UI updates
 */
export function useCometData(params?: UseCometDataParams) {
  // Build query string from params
  const queryParams = new URLSearchParams({
    smooth: params?.smooth ? 'true' : 'false',
    predict: params?.predict ? 'true' : 'false',
    limit: String(params?.limit || 200),
    trendDays: String(params?.trendDays || 30),
    ...(params?.refresh ? { refresh: 'true' } : {}),
  });

  const { data, error, isLoading, mutate } = useSWR<CometDataResponse>(
    `/api/comet-data?${queryParams}`,
    fetcher,
    {
      // Deduplicate requests within 5 seconds
      dedupingInterval: 5000,

      // Revalidate every 5 minutes in background
      refreshInterval: 300000,

      // Keep previous data while revalidating (no loading flash)
      keepPreviousData: true,

      // Revalidate when window regains focus
      revalidateOnFocus: true,

      // Retry on error
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  return {
    data: data?.data,
    stats: data?.data?.stats,
    observers: data?.data?.observers,
    metadata: data?.metadata,
    isLoading,
    error,
    refresh: mutate, // Manual refresh function
  };
}
