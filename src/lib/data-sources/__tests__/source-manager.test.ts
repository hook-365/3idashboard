/**
 * Tests for DataSourceManager multi-source data fetching
 * MEDIUM PRIORITY - API fallback logic and data merging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataSourceManager } from '../source-manager';

// Mock the data source modules
vi.mock('../../../services/cobs-api', () => ({
  cobsApi: {
    getObservations: vi.fn(),
  },
}));

vi.mock('../theskylive', () => ({
  getTheSkyLiveOrbitalData: vi.fn(),
}));

vi.mock('../jpl-horizons', () => ({
  getJPLHorizonsOrbitalData: vi.fn(),
  calculateOrbitalParameters: vi.fn(),
}));

import { cobsApi } from '../../../services/cobs-api';
import { getTheSkyLiveOrbitalData } from '../theskylive';
import { getJPLHorizonsOrbitalData, calculateOrbitalParameters } from '../jpl-horizons';

describe('DataSourceManager', () => {
  let manager: DataSourceManager;

  beforeEach(() => {
    manager = new DataSourceManager();
    vi.clearAllMocks();

    // Suppress console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock calculateOrbitalParameters to return valid data structure
    vi.mocked(calculateOrbitalParameters).mockReturnValue({
      current_velocity: 25.5, // km/s
      distance_from_sun: 1.45, // AU
      distance_from_earth: 0.98, // AU
      phase_angle: 35.2, // degrees
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create a new instance', () => {
      expect(manager).toBeInstanceOf(DataSourceManager);
    });
  });

  describe('getCometData', () => {
    it('should fetch data from all sources successfully', async () => {
      // Mock successful responses
      const mockObservations = [
        {
          date: '2025-10-29T00:00:00.000Z',
          magnitude: 12.3,
          observer: 'Test Observer',
          instrument: 'Test Telescope',
          uncertainty: 0.2,
        },
      ];

      const mockTheSkyLiveData = {
        name: '3I/ATLAS',
        ra: '10h 20m 30s',
        dec: '+15° 30\' 45"',
        magnitude: 12.5,
        distance: 1.5,
        elongation: 120,
      };

      const mockJPLData = {
        ephemeris: {
          r: 1.45,
          delta: 0.98,
          phase: 35.2,
          elongation: 145.8,
          magnitude: 12.4,
        },
        position: {
          x: 0.856,
          y: -1.123,
          z: 0.034,
        },
        velocity: {
          x: 0.0123,
          y: 0.0089,
          z: -0.0012,
        },
        state_vectors: {
          position: [0.856, -1.123, 0.034],
          velocity: [0.0123, 0.0089, -0.0012],
        },
      };

      vi.mocked(cobsApi.getObservations).mockResolvedValue(mockObservations);
      vi.mocked(getTheSkyLiveOrbitalData).mockResolvedValue(mockTheSkyLiveData);
      vi.mocked(getJPLHorizonsOrbitalData).mockResolvedValue(mockJPLData);

      const result = await manager.getCometData();

      expect(result).toBeDefined();
      expect(cobsApi.getObservations).toHaveBeenCalled();
      expect(getTheSkyLiveOrbitalData).toHaveBeenCalled();
      expect(getJPLHorizonsOrbitalData).toHaveBeenCalled();
    });

    it('should handle COBS failure gracefully', async () => {
      // Mock COBS failure
      vi.mocked(cobsApi.getObservations).mockRejectedValue(new Error('COBS API error'));

      // Mock other sources success
      vi.mocked(getTheSkyLiveOrbitalData).mockResolvedValue({
        name: '3I/ATLAS',
        ra: '10h 20m 30s',
        dec: '+15° 30\' 45"',
        magnitude: 12.5,
        distance: 1.5,
        elongation: 120,
      });

      vi.mocked(getJPLHorizonsOrbitalData).mockResolvedValue({
        ephemeris: { r: 1.45, delta: 0.98, phase: 35.2, elongation: 145.8, magnitude: 12.4 },
        position: { x: 0.856, y: -1.123, z: 0.034 },
        velocity: { x: 0.0123, y: 0.0089, z: -0.0012 },
        state_vectors: { position: [0.856, -1.123, 0.034], velocity: [0.0123, 0.0089, -0.0012] },
      });

      const result = await manager.getCometData();

      // Should still return data (with fallbacks)
      expect(result).toBeDefined();
    });

    it('should handle TheSkyLive failure gracefully', async () => {
      // Mock TheSkyLive failure
      vi.mocked(getTheSkyLiveOrbitalData).mockRejectedValue(new Error('TheSkyLive error'));

      // Mock other sources success
      vi.mocked(cobsApi.getObservations).mockResolvedValue([
        { date: '2025-10-29T00:00:00.000Z', magnitude: 12.3, observer: 'Test', instrument: 'Telescope', uncertainty: 0.2 },
      ]);

      vi.mocked(getJPLHorizonsOrbitalData).mockResolvedValue({
        ephemeris: { r: 1.45, delta: 0.98, phase: 35.2, elongation: 145.8, magnitude: 12.4 },
        position: { x: 0.856, y: -1.123, z: 0.034 },
        velocity: { x: 0.0123, y: 0.0089, z: -0.0012 },
        state_vectors: { position: [0.856, -1.123, 0.034], velocity: [0.0123, 0.0089, -0.0012] },
      });

      const result = await manager.getCometData();

      expect(result).toBeDefined();
    });

    it('should handle JPL failure gracefully', async () => {
      // Mock JPL failure
      vi.mocked(getJPLHorizonsOrbitalData).mockRejectedValue(new Error('JPL Horizons error'));

      // Mock other sources success
      vi.mocked(cobsApi.getObservations).mockResolvedValue([
        { date: '2025-10-29T00:00:00.000Z', magnitude: 12.3, observer: 'Test', instrument: 'Telescope', uncertainty: 0.2 },
      ]);

      vi.mocked(getTheSkyLiveOrbitalData).mockResolvedValue({
        name: '3I/ATLAS',
        ra: '10h 20m 30s',
        dec: '+15° 30\' 45"',
        magnitude: 12.5,
        distance: 1.5,
        elongation: 120,
      });

      const result = await manager.getCometData();

      expect(result).toBeDefined();
    });

    it('should handle all sources failing', async () => {
      // Mock all sources failing
      vi.mocked(cobsApi.getObservations).mockRejectedValue(new Error('COBS error'));
      vi.mocked(getTheSkyLiveOrbitalData).mockRejectedValue(new Error('TheSkyLive error'));
      vi.mocked(getJPLHorizonsOrbitalData).mockRejectedValue(new Error('JPL error'));

      const result = await manager.getCometData();

      // Should still return data (with mock fallbacks)
      expect(result).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should cache successful COBS requests', async () => {
      const mockObservations = [
        { date: '2025-10-29T00:00:00.000Z', magnitude: 12.3, observer: 'Test', instrument: 'Telescope', uncertainty: 0.2 },
      ];

      vi.mocked(cobsApi.getObservations).mockResolvedValue(mockObservations);
      vi.mocked(getTheSkyLiveOrbitalData).mockResolvedValue({
        name: '3I/ATLAS',
        ra: '10h 20m 30s',
        dec: '+15° 30\' 45"',
        magnitude: 12.5,
        distance: 1.5,
        elongation: 120,
      });
      vi.mocked(getJPLHorizonsOrbitalData).mockResolvedValue({
        ephemeris: { r: 1.45, delta: 0.98, phase: 35.2, elongation: 145.8, magnitude: 12.4 },
        position: { x: 0.856, y: -1.123, z: 0.034 },
        velocity: { x: 0.0123, y: 0.0089, z: -0.0012 },
        state_vectors: { position: [0.856, -1.123, 0.034], velocity: [0.0123, 0.0089, -0.0012] },
      });

      // First call
      await manager.getCometData();
      expect(cobsApi.getObservations).toHaveBeenCalledTimes(1);

      // Second call (should use cache)
      await manager.getCometData();
      expect(cobsApi.getObservations).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should respect cache TTL and refetch after expiry', async () => {
      const mockObservations = [
        { date: '2025-10-29T00:00:00.000Z', magnitude: 12.3, observer: 'Test', instrument: 'Telescope', uncertainty: 0.2 },
      ];

      vi.mocked(cobsApi.getObservations).mockResolvedValue(mockObservations);
      vi.mocked(getTheSkyLiveOrbitalData).mockResolvedValue({
        name: '3I/ATLAS',
        ra: '10h 20m 30s',
        dec: '+15° 30\' 45"',
        magnitude: 12.5,
        distance: 1.5,
        elongation: 120,
      });
      vi.mocked(getJPLHorizonsOrbitalData).mockResolvedValue({
        ephemeris: { r: 1.45, delta: 0.98, phase: 35.2, elongation: 145.8, magnitude: 12.4 },
        position: { x: 0.856, y: -1.123, z: 0.034 },
        velocity: { x: 0.0123, y: 0.0089, z: -0.0012 },
        state_vectors: { position: [0.856, -1.123, 0.034], velocity: [0.0123, 0.0089, -0.0012] },
      });

      // First call
      await manager.getCometData();
      expect(cobsApi.getObservations).toHaveBeenCalledTimes(1);

      // Advance time beyond cache TTL (5 minutes + 1ms)
      const originalNow = Date.now;
      vi.spyOn(Date, 'now').mockImplementation(() => originalNow() + 5 * 60 * 1000 + 1);

      // Second call (cache expired, should refetch)
      await manager.getCometData();
      expect(cobsApi.getObservations).toHaveBeenCalledTimes(2);
    });

    it('should cache failed requests with shorter TTL', async () => {
      // Mock failure
      vi.mocked(cobsApi.getObservations).mockRejectedValue(new Error('COBS error'));
      vi.mocked(getTheSkyLiveOrbitalData).mockResolvedValue({
        name: '3I/ATLAS',
        ra: '10h 20m 30s',
        dec: '+15° 30\' 45"',
        magnitude: 12.5,
        distance: 1.5,
        elongation: 120,
      });
      vi.mocked(getJPLHorizonsOrbitalData).mockResolvedValue({
        ephemeris: { r: 1.45, delta: 0.98, phase: 35.2, elongation: 145.8, magnitude: 12.4 },
        position: { x: 0.856, y: -1.123, z: 0.034 },
        velocity: { x: 0.0123, y: 0.0089, z: -0.0012 },
        state_vectors: { position: [0.856, -1.123, 0.034], velocity: [0.0123, 0.0089, -0.0012] },
      });

      // First call (will fail and cache the failure)
      await manager.getCometData();
      expect(cobsApi.getObservations).toHaveBeenCalledTimes(1);

      // Second call within failure cache window (should use cached failure)
      await manager.getCometData();
      expect(cobsApi.getObservations).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('Parallel Fetching', () => {
    it('should fetch from all sources in parallel', async () => {
      const startTimes: Record<string, number> = {};
      const endTimes: Record<string, number> = {};

      vi.mocked(cobsApi.getObservations).mockImplementation(async () => {
        startTimes.cobs = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
        endTimes.cobs = Date.now();
        return [{ date: '2025-10-29T00:00:00.000Z', magnitude: 12.3, observer: 'Test', instrument: 'Telescope', uncertainty: 0.2 }];
      });

      vi.mocked(getTheSkyLiveOrbitalData).mockImplementation(async () => {
        startTimes.theskylive = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
        endTimes.theskylive = Date.now();
        return { name: '3I/ATLAS', ra: '10h 20m 30s', dec: '+15° 30\' 45"', magnitude: 12.5, distance: 1.5, elongation: 120 };
      });

      vi.mocked(getJPLHorizonsOrbitalData).mockImplementation(async () => {
        startTimes.jpl = Date.now();
        await new Promise(resolve => setTimeout(resolve, 50));
        endTimes.jpl = Date.now();
        return {
          ephemeris: { r: 1.45, delta: 0.98, phase: 35.2, elongation: 145.8, magnitude: 12.4 },
          position: { x: 0.856, y: -1.123, z: 0.034 },
          velocity: { x: 0.0123, y: 0.0089, z: -0.0012 },
          state_vectors: { position: [0.856, -1.123, 0.034], velocity: [0.0123, 0.0089, -0.0012] },
        };
      });

      const overallStart = Date.now();
      await manager.getCometData();
      const overallEnd = Date.now();

      // Check that all started around the same time (parallel execution)
      const starts = Object.values(startTimes);
      const maxStartDiff = Math.max(...starts) - Math.min(...starts);
      expect(maxStartDiff).toBeLessThan(20); // Should start within 20ms of each other

      // Total time should be close to single request time, not sum of all
      const totalTime = overallEnd - overallStart;
      expect(totalTime).toBeLessThan(100); // Should be ~50ms, not 150ms
    });

    it('should not block on individual source failures', async () => {
      vi.mocked(cobsApi.getObservations).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('COBS timeout');
      });

      vi.mocked(getTheSkyLiveOrbitalData).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { name: '3I/ATLAS', ra: '10h 20m 30s', dec: '+15° 30\' 45"', magnitude: 12.5, distance: 1.5, elongation: 120 };
      });

      vi.mocked(getJPLHorizonsOrbitalData).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          ephemeris: { r: 1.45, delta: 0.98, phase: 35.2, elongation: 145.8, magnitude: 12.4 },
          position: { x: 0.856, y: -1.123, z: 0.034 },
          velocity: { x: 0.0123, y: 0.0089, z: -0.0012 },
          state_vectors: { position: [0.856, -1.123, 0.034], velocity: [0.0123, 0.0089, -0.0012] },
        };
      });

      const start = Date.now();
      await manager.getCometData();
      const duration = Date.now() - start;

      // Should wait for slowest (COBS at 100ms), not fail fast
      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Data Structure', () => {
    it('should return EnhancedCometData structure', async () => {
      vi.mocked(cobsApi.getObservations).mockResolvedValue([
        { date: '2025-10-29T00:00:00.000Z', magnitude: 12.3, observer: 'Test', instrument: 'Telescope', uncertainty: 0.2 },
      ]);

      vi.mocked(getTheSkyLiveOrbitalData).mockResolvedValue({
        name: '3I/ATLAS',
        ra: '10h 20m 30s',
        dec: '+15° 30\' 45"',
        magnitude: 12.5,
        distance: 1.5,
        elongation: 120,
      });

      vi.mocked(getJPLHorizonsOrbitalData).mockResolvedValue({
        ephemeris: { r: 1.45, delta: 0.98, phase: 35.2, elongation: 145.8, magnitude: 12.4 },
        position: { x: 0.856, y: -1.123, z: 0.034 },
        velocity: { x: 0.0123, y: 0.0089, z: -0.0012 },
        state_vectors: { position: [0.856, -1.123, 0.034], velocity: [0.0123, 0.0089, -0.0012] },
      });

      const result = await manager.getCometData();

      // Should have expected top-level properties
      expect(result).toHaveProperty('comet');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('orbital_mechanics');
      expect(result).toHaveProperty('brightness_enhanced');
      expect(result).toHaveProperty('source_status');
    });
  });
});
