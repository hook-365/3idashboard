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
  tail?: number; // degrees
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
  tail?: number;
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

/**
 * Map common designations to COBS-compatible format
 * COBS requires specific designation formats for queries
 */
const DESIGNATION_MAP: Record<string, string> = {
  '3I/ATLAS': '3I',           // COBS ID 2643
  'C/2025 N1': '3I',          // Alternate designation
  'C/2025 R2 (SWAN)': 'C/2025 R2', // COBS ID 2659
  'C/2025 A6 (Lemmon)': 'C/2025 A6', // COBS ID 2606
  'C/2025 K1 (ATLAS)': 'C/2025 K1', // COBS ID 2630
};

/**
 * Normalize comet designation to COBS-compatible format
 */
function normalizeCOBSDesignation(designation: string): string {
  // Check if we have a known mapping
  if (DESIGNATION_MAP[designation]) {
    return DESIGNATION_MAP[designation];
  }

  // Otherwise return as-is (user might provide correct format)
  return designation;
}

export class COBSApiClient {
  private baseUrl = 'https://cobs.si/api/obs_list.api';
  private cache = new MemoryCache();
  private rateLimiter = new RateLimiter();
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second
  private cometDesignation: string; // Normalized COBS designation

  constructor(designation: string = '3I/ATLAS') {
    // Normalize designation to COBS format
    // Default: '3I/ATLAS' → '3I' (COBS database ID: 2643)
    this.cometDesignation = normalizeCOBSDesignation(designation);
    console.log(`[COBSApiClient] Initialized with designation: ${designation} → normalized: ${this.cometDesignation}`);
  }

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
   * Parse COBS JSON observation object
   * COBS API v1.5 JSON format is much more reliable than ICQ fixed-width format
   */
  private parseJSONObservation(jsonObj: any): COBSObservation | null {
    try {
      // Validate required fields
      if (!jsonObj.obs_date || !jsonObj.magnitude || !jsonObj.observer) {
        return null;
      }

      const magnitude = parseFloat(jsonObj.magnitude);
      if (isNaN(magnitude) || magnitude < 5 || magnitude > 20) {
        return null; // Invalid magnitude range
      }

      // Parse observation date (ISO format from JSON)
      const observationDate = new Date(jsonObj.obs_date);

      // Validate date is reasonable
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      if (observationDate > now || observationDate < twoYearsAgo) {
        return null;
      }

      // Extract observer information
      const observer = jsonObj.observer;
      const observerName = `${observer.first_name || ''} ${observer.last_name || ''}`.trim();
      const observerICQ = observer.icq_name || 'UNKNOWN';
      const location = jsonObj.location || '';

      // Extract coma and tail measurements
      const coma = jsonObj.coma_diameter ? parseFloat(jsonObj.coma_diameter) : undefined;
      const tailLength = jsonObj.tail_length ? parseFloat(jsonObj.tail_length) : undefined;

      // Convert tail units if needed (m = arcminutes, d = degrees)
      let tail: number | undefined = undefined;
      if (tailLength !== undefined && !isNaN(tailLength)) {
        if (jsonObj.tail_length_unit === 'm') {
          // Convert arcminutes to degrees
          tail = tailLength / 60;
        } else if (jsonObj.tail_length_unit === 'd') {
          tail = tailLength;
        }
      }

      // Extract uncertainty from magnitude_error field
      const uncertainty = jsonObj.magnitude_error ? parseFloat(jsonObj.magnitude_error) : undefined;

      // Extract aperture and instrument info
      const aperture = jsonObj.instrument_aperture ? parseFloat(jsonObj.instrument_aperture) : 0;
      const telescope = jsonObj.instrument_type?.name || '';
      const filter = jsonObj.obs_method?.key || jsonObj.ref_catalog?.key || 'V';

      // Generate unique ID
      const dateStr = observationDate.toISOString().split('T')[0].replace(/-/g, '');
      const cometName = jsonObj.comet?.name || this.cometDesignation;
      const id = `${cometName}-${dateStr}-${observerICQ}`;

      return {
        id,
        designation: jsonObj.comet?.fullname || cometName,
        date: observationDate.toISOString().split('T')[0], // Store as YYYY-MM-DD
        filter,
        magnitude,
        uncertainty,
        aperture,
        observer: {
          id: observerICQ.toLowerCase(),
          name: observerName,
          location,
        },
        telescope,
        notes: jsonObj.obs_comment || '',
        source: 'COBS',
        coma,
        tail,
      };
    } catch (error) {
      console.error('Error parsing JSON observation:', error);
      return null;
    }
  }

