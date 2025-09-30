/**
 * Real activity level calculation based on observational data
 * Uses brightness vs distance relationship to determine comet activity
 */

import { CometObservation } from '@/types/comet';

export interface ActivityCalculation {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'INSUFFICIENT_DATA';
  brightnessDelta: number;
  currentMagnitude: number;
  expectedMagnitude: number;
  heliocentric_distance: number;
}

/**
 * Calculate real activity level from observational data
 * @param currentMagnitude - Latest observed magnitude
 * @param heliocentric_distance - Current distance from Sun in AU
 * @returns Activity calculation with level and details
 */
export function calculateActivityLevel(
  currentMagnitude: number,
  heliocentric_distance: number
): ActivityCalculation {
  // Interstellar comet 3I/ATLAS parameters
  // Based on initial observations and orbital characteristics
  const absoluteMagnitude = 15.5; // H magnitude
  const phaseCoeff = 4.0; // Steeper than typical comets

  // Expected magnitude for inactive comet at current distance
  const expectedMagnitude = absoluteMagnitude + 5 * Math.log10(heliocentric_distance) + phaseCoeff * Math.log10(heliocentric_distance);

  // Brightness excess indicates activity level
  const brightnessDelta = expectedMagnitude - currentMagnitude;

  // Activity classification based on brightness excess:
  // > 2.0 mag brighter = EXTREME activity
  // > 1.0 mag brighter = HIGH activity
  // > 0.5 mag brighter = MODERATE activity
  // <= 0.5 mag = LOW activity
  let level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | 'INSUFFICIENT_DATA';

  if (brightnessDelta > 2.0) {
    level = 'EXTREME';
  } else if (brightnessDelta > 1.0) {
    level = 'HIGH';
  } else if (brightnessDelta > 0.5) {
    level = 'MODERATE';
  } else {
    level = 'LOW';
  }

  return {
    level,
    brightnessDelta: Number(brightnessDelta.toFixed(1)),
    currentMagnitude,
    expectedMagnitude: Number(expectedMagnitude.toFixed(1)),
    heliocentric_distance
  };
}

/**
 * Calculate activity level from available API data
 * @param observationsData - Recent observations from COBS
 * @param jplData - JPL Horizons distance data
 * @returns Activity calculation or null if insufficient data
 */
export function calculateActivityFromAPIData(
  observationsData: CometObservation[],
  jplData: { ephemeris?: { r?: number } } | null
): ActivityCalculation {
  // Check for insufficient data
  if (!observationsData || observationsData.length === 0) {
    return {
      level: 'INSUFFICIENT_DATA',
      brightnessDelta: 0,
      currentMagnitude: 0,
      expectedMagnitude: 0,
      heliocentric_distance: 0
    };
  }

  const latestObs = observationsData[observationsData.length - 1];
  if (!latestObs || typeof latestObs.magnitude !== 'number') {
    return {
      level: 'INSUFFICIENT_DATA',
      brightnessDelta: 0,
      currentMagnitude: 0,
      expectedMagnitude: 0,
      heliocentric_distance: 0
    };
  }
  const currentMagnitude = latestObs.magnitude;

  // Get heliocentric distance
  const heliocentric_distance = jplData?.ephemeris?.r;
  if (!heliocentric_distance) {
    return {
      level: 'INSUFFICIENT_DATA',
      brightnessDelta: 0,
      currentMagnitude: currentMagnitude || 0,
      expectedMagnitude: 0,
      heliocentric_distance: 0
    };
  }

  return calculateActivityLevel(currentMagnitude, heliocentric_distance);
}