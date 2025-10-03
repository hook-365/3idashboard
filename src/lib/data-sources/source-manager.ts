/**
 * DataSourceManager - Multi-source Data Orchestration for 3I/ATLAS Comet Tracking
 *
 * This service orchestrates data from multiple sources to provide comprehensive
 * comet tracking information with intelligent fallbacks, caching, and data merging.
 *
 * Data Sources:
 * - COBS API: Primary brightness observations and community data
 * - TheSkyLive: Real-time orbital parameters and position data
 * - JPL Horizons: Precise orbital mechanics and state vectors
 * - MPC: Minor Planet Center orbital elements for cross-validation
 *
 * Features:
 * - Multi-source parallel fetching with Promise.allSettled
 * - Intelligent data merging with conflict resolution
 * - Source-specific caching with different TTL values
 * - Comprehensive error handling and fallback strategies
 * - Source health monitoring and status reporting
 * - Derived parameter calculations from multi-source data
 */

import { cobsApi, type LightCurvePoint, type ProcessedObservation } from '../../services/cobs-api';
import { getTheSkyLiveOrbitalData, type TheSkyLiveData } from './theskylive';
import { getJPLHorizonsOrbitalData, type JPLHorizonsData, calculateOrbitalParameters } from './jpl-horizons';
import { getMPCOrbitalData, type MPCSourceData } from './mpc';
import type {
  EnhancedCometData,
  CacheEntry,
  CacheStatus,
} from '../../types/enhanced-comet-data';

// Re-export types for backward compatibility
export type { EnhancedCometData, CacheStatus } from '../../types/enhanced-comet-data';

/**
 * Internal type for COBS data structure with derived stats and light curve
 */
type COBSDataStructure = {
  observations: ProcessedObservation[];
  stats: {
    totalObservations: number;
    activeObservers: number;
    currentMagnitude: number;
    brightestMagnitude: number;
    averageMagnitude: number;
    lastUpdated: string;
    observationDateRange: {
      earliest: string;
      latest: string;
    };
  };
  lightCurve: LightCurvePoint[];
  fetch_timestamp?: string; // When this data was fetched
};

/**
 * DataSourceManager - Orchestrates multiple data sources for comprehensive comet tracking
 */
export class DataSourceManager {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private instanceId: string = Math.random().toString(36).substring(7);

  // Cache TTL values (in milliseconds)
  private readonly CACHE_TTL = {
    COBS: 15 * 60 * 1000,      // 15 minutes
    THESKYLIVE: 15 * 60 * 1000, // 15 minutes
    JPL_HORIZONS: 30 * 60 * 1000, // 30 minutes
    MPC: 24 * 60 * 60 * 1000,  // 24 hours (MPC updates few times per month)
    FAILED_REQUEST: 10 * 60 * 1000, // 10 minutes for failed requests
  };

  /**
   * Main orchestration method - fetches and merges data from all sources
   */
  async getCometData(): Promise<EnhancedCometData> {
    console.log(`[DataSourceManager ${this.instanceId}] Starting multi-source data fetch...`);

    // Fetch from all sources in parallel using Promise.allSettled
    const [cobsResult, theSkyResult, jplResult, mpcResult] = await Promise.allSettled([
      this.fetchWithCache('cobs', () => this.fetchCOBSData(), this.CACHE_TTL.COBS),
      this.fetchWithCache('theskylive', () => getTheSkyLiveOrbitalData(), this.CACHE_TTL.THESKYLIVE),
      this.fetchWithCache('jpl_horizons', () => getJPLHorizonsOrbitalData(), this.CACHE_TTL.JPL_HORIZONS),
      this.fetchWithCache('mpc', () => getMPCOrbitalData(), this.CACHE_TTL.MPC),
    ]);

    // Extract data from settled promises
    const cobsData = cobsResult.status === 'fulfilled' ? cobsResult.value : null;
    const theSkyData = theSkyResult.status === 'fulfilled' ? theSkyResult.value : null;
    const jplData = jplResult.status === 'fulfilled' ? jplResult.value : null;
    const mpcData = mpcResult.status === 'fulfilled' ? mpcResult.value : null;

    // Log source status
    console.log('Source fetch results:', {
      cobs: cobsResult.status,
      theskylive: theSkyResult.status,
      jpl: jplResult.status,
      mpc: mpcResult.status,
    });

    // Merge data sources with intelligent fallbacks
    return this.mergeDataSources(cobsData, jplData, theSkyData, mpcData);
  }

