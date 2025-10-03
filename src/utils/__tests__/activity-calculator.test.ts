/**
 * Tests for activity level calculations
 * HIGH PRIORITY - Data transformations and quality mappings
 */

import { describe, it, expect } from 'vitest';
import {
  calculateActivityLevel,
  calculateActivityFromAPIData,
  ActivityCalculation,
} from '../activity-calculator';
import {
  SAMPLE_COBS_OBSERVATIONS,
  SAMPLE_JPL_DATA,
  INVALID_OBSERVATIONS,
} from '@/__tests__/fixtures/sample-observations';

describe('Activity Calculator', () => {
  describe('calculateActivityLevel', () => {
    it('should calculate LOW activity for dim comet', () => {
      // Calculate expected magnitude for LOW activity
      const heliocentric_distance = 1.5;
      const absoluteMagnitude = 15.5;
      const phaseCoeff = 4.0;
      const expectedMag = absoluteMagnitude + 5 * Math.log10(heliocentric_distance) + phaseCoeff * Math.log10(heliocentric_distance);
      const currentMagnitude = expectedMag - 0.3; // Slightly brighter, but still LOW

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      expect(result.level).toBe('LOW');
      expect(result.currentMagnitude).toBe(currentMagnitude);
      expect(result.heliocentric_distance).toBe(1.5);
      expect(result.brightnessDelta).toBeLessThanOrEqual(0.5);
    });

    it('should calculate MODERATE activity for moderately bright comet', () => {
      // Calculate expected magnitude for MODERATE activity
      const heliocentric_distance = 1.5;
      const absoluteMagnitude = 15.5;
      const phaseCoeff = 4.0;
      const expectedMag = absoluteMagnitude + 5 * Math.log10(heliocentric_distance) + phaseCoeff * Math.log10(heliocentric_distance);
      const currentMagnitude = expectedMag - 0.7; // Brighter for MODERATE

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      expect(result.level).toBe('MODERATE');
      expect(result.brightnessDelta).toBeGreaterThan(0.5);
      expect(result.brightnessDelta).toBeLessThanOrEqual(1.0);
    });

    it('should calculate HIGH activity for bright comet', () => {
      // Calculate expected magnitude for HIGH activity
      const heliocentric_distance = 1.5;
      const absoluteMagnitude = 15.5;
      const phaseCoeff = 4.0;
      const expectedMag = absoluteMagnitude + 5 * Math.log10(heliocentric_distance) + phaseCoeff * Math.log10(heliocentric_distance);
      const currentMagnitude = expectedMag - 1.5; // Much brighter for HIGH

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      expect(result.level).toBe('HIGH');
      expect(result.brightnessDelta).toBeGreaterThan(1.0);
      expect(result.brightnessDelta).toBeLessThanOrEqual(2.0);
    });

    it('should calculate EXTREME activity for very bright comet', () => {
      const currentMagnitude = 10.5;
      const heliocentric_distance = 1.5;

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      expect(result.level).toBe('EXTREME');
      expect(result.brightnessDelta).toBeGreaterThan(2.0);
    });

    it('should calculate expected magnitude based on distance', () => {
      const currentMagnitude = 14.0;
      const heliocentric_distance = 2.0;

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      // Expected magnitude should be calculated using the formula
      const absoluteMagnitude = 15.5;
      const phaseCoeff = 4.0;
      const expectedMag = absoluteMagnitude + 5 * Math.log10(heliocentric_distance) + phaseCoeff * Math.log10(heliocentric_distance);

      expect(result.expectedMagnitude).toBeCloseTo(expectedMag, 1);
    });

    it('should round brightness delta to 1 decimal place', () => {
      const currentMagnitude = 13.333;
      const heliocentric_distance = 1.456;

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      // Check that brightnessDelta has max 1 decimal place
      expect(result.brightnessDelta).toBe(Number(result.brightnessDelta.toFixed(1)));
    });

    it('should handle edge case at perihelion distance', () => {
      const currentMagnitude = 12.3;
      const heliocentric_distance = 1.356320; // Exact perihelion distance

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      expect(result.level).toBeOneOf(['LOW', 'MODERATE', 'HIGH', 'EXTREME']);
      expect(Number.isFinite(result.brightnessDelta)).toBe(true);
      expect(Number.isFinite(result.expectedMagnitude)).toBe(true);
    });

    it('should handle very close distance (near Sun)', () => {
      const currentMagnitude = 11.0;
      const heliocentric_distance = 0.5; // Very close

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      expect(result.level).toBeOneOf(['LOW', 'MODERATE', 'HIGH', 'EXTREME']);
      expect(Number.isFinite(result.brightnessDelta)).toBe(true);
    });

    it('should handle far distance (outgoing)', () => {
      const currentMagnitude = 18.0;
      const heliocentric_distance = 5.0; // Far from Sun

      const result = calculateActivityLevel(currentMagnitude, heliocentric_distance);

      expect(result.level).toBeOneOf(['LOW', 'MODERATE', 'HIGH', 'EXTREME']);
      expect(Number.isFinite(result.brightnessDelta)).toBe(true);
    });
  });

  describe('calculateActivityFromAPIData', () => {
    it('should calculate activity from valid observations and JPL data', () => {
      const result = calculateActivityFromAPIData(
        SAMPLE_COBS_OBSERVATIONS,
        SAMPLE_JPL_DATA
      );

      expect(result.level).not.toBe('INSUFFICIENT_DATA');
      expect(result.currentMagnitude).toBe(SAMPLE_COBS_OBSERVATIONS[SAMPLE_COBS_OBSERVATIONS.length - 1].magnitude);
      expect(result.heliocentric_distance).toBe(SAMPLE_JPL_DATA.ephemeris.r);
    });

    it('should use latest observation for magnitude', () => {
      const observations = [
        { date: '2025-10-20T00:00:00.000Z', magnitude: 15.0, observer: 'A', instrument: 'T1', uncertainty: 0.3 },
        { date: '2025-10-22T00:00:00.000Z', magnitude: 14.5, observer: 'B', instrument: 'T2', uncertainty: 0.2 },
        { date: '2025-10-25T00:00:00.000Z', magnitude: 14.0, observer: 'C', instrument: 'T3', uncertainty: 0.25 },
      ];

      const result = calculateActivityFromAPIData(observations, SAMPLE_JPL_DATA);

      expect(result.currentMagnitude).toBe(14.0); // Latest magnitude
    });

    it('should return INSUFFICIENT_DATA when observations are empty', () => {
      const result = calculateActivityFromAPIData([], SAMPLE_JPL_DATA);

      expect(result.level).toBe('INSUFFICIENT_DATA');
      expect(result.brightnessDelta).toBe(0);
      expect(result.currentMagnitude).toBe(0);
      expect(result.expectedMagnitude).toBe(0);
      expect(result.heliocentric_distance).toBe(0);
    });

    it('should return INSUFFICIENT_DATA when JPL data is null', () => {
      const result = calculateActivityFromAPIData(SAMPLE_COBS_OBSERVATIONS, null);

      expect(result.level).toBe('INSUFFICIENT_DATA');
    });

    it('should return INSUFFICIENT_DATA when JPL ephemeris is missing', () => {
      const result = calculateActivityFromAPIData(SAMPLE_COBS_OBSERVATIONS, {});

      expect(result.level).toBe('INSUFFICIENT_DATA');
    });

    it('should return INSUFFICIENT_DATA when heliocentric distance is missing', () => {
      const jplDataWithoutR = {
        ephemeris: {
          delta: 0.98,
          phase: 35.2,
        },
      };

      const result = calculateActivityFromAPIData(SAMPLE_COBS_OBSERVATIONS, jplDataWithoutR);

      expect(result.level).toBe('INSUFFICIENT_DATA');
    });

    it('should handle observation with null magnitude', () => {
      const observations = [
        { date: '2025-10-20T00:00:00.000Z', magnitude: 15.0, observer: 'A', instrument: 'T1', uncertainty: 0.3 },
        { date: '2025-10-22T00:00:00.000Z', magnitude: null as unknown as number, observer: 'B', instrument: 'T2', uncertainty: 0.2 },
      ];

      const result = calculateActivityFromAPIData(observations, SAMPLE_JPL_DATA);

      expect(result.level).toBe('INSUFFICIENT_DATA');
    });

    it('should handle observation with undefined magnitude', () => {
      const observations = [
        { date: '2025-10-20T00:00:00.000Z', magnitude: 15.0, observer: 'A', instrument: 'T1', uncertainty: 0.3 },
        { date: '2025-10-22T00:00:00.000Z', magnitude: undefined as unknown as number, observer: 'B', instrument: 'T2', uncertainty: 0.2 },
      ];

      const result = calculateActivityFromAPIData(observations, SAMPLE_JPL_DATA);

      expect(result.level).toBe('INSUFFICIENT_DATA');
    });

    it('should pass through to calculateActivityLevel for valid data', () => {
      const observations = [
        { date: '2025-10-29T00:00:00.000Z', magnitude: 12.3, observer: 'Observer', instrument: 'Telescope', uncertainty: 0.2 },
      ];

      const jplData = {
        ephemeris: {
          r: 1.356320, // Perihelion distance
        },
      };

      const result = calculateActivityFromAPIData(observations, jplData);

      // Should match direct calculation
      const directResult = calculateActivityLevel(12.3, 1.356320);

      expect(result.level).toBe(directResult.level);
      expect(result.brightnessDelta).toBe(directResult.brightnessDelta);
      expect(result.currentMagnitude).toBe(directResult.currentMagnitude);
      expect(result.expectedMagnitude).toBe(directResult.expectedMagnitude);
      expect(result.heliocentric_distance).toBe(directResult.heliocentric_distance);
    });
  });

  describe('Activity Level Boundaries', () => {
    it('should correctly classify at LOW/MODERATE boundary', () => {
      const heliocentric_distance = 1.5;

      // Calculate expected magnitude
      const absoluteMagnitude = 15.5;
      const phaseCoeff = 4.0;
      const expectedMag = absoluteMagnitude + 5 * Math.log10(heliocentric_distance) + phaseCoeff * Math.log10(heliocentric_distance);

      // Test just below boundary (LOW)
      const lowMag = expectedMag - 0.49;
      const lowResult = calculateActivityLevel(lowMag, heliocentric_distance);
      expect(lowResult.level).toBe('LOW');

      // Test just above boundary (MODERATE)
      const moderateMag = expectedMag - 0.51;
      const moderateResult = calculateActivityLevel(moderateMag, heliocentric_distance);
      expect(moderateResult.level).toBe('MODERATE');
    });

    it('should correctly classify at MODERATE/HIGH boundary', () => {
      const heliocentric_distance = 1.5;
      const absoluteMagnitude = 15.5;
      const phaseCoeff = 4.0;
      const expectedMag = absoluteMagnitude + 5 * Math.log10(heliocentric_distance) + phaseCoeff * Math.log10(heliocentric_distance);

      // Test just below boundary (MODERATE)
      const moderateMag = expectedMag - 0.99;
      const moderateResult = calculateActivityLevel(moderateMag, heliocentric_distance);
      expect(moderateResult.level).toBe('MODERATE');

      // Test just above boundary (HIGH)
      const highMag = expectedMag - 1.01;
      const highResult = calculateActivityLevel(highMag, heliocentric_distance);
      expect(highResult.level).toBe('HIGH');
    });

    it('should correctly classify at HIGH/EXTREME boundary', () => {
      const heliocentric_distance = 1.5;
      const absoluteMagnitude = 15.5;
      const phaseCoeff = 4.0;
      const expectedMag = absoluteMagnitude + 5 * Math.log10(heliocentric_distance) + phaseCoeff * Math.log10(heliocentric_distance);

      // Test just below boundary (HIGH)
      const highMag = expectedMag - 1.99;
      const highResult = calculateActivityLevel(highMag, heliocentric_distance);
      expect(highResult.level).toBe('HIGH');

      // Test just above boundary (EXTREME)
      const extremeMag = expectedMag - 2.01;
      const extremeResult = calculateActivityLevel(extremeMag, heliocentric_distance);
      expect(extremeResult.level).toBe('EXTREME');
    });
  });
});
