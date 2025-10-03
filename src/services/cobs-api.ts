/**
 * COBS API Client for 3I/ATLAS Comet Data Integration
 *
 * This service integrates with the Comet Observation Database (COBS)
 * API to fetch real-time observations of the 3I/ATLAS interstellar comet.
 */

import { format } from 'date-fns';

// TypeScript interfaces for COBS data structures
export interface COBSObservation {
  id: string;
  designation: string;
  date: string; // YYYY-MM-DD.dd format
  filter: string;
  magnitude: number;
  uncertainty?: number;
  aperture: number;
  observer: {
    id: string;
    name: string;
    location: string;
  };
  telescope: string;
  notes: string;
  source: string;
  coma?: number; // arcminutes
}

export interface ProcessedObservation {
  id: string;
  date: string; // ISO format
  magnitude: number;
  uncertainty?: number;
  observer: {
    id: string;
    name: string;
    location: {
      name: string;
      lat?: number;
      lng?: number;
    };
    telescope: string;
    observationCount: number;
  };
  filter: string;
  aperture: number;
  coma?: number;
  notes: string;
  source: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CometStatistics {
  totalObservations: number;
  activeObservers: number;
  daysUntilPerihelion: number;
  currentMagnitude: number;
  brightestMagnitude: number;
  averageMagnitude: number;
  lastUpdated: string;
  observationDateRange: {
    earliest: string;
    latest: string;
  };
  trend?: {
    direction: 'brightening' | 'dimming' | 'stable';
    rate: number;
    confidence: 'high' | 'medium' | 'low';
  }; // Allow for trend analysis addition
}

export interface LightCurvePoint {
  date: string;
  magnitude: number;
  uncertainty?: number;
  observationCount: number;
}

export interface ObserverInfo {
  id: string;
  name: string;
  location: {
    name: string;
    lat?: number;
    lng?: number;
  };
  observationCount: number;
  latestObservation?: string;
  averageMagnitude: number;
}

// In-memory cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number = 300000): void { // 5 minute default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Rate limiter implementation
class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) { // 60 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async canMakeRequest(): Promise<boolean> {
    const now = Date.now();
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  async waitForSlot(): Promise<void> {
    while (!(await this.canMakeRequest())) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export class COBSApiClient {
  private baseUrl = 'https://cobs.si/api/obs_list.api';
  private cache = new MemoryCache();
  private rateLimiter = new RateLimiter();
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  // Known observer locations (can be expanded)
  private observerLocations: Record<string, { lat: number; lng: number }> = {
    'Arizona': { lat: 34.0489, lng: -111.0937 },
    'Chile': { lat: -30.0, lng: -71.0 },
    'Australia': { lat: -25.0, lng: 133.0 },
    'Japan': { lat: 36.0, lng: 138.0 },
    'France': { lat: 46.0, lng: 2.0 },
    'Spain': { lat: 40.0, lng: -4.0 },
    'Germany': { lat: 51.0, lng: 9.0 },
    'Poland': { lat: 52.0, lng: 19.0 },
    'Italy': { lat: 42.0, lng: 12.0 },
    'New Zealand': { lat: -41.0, lng: 174.0 },
    'Namibia': { lat: -22.0, lng: 17.0 },
    'South Australia': { lat: -30.0, lng: 135.0 },
    'Victoria, Australia': { lat: -37.0, lng: 144.0 },
    'Western Australia': { lat: -26.0, lng: 121.0 },
  };

  /**
   * Parse COBS fixed-width format data with enhanced error handling
   */
  private parseObservationLine(line: string): COBSObservation | null {
    if (!line.trim() || line.length < 50) return null;

    try {
      // Parse the actual COBS format based on real data structure
      const segments = line.trim().split(/\s+/);
      if (segments.length < 10) return null;

      const designation = segments[0].trim();
      if (!designation.includes('3I')) return null;

      // Parse date: YYYY MM DD.dd format
      const year = segments[1];
      const month = segments[2];
      const dayDecimal = segments[3];
      const dateStr = `${year} ${month} ${dayDecimal}`;

      // Parse filter and magnitude
      const filter = segments[4].trim();
      const magnitudeStr = segments[5];

      // Extract observer info from the end of the line
      const nameMatch = line.match(/Name: ([^;]+)/);
      const locationMatch = line.match(/Location: ([^;]+)/);

      if (!magnitudeStr || !nameMatch) {
        return null;
      }

      // Parse magnitude with better error handling
      const magnitude = parseFloat(magnitudeStr);
      if (isNaN(magnitude) || magnitude < 5 || magnitude > 20) {
        return null; // Invalid magnitude range for 3I
      }

      // Parse date from YYYY MM DD.dd format
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayFloatValue = parseFloat(dayDecimal);

      if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayFloatValue)) {
        return null;
      }

      const day = Math.floor(dayFloatValue);
      const hours = Math.floor((dayFloatValue - day) * 24);
      const minutes = Math.floor(((dayFloatValue - day) * 24 - hours) * 60);

      // IMPORTANT: COBS dates are in UTC, use Date.UTC()
      const observationDate = new Date(Date.UTC(yearNum, monthNum - 1, day, hours, minutes));

      // Validate date is reasonable (not in future, not too far in past)
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      if (observationDate > now || observationDate < oneYearAgo) {
        return null;
      }

      // Extract additional data from line
      const aperture = this.extractAperture(line);
      const coma = this.extractComa(line);
      const uncertainty = this.extractUncertainty(line);

      const observerName = nameMatch[1].trim();
      const observerLocation = locationMatch ? locationMatch[1].trim() : '';

      return {
        id: `${designation}-${dateStr.replace(/\s/g, '')}-${observerName.replace(/\s/g, '')}`,
        designation,
        date: dateStr,
        filter,
        magnitude,
        uncertainty,
        aperture,
        observer: {
          id: observerName.replace(/\s/g, '').toLowerCase(),
          name: observerName,
          location: observerLocation,
        },
        telescope: '', // Would need more parsing for telescope info
        notes: line.includes('Comment:') ? line.split('Comment:')[1].split(';')[0].trim() : '',
        source: 'COBS',
        coma,
      };
    } catch (error) {
      console.error('Error parsing observation line:', error);
      return null;
    }
  }

