import useSWR from 'swr';
import type { ObserverInfo } from '@/services/cobs-api';

interface UseObserversParams {
  stats?: boolean;
  format?: 'list' | 'map' | 'both';
  minObs?: number;
  limit?: number;
  region?: string;
}

interface ObserversResponse {
  success: boolean;
  data: {
    list?: ObserverInfo[];
    map?: any;
  };
  statistics?: {
    regional: any;
    summary: {
      totalObservers: number;
      totalObservations: number;
      averageObservationsPerObserver: number;
      observersWithCoordinates: number;
    };
    topObservers: ObserverInfo[];
  };
  metadata: {
    totalObservers: number;
    filteredObservers: number;
    returnedObservers: number;
    filters: any;
    processingTimeMs: number;
    apiVersion: string;
  };
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
});

/**
 * SWR hook for observers data with automatic caching
 *
 * Caches observer data to avoid refetching when navigating between:
 * - Details page (observer map)
 * - Observations page (observer performance)
 * - Observers page (observer leaderboard)
 */
export function useObservers(params?: UseObserversParams) {
  const queryParams = new URLSearchParams({
    stats: params?.stats ? 'true' : 'false',
    format: params?.format || 'list',
    minObs: String(params?.minObs || 1),
    limit: String(params?.limit || 100),
    ...(params?.region ? { region: params.region } : {}),
  });

  const { data, error, isLoading, mutate } = useSWR<ObserversResponse>(
    `/api/observers?${queryParams}`,
    fetcher,
    {
      dedupingInterval: 5000,
      refreshInterval: 300000, // 5 minutes
      keepPreviousData: true,
      revalidateOnFocus: true,
      errorRetryCount: 3,
    }
  );

  return {
    observers: data?.data?.list || [],
    observerMap: data?.data?.map,
    statistics: data?.statistics,
    metadata: data?.metadata,
    isLoading,
    error,
    refresh: mutate,
  };
}