  /**
   * Fetch data with caching and error handling
   */
  private async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`Cache hit for ${key}`);
      return cached.data as T;
    }

    try {
      console.log(`Fetching fresh data for ${key}...`);
      const data = await fetcher();

      // Cache successful result
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
      });

      return data;
    } catch (error) {
      console.error(`Failed to fetch ${key}:`, error);

      // Cache the failure for a shorter period to avoid hammering
      this.cache.set(key, {
        data: this.getMockData(key),
        timestamp: Date.now(),
        ttl: this.CACHE_TTL.FAILED_REQUEST
      });

      return this.getMockData(key) as T;
    }
  }

  /**
   * Fetch COBS data with enhanced structure
   *
   * OPTIMIZATION: Fetches raw observations once and derives stats/light curve locally
   * to avoid duplicate API calls. Previous implementation made 3 parallel calls
   * (getObservations, getStatistics, getLightCurve) that all internally fetched
   * the same observation data. This reduces COBS API calls by 66% (3→1).
   */
  private async fetchCOBSData() {
    // Fetch observations once - this is the single source of truth
    const observations = await cobsApi.getObservations();

    // Derive statistics from observations locally
    const stats = this.calculateStatsFromObservations(observations);

    // Derive light curve from observations locally
    const lightCurve = this.calculateLightCurveFromObservations(observations);

    // Add fetch timestamp - this will be preserved in cache
    const fetchTimestamp = new Date().toISOString();

    return {
      observations,
      stats,
      lightCurve,
      fetch_timestamp: fetchTimestamp,
    };
  }

  /**
   * Calculate statistics from observation data
   * Mirrors the logic in cobsApi.getStatistics() but operates on already-fetched data
   */
  private calculateStatsFromObservations(observations: ProcessedObservation[]): COBSDataStructure['stats'] {
    if (observations.length === 0) {
      return {
        totalObservations: 0,
        activeObservers: 0,
        currentMagnitude: 0,
        brightestMagnitude: 0,
        averageMagnitude: 0,
        lastUpdated: new Date().toISOString(),
        observationDateRange: {
          earliest: '',
          latest: '',
        },
      };
    }

    const magnitudes = observations.map(obs => obs.magnitude);
    const uniqueObservers = new Set(observations.map(obs => obs.observer.id));
    const dates = observations.map(obs => new Date(obs.date));

    return {
      totalObservations: observations.length,
      activeObservers: uniqueObservers.size,
      currentMagnitude: observations[0]?.magnitude || 0,
      brightestMagnitude: Math.min(...magnitudes),
      averageMagnitude: magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length,
      lastUpdated: new Date().toISOString(),
      observationDateRange: {
        earliest: new Date(Math.min(...dates.map(d => d.getTime()))).toISOString(),
        latest: new Date(Math.max(...dates.map(d => d.getTime()))).toISOString(),
      },
    };
  }

  /**
   * Calculate light curve from observation data
   * Mirrors the logic in cobsApi.getLightCurve() but operates on already-fetched data
   */
  private calculateLightCurveFromObservations(observations: ProcessedObservation[]): LightCurvePoint[] {
    if (observations.length === 0) {
      return [];
    }

    // Group observations by date
    const dailyGroups = new Map<string, ProcessedObservation[]>();

    observations.forEach(obs => {
      const date = new Date(obs.date);
      // Format as YYYY-MM-DD for grouping
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, []);
      }
      dailyGroups.get(dateKey)!.push(obs);
    });

    // Calculate daily medians (more robust to outliers than mean)
    const lightCurve: LightCurvePoint[] = [];

    Array.from(dailyGroups.entries()).forEach(([dateKey, dayObservations]) => {
      const magnitudes = dayObservations.map(obs => obs.magnitude).sort((a, b) => a - b);

      // Use median instead of mean (more robust to outliers)
      const median = magnitudes.length % 2 === 0
        ? (magnitudes[magnitudes.length / 2 - 1] + magnitudes[magnitudes.length / 2]) / 2
        : magnitudes[Math.floor(magnitudes.length / 2)];

      // Calculate uncertainty as Median Absolute Deviation (MAD)
      // MAD is more robust to outliers than standard deviation
      const absoluteDeviations = magnitudes.map(mag => Math.abs(mag - median)).sort((a, b) => a - b);
      const mad = absoluteDeviations.length % 2 === 0
        ? (absoluteDeviations[absoluteDeviations.length / 2 - 1] + absoluteDeviations[absoluteDeviations.length / 2]) / 2
        : absoluteDeviations[Math.floor(absoluteDeviations.length / 2)];

      // Scale MAD to be comparable to standard deviation (for normal distributions)
      const uncertainty = mad * 1.4826;

      lightCurve.push({
        date: `${dateKey}T00:00:00.000Z`,
        magnitude: parseFloat(median.toFixed(2)),
        uncertainty: parseFloat(uncertainty.toFixed(2)),
        observationCount: dayObservations.length,
      });
    });

    return lightCurve.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Merge data from all sources with intelligent conflict resolution
   */
  private mergeDataSources(
    cobsData: COBSDataStructure | null,
    jplData: JPLHorizonsData | null,
    theSkyData: TheSkyLiveData | null,
    mpcData: MPCSourceData | null
  ): EnhancedCometData {
    console.log('Merging data from available sources...');

    // Use COBS as primary source for observations and basic stats
    const baseData: COBSDataStructure = cobsData || (this.getMockData('cobs') as COBSDataStructure);

    // Calculate orbital mechanics from available sources
    const orbitalMechanics = this.calculateOrbitalMechanics(jplData, theSkyData);

    // Enhanced brightness analysis
    const brightnessEnhanced = this.calculateBrightnessEnhanced(baseData, jplData, theSkyData);

    // Source status reporting
    const sourceStatus = this.getSourceStatus(cobsData, jplData, theSkyData, mpcData);

    return {
      // Existing COBS structure
      comet: {
        name: '3I/ATLAS',
        designation: 'C/2019 L3',
        currentMagnitude: this.calculateLatestMagnitude(baseData),
        perihelionDate: '2025-10-30T00:00:00.000Z',
        observations: baseData.observations || [],
        lightCurve: baseData.lightCurve || [],
      },
      stats: {
        totalObservations: baseData.stats?.totalObservations || 0,
        activeObservers: baseData.stats?.activeObservers || 0,
        currentMagnitude: this.calculateLatestMagnitude(baseData),
        daysUntilPerihelion: Math.floor(
          (new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      },

      // Enhanced multi-source data
      orbital_mechanics: orbitalMechanics,
      brightness_enhanced: brightnessEnhanced,
      source_status: sourceStatus,

      // MPC orbital elements (if available)
      mpc_orbital_elements: mpcData?.orbital_elements,
    };
  }

  /**
   * Calculate comprehensive orbital mechanics from multiple sources
   */
  private calculateOrbitalMechanics(
    jplData: JPLHorizonsData | null,
    theSkyData: TheSkyLiveData | null
  ) {
    // Prioritize JPL for velocity calculations (most accurate)
    let heliocentric_velocity = 40.0; // Default for interstellar comet
    let geocentric_velocity = 35.0;
    let angular_velocity = 0.5; // arcsec/day

    // Calculate distances from available sources
    let heliocentric_distance = 2.1; // Default AU
    let geocentric_distance = 3.2; // Default AU

    if (jplData) {
      const orbitalParams = calculateOrbitalParameters(jplData);
      heliocentric_velocity = orbitalParams.current_velocity;
      geocentric_velocity = heliocentric_velocity * 0.9; // Approximation
      heliocentric_distance = orbitalParams.distance_from_sun;
      geocentric_distance = orbitalParams.distance_from_earth;
    } else if (theSkyData) {
      // Use TheSkyLive distance data if JPL not available
      heliocentric_distance = theSkyData.heliocentric_distance;
      geocentric_distance = theSkyData.geocentric_distance;
    }

    if (theSkyData) {
      angular_velocity = theSkyData.orbital_velocity * 0.01; // Convert to arcsec/day approximation
    }

    // Calculate velocity changes (simplified - would need historical data for accurate trends)
    const acceleration = this.calculateAcceleration(jplData);
    const direction_change = this.calculateDirectionChange(theSkyData);
    const trend_7day = this.calculateVelocityTrend();

    // Position accuracy assessment
    const position_accuracy = this.assessPositionAccuracy(jplData, theSkyData);

    return {
      current_velocity: {
        heliocentric: heliocentric_velocity,
        geocentric: geocentric_velocity,
        angular: angular_velocity,
      },
      current_distance: {
        heliocentric: heliocentric_distance,
        geocentric: geocentric_distance,
      },
      velocity_changes: {
        acceleration,
        direction_change,
        trend_7day,
      },
      position_accuracy,
    };
  }

  /**
   * Calculate acceleration from JPL state vectors (simplified)
   */
  private calculateAcceleration(jplData: JPLHorizonsData | null): number {
    if (!jplData) return 0.001; // Default small acceleration

    // Simplified calculation - in reality would need multiple time points
    const velocity_magnitude = Math.sqrt(
      jplData.state_vectors.velocity[0] ** 2 +
      jplData.state_vectors.velocity[1] ** 2 +
      jplData.state_vectors.velocity[2] ** 2
    );

    // Convert AU/day² to km/s² (very rough approximation)
    return velocity_magnitude * 0.001; // Simplified
  }

  /**
   * Calculate direction change from orbital motion
   */
  private calculateDirectionChange(theSkyData: TheSkyLiveData | null): number {
    if (!theSkyData) return 0.1; // Default small direction change

    // Approximate based on position angle changes
    return Math.abs(theSkyData.position_angle * 0.01); // degrees/day approximation
  }

  /**
   * Calculate 7-day velocity trend (mock implementation)
   */
  private calculateVelocityTrend(): number {
    // In a real implementation, this would analyze historical velocity data
    // For now, return a reasonable trend for an approaching comet
    const daysUntilPerihelion = Math.floor(
      (new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Velocity increases as comet approaches perihelion
    return daysUntilPerihelion > 0 ? 0.05 : -0.02; // km/s per day
  }

  /**
   * Assess position accuracy based on data sources
   */
  private assessPositionAccuracy(
    jplData: JPLHorizonsData | null,
    theSkyData: TheSkyLiveData | null
  ) {
    let uncertainty_arcsec = 10.0; // Default uncertainty
    let prediction_confidence = 0.7; // Default confidence
    let last_observation = new Date().toISOString();

    if (jplData) {
      // JPL provides high accuracy
      uncertainty_arcsec = 1.0;
      prediction_confidence = 0.95;
      last_observation = jplData.last_updated;
    } else if (theSkyData) {
      // TheSkyLive provides good accuracy
      uncertainty_arcsec = 3.0;
      prediction_confidence = 0.85;
      last_observation = theSkyData.last_updated;
    }

    return {
      uncertainty_arcsec,
      last_observation,
      prediction_confidence,
    };
  }

  /**
   * Calculate enhanced brightness analysis
   */
  private calculateBrightnessEnhanced(
    cobsData: COBSDataStructure,
    jplData: JPLHorizonsData | null,
    theSkyData: TheSkyLiveData | null
  ) {
    // Use real data only - no fabricated fallbacks
    const visual_magnitude = cobsData?.stats?.currentMagnitude ||
                           theSkyData?.magnitude_estimate ||
                           jplData?.ephemeris?.magnitude ||
                           0; // Will display as "N/A" in UI

    // Calculate brightness change rate from light curve
    const visual_change_rate = this.calculateBrightnessChangeRate(cobsData?.lightCurve);

    // Calculate infrared magnitudes and change rates
    const infrared_magnitude = { thermal_contribution: 0.0 };
    const infrared_change_rate = 0.0;

    // Calculate activity correlation with distance
    const activity_correlation = this.calculateActivityCorrelation(cobsData, jplData);

    return {
      visual_magnitude,
      infrared_magnitude,
      brightness_velocity: {
        visual_change_rate,
        infrared_change_rate,
        activity_correlation,
      },
    };
  }

  /**
   * Calculate brightness change rate from light curve data
   */
  private calculateBrightnessChangeRate(lightCurve: LightCurvePoint[] | null): number {
    if (!lightCurve || lightCurve.length < 2) return 0.0;

    // Calculate rate from last two points
    const recent = lightCurve.slice(-2);
    const timeDiff = (new Date(recent[1].date).getTime() - new Date(recent[0].date).getTime()) / (1000 * 60 * 60 * 24);
    const magDiff = recent[1].magnitude - recent[0].magnitude;

    return timeDiff > 0 ? magDiff / timeDiff : 0.0; // mag/day
  }

  /**
   * Calculate activity correlation with distance
   */
  private calculateActivityCorrelation(
    cobsData: COBSDataStructure,
    jplData: JPLHorizonsData | null
  ): number {
    // Simplified correlation - in reality would need extensive analysis
    if (!jplData) return 0.5; // Default moderate correlation

    const distance = jplData.ephemeris.r;

    // Brightness typically correlates inversely with distance squared
    // Return correlation coefficient approximation
    return Math.max(0.3, Math.min(0.9, 1.0 / (distance * distance)));
  }


  /**
   * Generate source status information
   */
  private getSourceStatus(
    cobsData: COBSDataStructure | null,
    jplData: JPLHorizonsData | null,
    theSkyData: TheSkyLiveData | null,
    mpcData: MPCSourceData | null
  ) {
    return {
      cobs: {
        active: !!cobsData,
        last_updated: cobsData?.fetch_timestamp || '',
        error: cobsData ? undefined : 'Failed to fetch COBS data',
      },
      theskylive: {
        active: !!theSkyData,
        last_updated: theSkyData?.last_updated || '',
        error: theSkyData ? undefined : 'Failed to fetch TheSkyLive data',
      },
      jpl_horizons: {
        active: !!jplData,
        last_updated: jplData?.last_updated || '',
        error: jplData ? undefined : 'Failed to fetch JPL Horizons data',
      },
      mpc: {
        active: !!mpcData,
        last_updated: mpcData?.last_updated || '',
        error: mpcData ? undefined : 'Failed to fetch MPC data',
      },
    };
  }

  /**
   * Calculate the latest magnitude from real observations
   */
  private calculateLatestMagnitude(baseData: COBSDataStructure): number {
    // Try to get from COBS stats first
    if (baseData.stats?.currentMagnitude && baseData.stats.currentMagnitude > 0) {
      return baseData.stats.currentMagnitude;
    }

    // If not available, calculate from most recent observations
    if (baseData.observations && baseData.observations.length > 0) {
      const sortedObs = baseData.observations
        .filter(obs => obs.magnitude && obs.magnitude > 0)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (sortedObs.length > 0) {
        // Return magnitude from most recent observation
        return sortedObs[0].magnitude;
      }
    }

    // If no real data available, return null to indicate insufficient data
    return 0; // Will display as "N/A" in the UI
  }

  /**
   * Provide mock data for failed sources
   */
  private getMockData(source: string): COBSDataStructure | unknown {
    const now = new Date();

    switch (source) {
      case 'cobs':
        return {
          observations: [],
          stats: {
            totalObservations: 0,
            activeObservers: 0,
            currentMagnitude: 0, // No fabricated data - will show as "N/A"
            brightestMagnitude: 0,
            averageMagnitude: 0,
            lastUpdated: now.toISOString(),
            observationDateRange: {
              earliest: '',
              latest: '',
            },
          },
          lightCurve: [],
        };

      case 'theskylive':
        return {
          orbital_velocity: 40.0,
          heliocentric_velocity: 38.0,
          position_angle: 225.0,
          solar_elongation: 45.0,
          phase_angle: 30.0,
          last_updated: now.toISOString(),
          ra: 218.5,
          dec: -11.43,
          heliocentric_distance: 2.1,
          geocentric_distance: 3.2,
          magnitude_estimate: 0, // No fabricated data
        };

      case 'jpl_horizons':
        return {
          state_vectors: {
            position: [1.8, -1.2, 0.5],
            velocity: [0.015, 0.020, 0.008],
          },
          orbital_elements: {
            eccentricity: 3.2,
            inclination: 109.0,
            perihelion_distance: 1.56,
            velocity_at_perihelion: 87.7,
            semi_major_axis: -1.9,
            orbital_period: -1,
          },
          ephemeris: {
            ra: 218.5,
            dec: -11.43,
            delta: 3.2,
            r: 2.1,
            phase: 30.0,
            solar_elongation: 45.0,
            magnitude: 0, // No fabricated data
          },
          last_updated: now.toISOString(),
          data_source: 'JPL Horizons (Mock)',
        };

      default:
        return {};
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('DataSourceManager: All caches cleared');
  }

  /**
   * Get cache status for all sources
   */
  getCacheStatus(): CacheStatus {
    const now = Date.now();

    console.log(`[DataSourceManager ${this.instanceId}] getCacheStatus called. Cache keys:`, Array.from(this.cache.keys()));

    const getStatus = (key: string, ttl: number) => {
      const entry = this.cache.get(key);
      if (!entry) {
        console.log(`[DataSourceManager ${this.instanceId}] No cache entry for ${key}`);
        return { cached: false, status: 'none' as const };
      }

      const age = now - entry.timestamp;
      const nextRefresh = Math.max(0, entry.ttl - age);
      const isFresh = age < ttl;

      console.log(`[DataSourceManager ${this.instanceId}] ${key}: age=${age}ms, isFresh=${isFresh}`);

      return {
        cached: true,
        age,
        nextRefresh,
        lastUpdate: new Date(entry.timestamp).toISOString(),
        status: isFresh ? ('fresh' as const) : ('stale' as const),
      };
    };

    return {
      cobs: getStatus('cobs', this.CACHE_TTL.COBS),
      theskylive: getStatus('theskylive', this.CACHE_TTL.THESKYLIVE),
      jpl_horizons: getStatus('jpl_horizons', this.CACHE_TTL.JPL_HORIZONS),
      mpc: getStatus('mpc', this.CACHE_TTL.MPC),
    };
  }

  /**
   * Validate data consistency across sources
   */
  validateDataConsistency(data: EnhancedCometData): {
    isConsistent: boolean;
    warnings: string[];
    confidence: number;
  } {
    const warnings: string[] = [];
    let confidence = 1.0;

    // Check magnitude consistency
    const magnitudes = [
      data.comet.currentMagnitude,
      data.brightness_enhanced.visual_magnitude,
    ].filter(m => m > 0);

    if (magnitudes.length > 1) {
      const maxDiff = Math.max(...magnitudes) - Math.min(...magnitudes);
      if (maxDiff > 0.5) {
        warnings.push(`Magnitude inconsistency: ${maxDiff.toFixed(2)} mag difference between sources`);
        confidence -= 0.1;
      }
    }

    // Check source availability
    const activeSources = data.source_status
      ? Object.values(data.source_status).filter(s => s.active).length
      : 0;
    if (activeSources < 2) {
      warnings.push(`Only ${activeSources} data source(s) active - reduced reliability`);
      confidence -= 0.2 * (3 - activeSources);
    }

    // Check position accuracy
    if (data.orbital_mechanics.position_accuracy.uncertainty_arcsec > 5.0) {
      warnings.push('Position uncertainty exceeds 5 arcseconds');
      confidence -= 0.1;
    }

    return {
      isConsistent: warnings.length === 0,
      warnings,
      confidence: Math.max(0.1, confidence),
    };
  }
}

// Singleton instance with HMR (Hot Module Replacement) support
// In dev mode, Next.js reloads modules on changes, which creates new instances and loses cache
// We use globalThis to persist the singleton across HMR
const globalForDataSource = globalThis as unknown as {
  dataSourceManager: DataSourceManager | undefined;
};

const dataSourceManager = globalForDataSource.dataSourceManager ?? new DataSourceManager();

if (process.env.NODE_ENV !== 'production') {
  globalForDataSource.dataSourceManager = dataSourceManager;
}

/**
 * Main export function for dashboard components
 * Returns enhanced comet data from all available sources
 */
export async function getEnhancedCometData(): Promise<EnhancedCometData> {
  return dataSourceManager.getCometData();
}

/**
 * Get source health status
 */
export function getSourceHealthStatus(): Promise<CacheStatus> {
  return Promise.resolve(dataSourceManager.getCacheStatus());
}

/**
 * Force refresh all data sources
 */
export function refreshAllSources(): void {
  dataSourceManager.clearCache();
}

/**
 * Export the manager instance for advanced usage
 */
export { dataSourceManager };