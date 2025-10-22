import useSWR from 'swr';

interface ActivityDataPoint {
  date: string;
  index: number;
  level: string;
  confidence: number;
}

interface ActivityResponse {
  success: boolean;
  data: {
    activityData: ActivityDataPoint[];
    currentActivity: {
      level: string;
      index: number;
      confidence: number;
      lastUpdated: string;
    };
  };
  metadata: {
    dataPoints: number;
    dateRange: {
      start: string;
      end: string;
    };
    processingTimeMs: number;
  };
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
});

/**
 * SWR hook for activity level data
 *
 * Caches physics-based activity calculations to avoid recomputation
 */
export function useActivity(days: number = 90) {
  const { data, error, isLoading, mutate } = useSWR<ActivityResponse>(
    `/api/simple-activity?days=${days}`,
    fetcher,
    {
      dedupingInterval: 5000,
      refreshInterval: 600000, // 10 minutes
      keepPreviousData: true,
      revalidateOnFocus: true,
    }
  );

  return {
    activityData: data?.data?.activityData || [],
    currentActivity: data?.data?.currentActivity,
    metadata: data?.metadata,
    isLoading,
    error,
    refresh: mutate,
  };
}