  /**
   * Parse COBS fixed-width format data with enhanced error handling
   * DEPRECATED: JSON format is preferred, but kept for backward compatibility
   */
  private parseObservationLine(line: string): COBSObservation | null {
    if (!line.trim() || line.length < 50) return null;

    try {
      // Parse the actual COBS format based on real data structure
      const segments = line.trim().split(/\s+/);
      if (segments.length < 10) return null;

      const designation = segments[0].trim();
      // Check if designation matches expected comet (flexible matching)
      const expectedPrefix = this.cometDesignation.replace(/\s+/g, '').toUpperCase();
      const actualPrefix = designation.replace(/\s+/g, '').toUpperCase();
      if (!actualPrefix.includes(expectedPrefix.substring(0, Math.min(4, expectedPrefix.length)))) {
        return null;
      }

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
      const tail = this.extractTail(line);
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
        tail,
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
    // Look for aperture patterns like "5.0R", "30.0H", "40.0L", "7.0A", "28.0D"
    const apertureMatch = line.match(/(\d+\.?\d*)[RHLAD]/);
    return apertureMatch ? parseFloat(apertureMatch[1]) : 0;
  }

  /**
   * Extract coma size from COBS line
   * Format: After aperture (e.g., "7.0A"), skip DC class field, then coma is next numeric field
   * Example: "7.0A 3a300   1.2  4" -> coma is 1.2 arcminutes
   */
  private extractComa(line: string): number | undefined {
    try {
      // Find aperture pattern (e.g., "7.0A", "27.0L", "30.0H")
      const apertureMatch = line.match(/(\d+\.?\d*)[RHLAD]/);
      if (!apertureMatch) return undefined;

      const apertureEndPos = apertureMatch.index! + apertureMatch[0].length;
      const afterAperture = line.substring(apertureEndPos).trim();
      const parts = afterAperture.split(/\s+/);

      // Skip first part (DC class like "3a300", "5", "4a900")
      // Coma is the next numeric field
      for (let i = 1; i < Math.min(parts.length, 4); i++) {
        const cleanValue = parts[i].replace(/\/$/, ''); // Remove trailing slash
        const value = parseFloat(cleanValue);

        // Coma diameter is typically 0.1-10 arcminutes for comets
        if (!isNaN(value) && value >= 0.1 && value <= 10) {
          return parseFloat(value.toFixed(2));
        }
      }
    } catch (error) {
      // Silently fail if parsing error occurs
    }
    return undefined;
  }

  /**
   * Extract tail length from COBS line
   * Format: Tail follows coma field in the fixed-width format
   * Example: "7.0A 3a300   1.2  4" -> tail is 4 degrees
   */
  private extractTail(line: string): number | undefined {
    try {
      // Find aperture pattern
      const apertureMatch = line.match(/(\d+\.?\d*)[RHLAD]/);
      if (!apertureMatch) return undefined;

      const apertureEndPos = apertureMatch.index! + apertureMatch[0].length;
      const afterAperture = line.substring(apertureEndPos).trim();
      const parts = afterAperture.split(/\s+/);

      // Find coma first, then tail is the next field
      let comaIndex = -1;
      for (let i = 1; i < Math.min(parts.length, 4); i++) {
        const cleanValue = parts[i].replace(/\/$/, '');
        const value = parseFloat(cleanValue);

        if (!isNaN(value) && value >= 0.1 && value <= 10) {
          comaIndex = i;
          break;
        }
      }

      // Tail is the field after coma
      if (comaIndex >= 0 && comaIndex + 1 < parts.length) {
        const tailStr = parts[comaIndex + 1].replace(/\/$/, ''); // Remove trailing slash
        const tailValue = parseFloat(tailStr);

        // Tail length is typically 0.1-20 degrees for comets
        if (!isNaN(tailValue) && tailValue > 0 && tailValue <= 20) {
          return parseFloat(tailValue.toFixed(2));
        }
      }
    } catch (error) {
      // Silently fail if parsing error occurs
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
   * Uses JSON format (format=json) which is much more reliable than ICQ fixed-width
   * @param forceRefresh - If true, bypass cache and fetch fresh data
   */
  private async fetchRawObservations(forceRefresh: boolean = false): Promise<COBSObservation[]> {
    const cacheKey = `raw_observations_${this.cometDesignation}`;
    const cached = this.cache.get<COBSObservation[]>(cacheKey);
    if (cached && !forceRefresh) {
      console.log(`[${this.cometDesignation}] Cache hit: returning ${cached.length} observations`);
      return cached;
    }

    if (forceRefresh) {
      console.log(`[${this.cometDesignation}] Force refresh: bypassing cache`);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.rateLimiter.waitForSlot();

        console.log(`[${this.cometDesignation}] Fetching COBS data (attempt ${attempt}/${this.retryAttempts})...`);

        // Query for comet observations in JSON format (much more reliable than ICQ)
        const params = new URLSearchParams({
          des: this.cometDesignation, // Normalized COBS designation
          from_date: '2024-01-01', // Broader date range
          format: 'json', // Use JSON format instead of ICQ fixed-width
          page: '1',
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`${this.baseUrl}?${params}`, {
          headers: {
            'User-Agent': '3I-ATLAS-Dashboard/1.0 (Educational/Research)',
            'Accept': 'application/json',
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

        // Parse JSON response
        let jsonData: any;
        try {
          jsonData = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`Failed to parse COBS JSON response: ${parseError}`);
        }

        // Check for API error response
        if (jsonData.code && jsonData.code !== '200') {
          throw new Error(`COBS API error: ${jsonData.code} - ${jsonData.message || 'Unknown error'}`);
        }

        // Extract observations from JSON response
        const objects = jsonData.objects || [];
        console.log(`Received ${objects.length} observations from COBS API (JSON format)`);

        const observations: COBSObservation[] = [];
        let parsedCount = 0;
        let errorCount = 0;

        for (const obj of objects) {
          try {
            const obs = this.parseJSONObservation(obj);
            if (obs) {
              observations.push(obs);
              parsedCount++;
            }
          } catch (parseError) {
            errorCount++;
            if (errorCount < 5) { // Log first few parse errors
              console.warn('Parse error for observation:', parseError);
            }
          }
        }

        console.log(`Parsed ${parsedCount} valid observations, ${errorCount} parse errors`);

        if (observations.length === 0) {
          throw new Error(`No valid observations found in COBS response for designation: ${this.cometDesignation}`);
        }

        // Cache for 5 minutes (300000ms)
        this.cache.set(cacheKey, observations, 300000);

        console.log(`Successfully cached ${observations.length} observations for ${this.cometDesignation}`);
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
        tail: obs.tail,
        notes: obs.notes,
        source: obs.source,
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Parse COBS date format to ISO string
   * Handles both:
   * - JSON format: YYYY-MM-DD HH:MM:SS (already ISO)
   * - ICQ format: YYYY MM DD.dd (space-separated with decimal days)
   * IMPORTANT: COBS dates are in UTC
   */
  private parseObservationDate(dateStr: string): string {
    // If already in ISO format (YYYY-MM-DD or ISO timestamp), use directly
    if (dateStr.includes('-') || dateStr.includes('T')) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch {
        // Fall through to ICQ parsing
      }
    }

    // Parse ICQ format: "YYYY MM DD.dd"
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