  /**
   * Extract aperture from COBS line
   */
  private extractAperture(line: string): number {
    // Look for aperture patterns like "5.0R", "30.0H", "40.0L"
    const apertureMatch = line.match(/(\d+\.?\d*)[RHL]/);
    return apertureMatch ? parseFloat(apertureMatch[1]) : 0;
  }

  /**
   * Extract coma size from COBS line
   */
  private extractComa(line: string): number | undefined {
    // Look for coma size patterns
    const comaMatch = line.match(/\s+(\d+\.\d+)\s+/);
    if (comaMatch && parseFloat(comaMatch[1]) > 0 && parseFloat(comaMatch[1]) < 10) {
      return parseFloat(comaMatch[1]);
    }
    return undefined;
  }

  /**
   * Extract uncertainty from COBS line
   */
  private extractUncertainty(line: string): number | undefined {
    // Look for uncertainty patterns
    const uncertaintyMatch = line.match(/([A-Z]\d+)/);
    if (uncertaintyMatch) {
      const code = uncertaintyMatch[1];
      // Convert COBS uncertainty codes to numeric values
      const uncertaintyMap: Record<string, number> = {
        'U4': 0.4, 'U9': 0.9, 'AV': 0.1, 'GG': 0.2, 'BG': 0.3
      };
      return uncertaintyMap[code] || 0.2;
    }
    return undefined;
  }

