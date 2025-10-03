/**
 * Tests for comet brightness prediction models
 * HIGH PRIORITY - Brightness predictions and trend analysis
 */

import { describe, it, expect } from 'vitest';
import {
  ATLAS_3I_ORBITAL_DATA,
  calculateHeliocentricDistance,
  calculateGeocentricDistance,
  calculatePhaseAngle,
  calculateCometMagnitude,
  generateBrightnessPredictions,
  fitCometParameters,
  analyzeBrightnessTrend,
} from '../comet-brightness-models';
import {
  BRIGHTENING_OBSERVATIONS,
  DIMMING_OBSERVATIONS,
} from '@/__tests__/fixtures/sample-observations';

describe('Comet Brightness Models', () => {
  describe('ATLAS_3I_ORBITAL_DATA', () => {
    it('should have correct perihelion date', () => {
      expect(ATLAS_3I_ORBITAL_DATA.perihelionDate).toEqual(new Date('2025-10-29T11:35:31Z'));
    });

    it('should have hyperbolic eccentricity (e > 1)', () => {
      expect(ATLAS_3I_ORBITAL_DATA.eccentricity).toBeGreaterThan(1);
    });

    it('should have positive perihelion distance', () => {
      expect(ATLAS_3I_ORBITAL_DATA.perihelionDistance).toBeGreaterThan(0);
    });

    it('should have valid orbital angles', () => {
      expect(ATLAS_3I_ORBITAL_DATA.argumentOfPerihelion).toBeGreaterThanOrEqual(0);
      expect(ATLAS_3I_ORBITAL_DATA.argumentOfPerihelion).toBeLessThan(360);

      expect(ATLAS_3I_ORBITAL_DATA.longitudeOfAscendingNode).toBeGreaterThanOrEqual(0);
      expect(ATLAS_3I_ORBITAL_DATA.longitudeOfAscendingNode).toBeLessThan(360);

      expect(ATLAS_3I_ORBITAL_DATA.inclination).toBeGreaterThanOrEqual(0);
      expect(ATLAS_3I_ORBITAL_DATA.inclination).toBeLessThan(180);
    });
  });

  describe('calculateHeliocentricDistance', () => {
    it('should return perihelion distance at perihelion date', () => {
      const distance = calculateHeliocentricDistance(ATLAS_3I_ORBITAL_DATA.perihelionDate);

      expect(distance).toBeCloseTo(ATLAS_3I_ORBITAL_DATA.perihelionDistance, 1);
    });

    it('should return greater distance before perihelion', () => {
      const perihelionDate = ATLAS_3I_ORBITAL_DATA.perihelionDate;
      const thirtyDaysBefore = new Date(perihelionDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const distance = calculateHeliocentricDistance(thirtyDaysBefore);

      expect(distance).toBeGreaterThan(ATLAS_3I_ORBITAL_DATA.perihelionDistance);
    });

    it('should return greater distance after perihelion', () => {
      const perihelionDate = ATLAS_3I_ORBITAL_DATA.perihelionDate;
      const thirtyDaysAfter = new Date(perihelionDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const distance = calculateHeliocentricDistance(thirtyDaysAfter);

      expect(distance).toBeGreaterThan(ATLAS_3I_ORBITAL_DATA.perihelionDistance);
    });

    it('should increase monotonically after perihelion', () => {
      const perihelionDate = ATLAS_3I_ORBITAL_DATA.perihelionDate;
      const tenDaysAfter = new Date(perihelionDate.getTime() + 10 * 24 * 60 * 60 * 1000);
      const thirtyDaysAfter = new Date(perihelionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAfter = new Date(perihelionDate.getTime() + 60 * 24 * 60 * 60 * 1000);

      const dist10 = calculateHeliocentricDistance(tenDaysAfter);
      const dist30 = calculateHeliocentricDistance(thirtyDaysAfter);
      const dist60 = calculateHeliocentricDistance(sixtyDaysAfter);

      expect(dist30).toBeGreaterThan(dist10);
      expect(dist60).toBeGreaterThan(dist30);
    });

    it('should return positive distances for all dates', () => {
      const dates = [
        new Date('2025-09-01T00:00:00Z'),
        new Date('2025-10-01T00:00:00Z'),
        new Date('2025-10-29T00:00:00Z'),
        new Date('2025-11-15T00:00:00Z'),
        new Date('2025-12-31T00:00:00Z'),
      ];

      for (const date of dates) {
        const distance = calculateHeliocentricDistance(date);
        expect(distance).toBeGreaterThan(0);
        expect(Number.isFinite(distance)).toBe(true);
      }
    });
  });

  describe('calculateGeocentricDistance', () => {
    it('should return positive distance', () => {
      const date = new Date('2025-10-29T00:00:00Z');
      const heliocentricDist = 1.5;

      const geocentricDist = calculateGeocentricDistance(date, heliocentricDist);

      expect(geocentricDist).toBeGreaterThan(0);
    });

    it('should enforce minimum distance for numerical stability', () => {
      const date = new Date('2025-10-29T00:00:00Z');
      const heliocentricDist = 0.01; // Very close

      const geocentricDist = calculateGeocentricDistance(date, heliocentricDist);

      expect(geocentricDist).toBeGreaterThanOrEqual(0.1);
    });

    it('should return finite values for various distances', () => {
      const date = new Date('2025-10-29T00:00:00Z');
      const distances = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0];

      for (const heliocentricDist of distances) {
        const geocentricDist = calculateGeocentricDistance(date, heliocentricDist);
        expect(Number.isFinite(geocentricDist)).toBe(true);
        expect(geocentricDist).toBeGreaterThan(0);
      }
    });

    it('should calculate reasonable geocentric distances', () => {
      const date = new Date('2025-10-29T00:00:00Z');
      const heliocentricDist = 1.5;

      const geocentricDist = calculateGeocentricDistance(date, heliocentricDist);

      // Should be within reasonable bounds (Earth's orbit ~1 AU, so max ~heliocentricDist + 1)
      expect(geocentricDist).toBeLessThan(heliocentricDist + 2);
    });
  });

  describe('calculatePhaseAngle', () => {
    it('should return angle in degrees between 0 and 180', () => {
      const heliocentricDist = 1.5;
      const geocentricDist = 1.2;

      const phaseAngle = calculatePhaseAngle(heliocentricDist, geocentricDist);

      expect(phaseAngle).toBeGreaterThanOrEqual(0);
      expect(phaseAngle).toBeLessThanOrEqual(180);
    });

    it('should handle edge case of very close distances', () => {
      const heliocentricDist = 0.5;
      const geocentricDist = 0.6;

      const phaseAngle = calculatePhaseAngle(heliocentricDist, geocentricDist);

      expect(Number.isFinite(phaseAngle)).toBe(true);
      expect(phaseAngle).toBeGreaterThanOrEqual(0);
      expect(phaseAngle).toBeLessThanOrEqual(180);
    });

    it('should handle edge case of far distances', () => {
      const heliocentricDist = 5.0;
      const geocentricDist = 4.5;

      const phaseAngle = calculatePhaseAngle(heliocentricDist, geocentricDist);

      expect(Number.isFinite(phaseAngle)).toBe(true);
      expect(phaseAngle).toBeGreaterThanOrEqual(0);
      expect(phaseAngle).toBeLessThanOrEqual(180);
    });

    it('should use law of cosines correctly', () => {
      // Test with known triangle
      const heliocentricDist = 1.5; // AU
      const geocentricDist = 1.0; // AU
      const earthSunDist = 1.0; // AU

      const phaseAngle = calculatePhaseAngle(heliocentricDist, geocentricDist);

      // Calculate expected using law of cosines
      const cosPhase = (
        heliocentricDist ** 2 + geocentricDist ** 2 - earthSunDist ** 2
      ) / (2 * heliocentricDist * geocentricDist);
      const expected = Math.acos(Math.max(-1, Math.min(1, cosPhase))) * 180 / Math.PI;

      expect(phaseAngle).toBeCloseTo(expected, 1);
    });
  });

  describe('calculateCometMagnitude', () => {
    it('should calculate magnitude using standard formula', () => {
      const heliocentricDist = 1.5;
      const geocentricDist = 1.2;
      const phaseAngle = 30;

      const magnitude = calculateCometMagnitude(heliocentricDist, geocentricDist, phaseAngle);

      expect(Number.isFinite(magnitude)).toBe(true);
      expect(magnitude).toBeGreaterThan(0); // Comet magnitudes are positive
    });

    it('should return brighter magnitude (smaller number) when closer to Sun', () => {
      const geocentricDist = 1.2;
      const phaseAngle = 30;

      const magClose = calculateCometMagnitude(1.0, geocentricDist, phaseAngle);
      const magFar = calculateCometMagnitude(2.0, geocentricDist, phaseAngle);

      expect(magClose).toBeLessThan(magFar); // Brighter = smaller magnitude
    });

    it('should return brighter magnitude when closer to Earth', () => {
      const heliocentricDist = 1.5;
      const phaseAngle = 30;

      const magClose = calculateCometMagnitude(heliocentricDist, 0.8, phaseAngle);
      const magFar = calculateCometMagnitude(heliocentricDist, 2.0, phaseAngle);

      expect(magClose).toBeLessThan(magFar);
    });

    it('should use provided parameters correctly', () => {
      const heliocentricDist = 1.5;
      const geocentricDist = 1.2;
      const phaseAngle = 30;
      const H = 7.1;
      const n = 6.0;
      const beta = 0.04;

      const magnitude = calculateCometMagnitude(heliocentricDist, geocentricDist, phaseAngle, H, n, beta);

      // Calculate expected manually
      const expected = H + 5 * Math.log10(geocentricDist) + n * Math.log10(heliocentricDist) + beta * phaseAngle;

      expect(magnitude).toBeCloseTo(expected, 5);
    });

    it('should use default ATLAS parameters when not provided', () => {
      const heliocentricDist = 1.5;
      const geocentricDist = 1.2;
      const phaseAngle = 30;

      const magDefault = calculateCometMagnitude(heliocentricDist, geocentricDist, phaseAngle);
      const magExplicit = calculateCometMagnitude(
        heliocentricDist,
        geocentricDist,
        phaseAngle,
        ATLAS_3I_ORBITAL_DATA.absoluteMagnitude,
        ATLAS_3I_ORBITAL_DATA.activityParameter,
        ATLAS_3I_ORBITAL_DATA.phaseCoefficient
      );

      expect(magDefault).toBeCloseTo(magExplicit, 5);
    });
  });

  describe('generateBrightnessPredictions', () => {
    it('should generate predictions for date range', () => {
      const startDate = new Date('2025-10-01T00:00:00Z');
      const endDate = new Date('2025-10-10T00:00:00Z');

      const predictions = generateBrightnessPredictions(startDate, endDate, 1);

      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.length).toBe(10); // 10 days inclusive
    });

    it('should have correct prediction structure', () => {
      const startDate = new Date('2025-10-29T00:00:00Z');
      const endDate = new Date('2025-10-30T00:00:00Z');

      const predictions = generateBrightnessPredictions(startDate, endDate, 1);

      expect(predictions.length).toBeGreaterThan(0);

      const prediction = predictions[0];
      expect(prediction).toHaveProperty('date');
      expect(prediction).toHaveProperty('magnitude');
      expect(prediction).toHaveProperty('heliocentricDistance');
      expect(prediction).toHaveProperty('geocentricDistance');
      expect(prediction).toHaveProperty('phaseAngle');
      expect(prediction).toHaveProperty('uncertainty');
    });

    it('should generate predictions in chronological order', () => {
      const startDate = new Date('2025-10-01T00:00:00Z');
      const endDate = new Date('2025-10-10T00:00:00Z');

      const predictions = generateBrightnessPredictions(startDate, endDate, 1);

      for (let i = 1; i < predictions.length; i++) {
        const prevDate = new Date(predictions[i - 1].date);
        const currDate = new Date(predictions[i].date);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });

    it('should respect interval parameter', () => {
      const startDate = new Date('2025-10-01T00:00:00Z');
      const endDate = new Date('2025-10-10T00:00:00Z');

      const predictions1 = generateBrightnessPredictions(startDate, endDate, 1);
      const predictions2 = generateBrightnessPredictions(startDate, endDate, 2);

      expect(predictions1.length).toBeGreaterThan(predictions2.length);
    });

    it('should round values to appropriate precision', () => {
      const startDate = new Date('2025-10-29T00:00:00Z');
      const endDate = new Date('2025-10-30T00:00:00Z');

      const predictions = generateBrightnessPredictions(startDate, endDate, 1);

      for (const prediction of predictions) {
        // Magnitude: 2 decimal places
        expect(prediction.magnitude).toBe(Math.round(prediction.magnitude * 100) / 100);

        // Distances: 3 decimal places
        expect(prediction.heliocentricDistance).toBe(Math.round(prediction.heliocentricDistance * 1000) / 1000);
        expect(prediction.geocentricDistance).toBe(Math.round(prediction.geocentricDistance * 1000) / 1000);

        // Phase angle: 1 decimal place
        expect(prediction.phaseAngle).toBe(Math.round(prediction.phaseAngle * 10) / 10);

        // Uncertainty: 2 decimal places
        expect(prediction.uncertainty).toBe(Math.round(prediction.uncertainty * 100) / 100);
      }
    });

    it('should calculate increasing uncertainty with distance', () => {
      const startDate = new Date('2025-10-01T00:00:00Z');
      const endDate = new Date('2025-11-30T00:00:00Z');

      const predictions = generateBrightnessPredictions(startDate, endDate, 10);

      // Uncertainty should generally increase with time (as comet moves away)
      const firstUncertainty = predictions[0].uncertainty;
      const lastUncertainty = predictions[predictions.length - 1].uncertainty;

      expect(lastUncertainty).toBeGreaterThanOrEqual(firstUncertainty);
    });
  });

  describe('fitCometParameters', () => {
    it('should fit parameters from observations', () => {
      const result = fitCometParameters(BRIGHTENING_OBSERVATIONS);

      expect(result).toHaveProperty('absoluteMagnitude');
      expect(result).toHaveProperty('activityParameter');
      expect(result).toHaveProperty('rSquared');
      expect(result).toHaveProperty('predictions');

      expect(Number.isFinite(result.absoluteMagnitude)).toBe(true);
      expect(Number.isFinite(result.activityParameter)).toBe(true);
      expect(Number.isFinite(result.rSquared)).toBe(true);
    });

    it('should throw error with insufficient observations', () => {
      const twoObs = BRIGHTENING_OBSERVATIONS.slice(0, 2);

      expect(() => fitCometParameters(twoObs)).toThrow('Need at least 3 observations');
    });

    it('should calculate R² between 0 and 1', () => {
      const result = fitCometParameters(BRIGHTENING_OBSERVATIONS);

      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });

    it('should generate predictions beyond observation period', () => {
      const result = fitCometParameters(BRIGHTENING_OBSERVATIONS);

      const obsDates = BRIGHTENING_OBSERVATIONS.map(obs => new Date(obs.date).getTime());
      const minObsDate = Math.min(...obsDates);
      const maxObsDate = Math.max(...obsDates);

      const predDates = result.predictions.map(pred => new Date(pred.date).getTime());
      const minPredDate = Math.min(...predDates);
      const maxPredDate = Math.max(...predDates);

      // Predictions should extend beyond observations
      expect(minPredDate).toBeLessThan(minObsDate);
      expect(maxPredDate).toBeGreaterThan(maxObsDate);
    });

    it('should round fitted parameters appropriately', () => {
      const result = fitCometParameters(BRIGHTENING_OBSERVATIONS);

      // Parameters rounded to 2 decimal places
      expect(result.absoluteMagnitude).toBe(Math.round(result.absoluteMagnitude * 100) / 100);
      expect(result.activityParameter).toBe(Math.round(result.activityParameter * 100) / 100);

      // R² rounded to 3 decimal places
      expect(result.rSquared).toBe(Math.round(result.rSquared * 1000) / 1000);
    });
  });

  describe('analyzeBrightnessTrend', () => {
    it('should detect brightening trend', () => {
      const result = analyzeBrightnessTrend(BRIGHTENING_OBSERVATIONS);

      expect(result.trend).toBe('brightening');
      expect(result.rate).toBeGreaterThan(0);
    });

    it('should detect dimming trend', () => {
      const result = analyzeBrightnessTrend(DIMMING_OBSERVATIONS);

      expect(result.trend).toBe('dimming');
      expect(result.rate).toBeGreaterThan(0);
    });

    it('should throw error with insufficient observations', () => {
      const oneObs = BRIGHTENING_OBSERVATIONS.slice(0, 1);

      expect(() => analyzeBrightnessTrend(oneObs)).toThrow('Need at least 2 observations');
    });

    it('should calculate perihelion prediction', () => {
      const result = analyzeBrightnessTrend(BRIGHTENING_OBSERVATIONS);

      expect(result.perihelionPrediction).toHaveProperty('date');
      expect(result.perihelionPrediction).toHaveProperty('magnitude');
      expect(result.perihelionPrediction).toHaveProperty('daysUntil');

      expect(Number.isFinite(result.perihelionPrediction.magnitude)).toBe(true);
      expect(Number.isFinite(result.perihelionPrediction.daysUntil)).toBe(true);
    });

    it('should calculate confidence between 0 and 1', () => {
      const result = analyzeBrightnessTrend(BRIGHTENING_OBSERVATIONS);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should round values appropriately', () => {
      const result = analyzeBrightnessTrend(BRIGHTENING_OBSERVATIONS);

      // Rate: 3 decimal places
      expect(result.rate).toBe(Math.round(result.rate * 1000) / 1000);

      // Magnitude: 2 decimal places
      expect(result.perihelionPrediction.magnitude).toBe(
        Math.round(result.perihelionPrediction.magnitude * 100) / 100
      );

      // Days: integer
      expect(result.perihelionPrediction.daysUntil).toBe(
        Math.round(result.perihelionPrediction.daysUntil)
      );

      // Confidence: 3 decimal places
      expect(result.confidence).toBe(Math.round(result.confidence * 1000) / 1000);
    });

    it('should detect stable trend for constant magnitudes', () => {
      const stableObs = [
        { date: '2025-10-01T00:00:00.000Z', magnitude: 14.0 },
        { date: '2025-10-05T00:00:00.000Z', magnitude: 14.005 },
        { date: '2025-10-10T00:00:00.000Z', magnitude: 13.995 },
      ];

      const result = analyzeBrightnessTrend(stableObs);

      expect(result.trend).toBe('stable');
    });

    it('should handle observations out of order', () => {
      const unordered = [
        { date: '2025-10-10T00:00:00.000Z', magnitude: 13.0 },
        { date: '2025-10-01T00:00:00.000Z', magnitude: 15.0 },
        { date: '2025-10-05T00:00:00.000Z', magnitude: 14.0 },
      ];

      const result = analyzeBrightnessTrend(unordered);

      // Should still detect brightening trend
      expect(result.trend).toBe('brightening');
    });
  });
});
