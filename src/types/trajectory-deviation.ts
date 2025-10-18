/**
 * Trajectory Deviation Monitoring Types
 *
 * Types for monitoring deviations between JPL orbital predictions
 * and actual observed positions of 3I/ATLAS comet.
 *
 * This helps detect when non-gravitational forces (outgassing, etc.)
 * cause the comet's trajectory to diverge from predictions.
 */

export interface TrajectoryDeviation {
  currentDeviation: {
    positionError: number;      // AU (linear distance error)
    angularError: number;        // arcseconds (sky position error)
    velocityError?: number;      // km/s (optional for v1)
    lastObservation: string;     // ISO timestamp of last observed position
    lastPredictionUpdate: string; // Epoch from JPL orbital elements
    dataAge: number;             // days since last JPL update
  };
  healthStatus: 'good' | 'warning' | 'critical';
  alerts: string[];
  historicalDeviations?: {
    date: string;
    positionError: number;    // AU
    angularError: number;     // arcseconds
  }[];
}

/**
 * Health status thresholds
 */
export const DEVIATION_THRESHOLDS = {
  GOOD: {
    positionError: 0.01,      // < 0.01 AU (~1.5 million km)
    angularError: 10,         // < 10 arcseconds
  },
  WARNING: {
    positionError: 0.05,      // 0.01-0.05 AU
    angularError: 50,         // 10-50 arcseconds
  },
  CRITICAL: {
    positionError: 0.05,      // > 0.05 AU (~7.5 million km)
    angularError: 50,         // > 50 arcseconds
  },
} as const;