  /**
   * Fetch raw observations from COBS API with enhanced error handling and retries
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   */
  private async fetchRawObservations(forceRefresh: boolean = false): Promise<COBSObservation[]> {
    const cacheKey = 'raw_observations';
    const cached = this.cache.get<COBSObservation[]>(cacheKey);
    if (cached && !forceRefresh) {
      console.log(`Cache hit: returning ${cached.length} observations`);
      return cached;
    }

    if (forceRefresh) {
      console.log('Force refresh: bypassing cache');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.rateLimiter.waitForSlot();

        console.log(`Fetching COBS data (attempt ${attempt}/${this.retryAttempts})...`);

        // Query for 3I comet observations with date range for better filtering
        const params = new URLSearchParams({
          des: '3I', // Using designation still works better than comet ID
          from: '2025-07-01', // Start of observation period
          limit: '500', // Reduced limit to avoid API errors
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`${this.baseUrl}?${params}`, {
          headers: {
            'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
            'Accept': 'text/plain',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`COBS API HTTP error: ${response.status} ${response.statusText}`);
        }

        const text = await response.text();
        if (!text || text.trim().length === 0) {
          throw new Error('COBS API returned empty response');
        }

        const lines = text.split('\n').filter(line => line.trim().length > 0);
        console.log(`Received ${lines.length} lines from COBS API`);

        const observations: COBSObservation[] = [];
        let parsedCount = 0;
        let errorCount = 0;

        for (const line of lines) {
          try {
            const obs = this.parseObservationLine(line);
            if (obs) {
              observations.push(obs);
              parsedCount++;
            }
          } catch (parseError) {
            errorCount++;
            if (errorCount < 5) { // Log first few parse errors
              console.warn('Parse error for line:', line.substring(0, 50), parseError);
            }
          }
        }

        console.log(`Parsed ${parsedCount} valid observations, ${errorCount} parse errors`);

        if (observations.length === 0) {
          throw new Error('No valid observations found in COBS response');
        }

        // Cache for 5 minutes (300000ms)
        this.cache.set(cacheKey, observations, 300000);

        console.log(`Successfully cached ${observations.length} observations`);
        return observations;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`COBS API attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * attempt; // Exponential backoff
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to fetch COBS data after ${this.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Get processed observations with enhanced data
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   */
  async getObservations(forceRefresh: boolean = false): Promise<ProcessedObservation[]> {
    const rawObservations = await this.fetchRawObservations(forceRefresh);

    // Count observations per observer
    const observerCounts = new Map<string, number>();
    rawObservations.forEach(obs => {
      const count = observerCounts.get(obs.observer.id) || 0;
      observerCounts.set(obs.observer.id, count + 1);
    });

    return rawObservations.map(obs => {
      // Try to match location to known coordinates
      const locationKey = Object.keys(this.observerLocations).find(key =>
        obs.observer.location.toLowerCase().includes(key.toLowerCase())
      );
      const coordinates = locationKey ? this.observerLocations[locationKey] : undefined;

      return {
        id: obs.id,
        date: this.parseObservationDate(obs.date),
        magnitude: obs.magnitude,
        uncertainty: obs.uncertainty,
        observer: {
          id: obs.observer.id,
          name: obs.observer.name,
          location: {
            name: obs.observer.location,
            lat: coordinates?.lat,
            lng: coordinates?.lng,
          },
          telescope: obs.telescope,
          observationCount: observerCounts.get(obs.observer.id) || 1,
        },
        filter: obs.filter,
        aperture: obs.aperture,
        coma: obs.coma,
        notes: obs.notes,
        source: obs.source,
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Parse COBS date format to ISO string
   * IMPORTANT: COBS dates are in UTC, so we must use Date.UTC()
   */
  private parseObservationDate(dateStr: string): string {
    const dateParts = dateStr.trim().split(' ');
    if (dateParts.length !== 3) return new Date().toISOString();

    try {
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]);
      const dayFloat = parseFloat(dateParts[2]);
      const day = Math.floor(dayFloat);
      const hours = Math.floor((dayFloat - day) * 24);
      const minutes = Math.floor(((dayFloat - day) * 24 - hours) * 60);

      return new Date(Date.UTC(year, month - 1, day, hours, minutes)).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Calculate comprehensive statistics
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   */
  async getStatistics(forceRefresh: boolean = false): Promise<CometStatistics> {
    const observations = await this.getObservations(forceRefresh);

    if (observations.length === 0) {
      return {
        totalObservations: 0,
        activeObservers: 0,
        daysUntilPerihelion: Math.floor((new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
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
      daysUntilPerihelion: Math.floor((new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
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
   * Generate light curve data with daily averages
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   */
  async getLightCurve(forceRefresh: boolean = false): Promise<LightCurvePoint[]> {
    const observations = await this.getObservations(forceRefresh);

    // Group observations by date
    const dailyGroups = new Map<string, ProcessedObservation[]>();

    observations.forEach(obs => {
      const date = new Date(obs.date);
      const dateKey = format(date, 'yyyy-MM-dd');

      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, []);
      }
      dailyGroups.get(dateKey)!.push(obs);
    });

    // Calculate daily averages
    const lightCurve: LightCurvePoint[] = [];

    for (const [dateKey, dayObservations] of dailyGroups) {
      const magnitudes = dayObservations.map(obs => obs.magnitude);
      const average = magnitudes.reduce((sum, mag) => sum + mag, 0) / magnitudes.length;

      // Calculate uncertainty as standard deviation
      const variance = magnitudes.reduce((sum, mag) => sum + Math.pow(mag - average, 2), 0) / magnitudes.length;
      const uncertainty = Math.sqrt(variance);

      lightCurve.push({
        date: `${dateKey}T00:00:00.000Z`,
        magnitude: parseFloat(average.toFixed(2)),
        uncertainty: parseFloat(uncertainty.toFixed(2)),
        observationCount: dayObservations.length,
      });
    }

    return lightCurve.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Get observer information with locations
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   * @param observations - Optional pre-fetched observations to avoid duplicate fetch
   */
  async getObservers(forceRefresh: boolean = false, observations?: ProcessedObservation[]): Promise<ObserverInfo[]> {
    // Reuse provided observations if available, otherwise fetch them
    const obs = observations ?? await this.getObservations(forceRefresh);

    const observerMap = new Map<string, ObserverInfo>();

    obs.forEach(observation => {
      const observerId = observation.observer.id;

      if (!observerMap.has(observerId)) {
        observerMap.set(observerId, {
          id: observerId,
          name: observation.observer.name,
          location: observation.observer.location,
          observationCount: 0,
          averageMagnitude: 0,
        });
      }

      const observer = observerMap.get(observerId)!;
      observer.observationCount++;
      observer.latestObservation = observation.date;
    });

    // Calculate average magnitudes
    for (const observer of observerMap.values()) {
      const observerObservations = obs.filter(observation => observation.observer.id === observer.id);
      const totalMagnitude = observerObservations.reduce((sum, observation) => sum + observation.magnitude, 0);
      observer.averageMagnitude = parseFloat((totalMagnitude / observer.observationCount).toFixed(2));
    }

    return Array.from(observerMap.values())
      .sort((a, b) => b.observationCount - a.observationCount);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const cobsApi = new COBSApiClient();