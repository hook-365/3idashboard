import useSWR from 'swr';

interface VelocityDataPoint {
  date: string;
  value: number;
  confidence: number;
  dataPoints: number;
}

interface VelocityResponse {
  success: boolean;
  data: {
    velocityData: VelocityDataPoint[];
    type: string;
    parameters: {
      smoothingWindow: number;
      limit: number;
      days: number;
    };
  };
  metadata: {
    processingTimeMs: number;
    dataPoints: number;
    velocityType: string;
  };
  timestamp: string;
}

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`API error: ${r.status}`);
  return r.json();
});

/**
 * SWR hook for velocity data (brightness, coma, distance, etc.)
 *
 * Supports multiple velocity types with shared caching
 */
export function useVelocity(
  type: 'brightness' | 'coma' | 'distance' | 'activity' | 'observer' = 'brightness',
  params?: {
    smoothingWindow?: number;
    limit?: number;
    days?: number;
  }
) {
  const queryParams = new URLSearchParams({
    type,
    smoothingWindow: String(params?.smoothingWindow || 7),
    limit: String(params?.limit || 200),
    days: String(params?.days || 90),
  });

  const { data, error, isLoading, mutate } = useSWR<VelocityResponse>(
    `/api/velocity?${queryParams}`,
    fetcher,
    {
      dedupingInterval: 5000,
      refreshInterval: 600000, // 10 minutes
      keepPreviousData: true,
      revalidateOnFocus: true,
    }
  );

  return {
    velocityData: data?.data?.velocityData || [],
    metadata: data?.metadata,
    isLoading,
    error,
    refresh: mutate,
  };
}

interface OrbitalVelocityDataPoint {
  date: string;
  heliocentric_velocity: number;
  geocentric_velocity: number;
  uncertainty: number;
  source: string;
}

interface OrbitalVelocityResponse {
  success: boolean;
  data: {
    velocity_data: OrbitalVelocityDataPoint[];
    metadata: {
      historic_points: number;
      predicted_points: number;
      total_points: number;
    };
  };
  metadata: {
    cached: boolean;
    processingTimeMs: number;
  };
  timestamp: string;
}

/**
 * SWR hook for orbital velocity from JPL ephemeris
 */
export function useOrbitalVelocity(days: number = 180) {
  const { data, error, isLoading, mutate } = useSWR<OrbitalVelocityResponse>(
    `/api/orbital-velocity?days=${days}`,
    fetcher,
    {
      dedupingInterval: 5000,
      refreshInterval: 600000, // 10 minutes
      keepPreviousData: true,
      revalidateOnFocus: true,
    }
  );

  return {
    velocityData: data?.data?.velocity_data || [],
    metadata: data?.data?.metadata,
    isLoading,
    error,
    refresh: mutate,
  };
}
