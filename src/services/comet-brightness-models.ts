/**
 * COBS-Based Comet Brightness Models for 3I/ATLAS
 *
 * Implements the COBS Simple Fit model (H=7.1, n=6.0) using complete
 * orbital elements from MPEC 2025-SI6. Updated with latest 30-day COBS data.
 *
 * Formula: m = H + 5×log(Δ) + n×log(r)
 */

// 3I/ATLAS parameters from COBS database (MPEC 2025-SI6, COBS last 30 days)
export const ATLAS_3I_ORBITAL_DATA = {
  // Time of perihelion passage
  perihelionDate: new Date('2025-10-29T11:35:31Z'), // T - exact COBS timing
  julianDate: 2460977.9838, // JD of perihelion passage

  // Complete orbital elements from MPEC 2025-SI6
  perihelionDistance: 1.356320, // q (AU) - perihelion distance
  eccentricity: 6.138559, // e - hyperbolic orbit (highly interstellar)
  argumentOfPerihelion: 128.0127, // ω (degrees) - argument of perihelion
  longitudeOfAscendingNode: 322.1574, // Ω (degrees) - longitude of ascending node
  inclination: 175.1131, // i (degrees) - inclination
  epoch: new Date('2025-11-21T00:00:00Z'), // Epoch 2025 Nov 21

  // Latest magnitude parameters from COBS (last 30 days)
  absoluteMagnitude: 7.1, // H - Updated absolute magnitude
  activityParameter: 6.0, // n - Updated slope parameter (very high activity)
  phaseCoefficient: 0.04, // β - phase angle coefficient (mag/degree)

  // Reference information
  reference: "MPEC 2025-SI6, COBS 30 days",
  magnitudeSource: "COBS last 30 days"
};

export interface CometPosition {
  date: Date;
  heliocentricDistance: number; // AU
  geocentricDistance: number;   // AU
  phaseAngle: number;          // degrees
}

export interface BrightnessPrediction {
  date: string;
  magnitude: number;
  heliocentricDistance: number;
  geocentricDistance: number;
  phaseAngle: number;
  uncertainty: number;
}

/**
 * Calculate heliocentric distance using simplified Kepler's laws
 * This is an approximation for the hyperbolic orbit of 3I/ATLAS
 */
export function calculateHeliocentricDistance(date: Date): number {
  const daysSincePerihelion = (date.getTime() - ATLAS_3I_ORBITAL_DATA.perihelionDate.getTime()) / (1000 * 60 * 60 * 24);

  // For a hyperbolic orbit approaching perihelion
  // Simplified model: r ≈ q × (1 + e × cos(ν))
  // where ν is true anomaly, approximated from time

  if (daysSincePerihelion < 0) {
    // Before perihelion - incoming
    const timeRatio = Math.abs(daysSincePerihelion) / 365; // Normalize to years
    return ATLAS_3I_ORBITAL_DATA.perihelionDistance * (1 + timeRatio * 0.5);
  } else {
    // After perihelion - outgoing
    const timeRatio = daysSincePerihelion / 365; // Normalize to years
    return ATLAS_3I_ORBITAL_DATA.perihelionDistance * (1 + timeRatio * 0.8);
  }
}

/**
 * Approximate geocentric distance
 * This is simplified - real calculation requires full orbital mechanics
 */
export function calculateGeocentricDistance(date: Date, heliocentricDistance: number): number {
  // Earth's distance from Sun (approximately 1 AU)
  // Simplified triangle: comet-Sun-Earth
  // This is a rough approximation
  const earthSunDistance = 1.0;

  // Use law of cosines approximation
  // In reality, this requires the comet's position angle relative to Earth
  const approximateAngle = Math.PI / 3; // 60 degrees - rough estimate

  const geocentricDist = Math.sqrt(
    heliocentricDistance * heliocentricDistance +
    earthSunDistance * earthSunDistance -
    2 * heliocentricDistance * earthSunDistance * Math.cos(approximateAngle)
  );

  return Math.max(0.1, geocentricDist); // Minimum distance for numerical stability
}

/**
 * Calculate phase angle (Sun-comet-Earth angle)
 * Simplified approximation
 */
