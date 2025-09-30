/**
 * Enhanced Comet Data Types for Multi-Source Data Integration
 *
 * These types extend the base comet data structure with orbital mechanics,
 * brightness analysis, and source status information from multiple data sources
 * (COBS, TheSkyLive, JPL Horizons).
 */

import type { ProcessedObservation, LightCurvePoint } from '@/services/cobs-api';

/**
 * Enhanced interface extending existing COBS data structure with multi-source data
 */
export interface EnhancedCometData {
  // Existing COBS data (unchanged)
  comet: {
    name: string;
    designation: string;
    currentMagnitude: number;
    perihelionDate: string;
    observations: ProcessedObservation[];
    lightCurve: LightCurvePoint[];
  };
  stats: {
    totalObservations: number;
    activeObservers: number;
    currentMagnitude: number;
    daysUntilPerihelion: number;
  };

  // NEW: Multi-source orbital mechanics
  orbital_mechanics: {
    current_velocity: {
      heliocentric: number;      // km/s from JPL
      geocentric: number;        // km/s from JPL
      angular: number;           // arcsec/day from TheSkyLive
    };
    current_distance: {
      heliocentric: number;      // AU from Sun
      geocentric: number;        // AU from Earth
    };
    velocity_changes: {
      acceleration: number;      // km/s² - derivative of velocity
      direction_change: number;  // degrees/day
      trend_7day: number;       // velocity trend
    };
    position_accuracy: {
      uncertainty_arcsec: number;
      last_observation: string;
      prediction_confidence: number;
    };
  };

  // NEW: Enhanced brightness analysis
  brightness_enhanced: {
    visual_magnitude: number;    // from COBS (existing)
    infrared_magnitude: {
      thermal_contribution: number;
    };
    brightness_velocity: {
      visual_change_rate: number;     // mag/day from existing
      activity_correlation: number;   // brightness vs distance
    };
  };

  // NEW: Source metadata
  source_status: {
    cobs: { active: boolean; last_updated: string; error?: string };
    theskylive: { active: boolean; last_updated: string; error?: string };
    jpl_horizons: { active: boolean; last_updated: string; error?: string };
  };
}

/**
 * Cache entry interface for internal cache management
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Cache status interface for monitoring data freshness
 */
export interface CacheStatus {
  cobs: { cached: boolean; age?: number; nextRefresh?: number };
  theskylive: { cached: boolean; age?: number; nextRefresh?: number };
  jpl_horizons: { cached: boolean; age?: number; nextRefresh?: number };
}

/**
 * Data source priority configuration
 * Defines which sources are prioritized for different types of data
 */
export type DataSourcePriority = {
  velocity: 'jpl' | 'theskylive' | 'cobs';
  position: 'jpl' | 'theskylive' | 'cobs';
  magnitude: 'cobs' | 'theskylive' | 'jpl';
  observations: 'cobs' | 'jpl' | 'theskylive';
};

/**
 * Data validation result
 */
export interface DataValidationResult {
  isConsistent: boolean;
  warnings: string[];
  confidence: number;
}