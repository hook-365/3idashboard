/**
 * Tests for orbital mechanics calculations
 * HIGHEST PRIORITY - Math errors here = wrong positions
 */

import { describe, it, expect } from 'vitest';
import {
  equatorialToEcliptic,
  calculatePositionFromElements,
  calculateAtlasProjectionFromStateVectors,
  calculateAtlasTrailFromOrbit,
} from '../orbital-calculations';
import { ATLAS_3I_ORBITAL_ELEMENTS } from '@/__tests__/fixtures/sample-observations';

describe('Orbital Calculations', () => {
  describe('equatorialToEcliptic', () => {
    it('should convert equatorial coordinates to ecliptic coordinates', () => {
      // Test with simple unit vector along x-axis
      const result = equatorialToEcliptic(1, 0, 0);
      expect(result.x).toBeCloseTo(1, 5);
      expect(result.y).toBeCloseTo(0, 5);
      expect(result.z).toBeCloseTo(0, 5);
    });

    it('should apply obliquity rotation correctly for y-axis', () => {
      // Test with unit vector along y-axis
      const result = equatorialToEcliptic(0, 1, 0);
      const obliquity = 23.4392811 * Math.PI / 180;

      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(Math.cos(obliquity), 5);
      expect(result.z).toBeCloseTo(-Math.sin(obliquity), 5);
    });

    it('should apply obliquity rotation correctly for z-axis', () => {
      // Test with unit vector along z-axis
      const result = equatorialToEcliptic(0, 0, 1);
      const obliquity = 23.4392811 * Math.PI / 180;

      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(Math.sin(obliquity), 5);
      expect(result.z).toBeCloseTo(Math.cos(obliquity), 5);
    });

    it('should preserve vector magnitude', () => {
      const x = 1.5, y = 2.3, z = -0.8;
      const inputMagnitude = Math.sqrt(x*x + y*y + z*z);

      const result = equatorialToEcliptic(x, y, z);
      const outputMagnitude = Math.sqrt(
        result.x * result.x +
        result.y * result.y +
        result.z * result.z
      );

      expect(outputMagnitude).toBeCloseTo(inputMagnitude, 5);
    });
  });

  describe('calculatePositionFromElements', () => {
    const elements = {
      e: ATLAS_3I_ORBITAL_ELEMENTS.eccentricity,
      q: ATLAS_3I_ORBITAL_ELEMENTS.perihelionDistance,
      i: ATLAS_3I_ORBITAL_ELEMENTS.inclination,
      omega: ATLAS_3I_ORBITAL_ELEMENTS.argumentOfPerihelion,
      node: ATLAS_3I_ORBITAL_ELEMENTS.longitudeOfAscendingNode,
    };

    it('should calculate position at perihelion correctly', () => {
      const position = calculatePositionFromElements(0, elements);

      // At perihelion (days = 0), distance should equal perihelion distance
      const distance = Math.sqrt(
        position.x * position.x +
        position.y * position.y +
        position.z * position.z
      );

      expect(distance).toBeCloseTo(elements.q, 2);
    });

    it('should calculate increasing distance before perihelion', () => {
      const pos30DaysBefore = calculatePositionFromElements(-30, elements);
      const pos10DaysBefore = calculatePositionFromElements(-10, elements);

      const dist30 = Math.sqrt(
        pos30DaysBefore.x ** 2 +
        pos30DaysBefore.y ** 2 +
        pos30DaysBefore.z ** 2
      );
      const dist10 = Math.sqrt(
        pos10DaysBefore.x ** 2 +
        pos10DaysBefore.y ** 2 +
        pos10DaysBefore.z ** 2
      );

      // Distance should decrease as approaching perihelion
      expect(dist30).toBeGreaterThan(dist10);
    });

    it('should calculate increasing distance after perihelion', () => {
      const pos10DaysAfter = calculatePositionFromElements(10, elements);
      const pos30DaysAfter = calculatePositionFromElements(30, elements);

      const dist10 = Math.sqrt(
        pos10DaysAfter.x ** 2 +
        pos10DaysAfter.y ** 2 +
        pos10DaysAfter.z ** 2
      );
      const dist30 = Math.sqrt(
        pos30DaysAfter.x ** 2 +
        pos30DaysAfter.y ** 2 +
        pos30DaysAfter.z ** 2
      );

      // Distance should increase after perihelion
      expect(dist30).toBeGreaterThan(dist10);
    });

    it('should produce valid coordinates for hyperbolic orbit', () => {
      const position = calculatePositionFromElements(60, elements);

      // All coordinates should be finite numbers
      expect(Number.isFinite(position.x)).toBe(true);
      expect(Number.isFinite(position.y)).toBe(true);
      expect(Number.isFinite(position.z)).toBe(true);

      // Distance should be reasonable for a hyperbolic orbit
      const distance = Math.sqrt(
        position.x ** 2 + position.y ** 2 + position.z ** 2
      );
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100); // Within solar system scale
    });

    it('should handle edge case at exact perihelion', () => {
      const position = calculatePositionFromElements(0, elements);

      const distance = Math.sqrt(
        position.x ** 2 + position.y ** 2 + position.z ** 2
      );

      // Should be very close to perihelion distance
      expect(distance).toBeCloseTo(ATLAS_3I_ORBITAL_ELEMENTS.perihelionDistance, 1);
    });

    it('should produce different positions for different times', () => {
      const pos1 = calculatePositionFromElements(-30, elements);
      const pos2 = calculatePositionFromElements(30, elements);

      // Positions should be different
      expect(pos1.x).not.toBeCloseTo(pos2.x, 1);
      expect(pos1.y).not.toBeCloseTo(pos2.y, 1);
      expect(pos1.z).not.toBeCloseTo(pos2.z, 1);
    });
  });

  describe('calculateAtlasProjectionFromStateVectors', () => {
    const startDate = new Date('2025-10-29T00:00:00Z');
    const position: [number, number, number] = [1.0, 0.5, 0.1];
    const velocity: [number, number, number] = [0.01, 0.02, -0.001];

    it('should generate projection points with correct structure', () => {
      const projection = calculateAtlasProjectionFromStateVectors(
        10,
        startDate,
        position,
        velocity
      );

      expect(projection.length).toBeGreaterThan(0);

      // Check first point structure
      const firstPoint = projection[0];
      expect(firstPoint).toHaveProperty('date');
      expect(firstPoint).toHaveProperty('x');
      expect(firstPoint).toHaveProperty('y');
      expect(firstPoint).toHaveProperty('z');
      expect(firstPoint).toHaveProperty('distance_from_sun');
    });

    it('should start from initial position', () => {
      const projection = calculateAtlasProjectionFromStateVectors(
        10,
        startDate,
        position,
        velocity
      );

      const firstPoint = projection[0];
      expect(firstPoint.x).toBeCloseTo(position[0], 3);
      expect(firstPoint.y).toBeCloseTo(position[1], 3);
      expect(firstPoint.z).toBeCloseTo(position[2], 3);
    });

    it('should calculate distances correctly', () => {
      const projection = calculateAtlasProjectionFromStateVectors(
        10,
        startDate,
        position,
        velocity
      );

      for (const point of projection) {
        const calculatedDistance = Math.sqrt(
          point.x ** 2 + point.y ** 2 + point.z ** 2
        );
        expect(point.distance_from_sun).toBeCloseTo(calculatedDistance, 5);
      }
    });

    it('should generate chronological dates', () => {
      const projection = calculateAtlasProjectionFromStateVectors(
        10,
        startDate,
        position,
        velocity
      );

      for (let i = 1; i < projection.length; i++) {
        const prevDate = new Date(projection[i - 1].date);
        const currDate = new Date(projection[i].date);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });

    it('should respect maximum distance cutoff', () => {
      const projection = calculateAtlasProjectionFromStateVectors(
        1000, // Long projection
        startDate,
        position,
        velocity
      );

      // All distances should be reasonable (not exceeding max distance)
      const maxDistance = Math.max(...projection.map(p => p.distance_from_sun));
      expect(maxDistance).toBeLessThan(150); // Should stop before getting too far
    });
  });

  describe('calculateAtlasTrailFromOrbit', () => {
    const currentPos: [number, number, number] = [1.5, 0.8, 0.2];
    const currentVel: [number, number, number] = [0.015, 0.01, -0.002];

    it('should generate trail points with correct structure', () => {
      const trail = calculateAtlasTrailFromOrbit(30, currentPos, currentVel);

      expect(trail.length).toBeGreaterThan(0);

      const firstPoint = trail[0];
      expect(firstPoint).toHaveProperty('date');
      expect(firstPoint).toHaveProperty('x');
      expect(firstPoint).toHaveProperty('y');
      expect(firstPoint).toHaveProperty('z');
      expect(firstPoint).toHaveProperty('distance_from_sun');
    });

    it('should calculate distances correctly in trail', () => {
      const trail = calculateAtlasTrailFromOrbit(30, currentPos, currentVel);

      for (const point of trail) {
        const calculatedDistance = Math.sqrt(
          point.x ** 2 + point.y ** 2 + point.z ** 2
        );
        expect(point.distance_from_sun).toBeCloseTo(calculatedDistance, 5);
      }
    });

    it('should generate trail in chronological order (oldest to newest)', () => {
      const trail = calculateAtlasTrailFromOrbit(30, currentPos, currentVel);

      for (let i = 1; i < trail.length; i++) {
        const prevDate = new Date(trail[i - 1].date);
        const currDate = new Date(trail[i].date);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });

    it('should limit trail to discovery date', () => {
      const trail = calculateAtlasTrailFromOrbit(365, currentPos, currentVel);

      // Discovery date: June 14, 2025
      const discoveryDate = new Date('2025-06-14T00:00:00Z');

      for (const point of trail) {
        const pointDate = new Date(point.date);
        expect(pointDate.getTime()).toBeGreaterThanOrEqual(discoveryDate.getTime());
      }
    });

    it('should end trail at current position (approximately)', () => {
      const trail = calculateAtlasTrailFromOrbit(30, currentPos, currentVel);

      const lastPoint = trail[trail.length - 1];

      // Last point should be close to current position
      // Allow some tolerance due to integration steps
      expect(lastPoint.x).toBeCloseTo(currentPos[0], 0);
      expect(lastPoint.y).toBeCloseTo(currentPos[1], 0);
      expect(lastPoint.z).toBeCloseTo(currentPos[2], 0);
    });

    it('should generate valid backward integration', () => {
      const trail = calculateAtlasTrailFromOrbit(60, currentPos, currentVel);

      // All positions should be finite
      for (const point of trail) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
        expect(Number.isFinite(point.z)).toBe(true);
        expect(point.distance_from_sun).toBeGreaterThan(0);
      }
    });
  });
});