export function calculatePhaseAngle(heliocentricDistance: number, geocentricDistance: number): number {
  // Law of cosines to find phase angle
  const earthSunDistance = 1.0;

  const cosPhase = (
    heliocentricDistance * heliocentricDistance +
    geocentricDistance * geocentricDistance -
    earthSunDistance * earthSunDistance
  ) / (2 * heliocentricDistance * geocentricDistance);

  const phaseAngleRad = Math.acos(Math.max(-1, Math.min(1, cosPhase)));
  return (phaseAngleRad * 180) / Math.PI; // Convert to degrees
}

/**
 * Standard comet magnitude formula
 * m = M₁ + 5×log₁₀(Δ) + K₁×log₁₀(r) + β×α
 */
export function calculateCometMagnitude(
  heliocentricDistance: number,
  geocentricDistance: number,
  phaseAngle: number,
  absoluteMagnitude: number = ATLAS_3I_ORBITAL_DATA.absoluteMagnitude,
  activityParameter: number = ATLAS_3I_ORBITAL_DATA.activityParameter,
  phaseCoefficient: number = ATLAS_3I_ORBITAL_DATA.phaseCoefficient
): number {

  // Standard comet magnitude formula
  const distanceEffect = 5 * Math.log10(geocentricDistance);
  const activityEffect = activityParameter * Math.log10(heliocentricDistance);
  const phaseEffect = phaseCoefficient * phaseAngle;

  const magnitude = absoluteMagnitude + distanceEffect + activityEffect + phaseEffect;

  return magnitude;
}

/**
 * Generate brightness predictions for a date range
 */
export function generateBrightnessPredictions(
  startDate: Date,
  endDate: Date,
  intervalDays: number = 1
): BrightnessPrediction[] {
  const predictions: BrightnessPrediction[] = [];

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const r = calculateHeliocentricDistance(currentDate);
    const delta = calculateGeocentricDistance(currentDate, r);
    const phase = calculatePhaseAngle(r, delta);

    const magnitude = calculateCometMagnitude(r, delta, phase);

    // Calculate uncertainty based on distance and phase
    const uncertainty = 0.1 + (r - 0.5) * 0.05 + Math.abs(phase - 30) * 0.001;

    predictions.push({
      date: currentDate.toISOString(),
      magnitude: Math.round(magnitude * 100) / 100, // Round to 2 decimal places
      heliocentricDistance: Math.round(r * 1000) / 1000,
      geocentricDistance: Math.round(delta * 1000) / 1000,
      phaseAngle: Math.round(phase * 10) / 10,
      uncertainty: Math.round(uncertainty * 100) / 100
    });

    currentDate.setDate(currentDate.getDate() + intervalDays);
  }

  return predictions;
}

/**
 * Fit observed data to estimate comet parameters
 * Uses least squares fitting to determine best M1 and K1 values
 */
export function fitCometParameters(observations: { date: string; magnitude: number }[]): {
  absoluteMagnitude: number;
  activityParameter: number;
  rSquared: number;
  predictions: BrightnessPrediction[];
} {
  if (observations.length < 3) {
    throw new Error('Need at least 3 observations to fit parameters');
  }

  // Convert observations to positions
  const dataPoints = observations.map(obs => {
    const date = new Date(obs.date);
    const r = calculateHeliocentricDistance(date);
    const delta = calculateGeocentricDistance(date, r);
    const phase = calculatePhaseAngle(r, delta);

    return {
      magnitude: obs.magnitude,
      logR: Math.log10(r),
      logDelta: Math.log10(delta),
      phase: phase,
      date: date
    };
  });

  // Least squares fitting for M1 and K1
  // m = M1 + 5*log(Δ) + K1*log(r) + β*α
  // Rearranged: m - 5*log(Δ) - β*α = M1 + K1*log(r)

  const beta = ATLAS_3I_ORBITAL_DATA.phaseCoefficient;
  const n = dataPoints.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const point of dataPoints) {
    const x = point.logR; // log(r)
    const y = point.magnitude - 5 * point.logDelta - beta * point.phase; // adjusted magnitude

    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  // Linear regression: y = a + b*x
  // where a = M1, b = K1
  const K1 = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const M1 = (sumY - K1 * sumX) / n;

  // Calculate R²
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;

  for (const point of dataPoints) {
    const x = point.logR;
    const yActual = point.magnitude - 5 * point.logDelta - beta * point.phase;
    const yPredicted = M1 + K1 * x;

    ssRes += (yActual - yPredicted) ** 2;
    ssTot += (yActual - yMean) ** 2;
  }

  const rSquared = 1 - (ssRes / ssTot);

  // Generate predictions using fitted parameters
  const startDate = new Date(Math.min(...dataPoints.map(p => p.date.getTime())));
  const endDate = new Date(Math.max(...dataPoints.map(p => p.date.getTime())));

  // Extend predictions beyond observation period
  startDate.setDate(startDate.getDate() - 30);
  endDate.setDate(endDate.getDate() + 60);

  const predictions = generateBrightnessPredictions(startDate, endDate, 1).map(pred => ({
    ...pred,
    magnitude: calculateCometMagnitude(
      pred.heliocentricDistance,
      pred.geocentricDistance,
      pred.phaseAngle,
      M1,
      K1,
      beta
    )
  }));

  return {
    absoluteMagnitude: Math.round(M1 * 100) / 100,
    activityParameter: Math.round(K1 * 100) / 100,
    rSquared: Math.round(rSquared * 1000) / 1000,
    predictions
  };
}

/**
 * Calculate brightness trend analysis
 */
export function analyzeBrightnessTrend(observations: { date: string; magnitude: number }[]): {
  trend: 'brightening' | 'dimming' | 'stable';
  rate: number; // magnitudes per day
  perihelionPrediction: {
    date: string;
    magnitude: number;
    daysUntil: number;
  };
  confidence: number;
} {
  if (observations.length < 2) {
    throw new Error('Need at least 2 observations for trend analysis');
  }

  // Sort by date
  const sorted = observations
    .map(obs => ({
      ...obs,
      dateObj: new Date(obs.date),
      daysSinceStart: 0
    }))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  const startTime = sorted[0].dateObj.getTime();
  sorted.forEach(obs => {
    obs.daysSinceStart = (obs.dateObj.getTime() - startTime) / (1000 * 60 * 60 * 24);
  });

  // Linear regression to find rate
  const n = sorted.length;
  const sumX = sorted.reduce((sum, obs) => sum + obs.daysSinceStart, 0);
  const sumY = sorted.reduce((sum, obs) => sum + obs.magnitude, 0);
  const sumXY = sorted.reduce((sum, obs) => sum + obs.daysSinceStart * obs.magnitude, 0);
  const sumX2 = sorted.reduce((sum, obs) => sum + obs.daysSinceStart * obs.daysSinceStart, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Determine trend
  let trend: 'brightening' | 'dimming' | 'stable';
  if (slope < -0.01) trend = 'brightening'; // Magnitude decreasing = brighter
  else if (slope > 0.01) trend = 'dimming';  // Magnitude increasing = dimmer
  else trend = 'stable';

  // Calculate confidence (R²)
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;

  for (const obs of sorted) {
    const yPredicted = intercept + slope * obs.daysSinceStart;
    ssRes += (obs.magnitude - yPredicted) ** 2;
    ssTot += (obs.magnitude - yMean) ** 2;
  }

  const confidence = Math.max(0, 1 - (ssRes / ssTot));

  // Predict perihelion brightness
  const perihelionDate = ATLAS_3I_ORBITAL_DATA.perihelionDate;
  const daysUntilPerihelion = (perihelionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  const daysSinceStart = (perihelionDate.getTime() - startTime) / (1000 * 60 * 60 * 24);
  const perihelionMagnitude = intercept + slope * daysSinceStart;

  return {
    trend,
    rate: Math.round(Math.abs(slope) * 1000) / 1000,
    perihelionPrediction: {
      date: perihelionDate.toISOString(),
      magnitude: Math.round(perihelionMagnitude * 100) / 100,
      daysUntil: Math.round(daysUntilPerihelion)
    },
    confidence: Math.round(confidence * 1000) / 1000
  };
}