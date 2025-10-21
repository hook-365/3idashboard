/**
 * SQLite Database Client for 3I/ATLAS Dashboard
 * Provides persistent local storage for JPL Horizons data and other critical data
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logger from '@/lib/logger';

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'comet-data.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class SQLiteDatabase {
  private db: Database.Database | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      this.db = new Database(DB_PATH, {
        verbose: process.env.NODE_ENV === 'development' ? logger.debug.bind(logger) : undefined
      });

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');

      // Create tables
      this.createTables();

      logger.info({ path: DB_PATH }, 'SQLite database initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize SQLite database');
      this.db = null;
    }
  }

  private createTables() {
    if (!this.db) return;

    // JPL Horizons ephemeris data
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jpl_horizons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        object_id TEXT NOT NULL,
        date TEXT NOT NULL,
        ra REAL,
        dec REAL,
        distance_au REAL,
        velocity_kmps REAL,
        magnitude REAL,
        elongation REAL,
        phase_angle REAL,
        sun_distance_au REAL,
        data_json TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        UNIQUE(object_id, date)
      );
      CREATE INDEX IF NOT EXISTS idx_jpl_date ON jpl_horizons(date);
      CREATE INDEX IF NOT EXISTS idx_jpl_object ON jpl_horizons(object_id);
    `);

    // Orbital elements cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orbital_elements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        object_id TEXT NOT NULL,
        epoch TEXT NOT NULL,
        eccentricity REAL,
        semi_major_axis_au REAL,
        inclination_deg REAL,
        ascending_node_deg REAL,
        perihelion_arg_deg REAL,
        mean_anomaly_deg REAL,
        perihelion_date TEXT,
        perihelion_distance_au REAL,
        data_json TEXT,
        source TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        UNIQUE(object_id, epoch, source)
      );
      CREATE INDEX IF NOT EXISTS idx_orbital_object ON orbital_elements(object_id);
    `);

    // COBS observations cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cobs_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id TEXT UNIQUE NOT NULL,
        object_id TEXT NOT NULL,
        date TEXT NOT NULL,
        magnitude REAL,
        magnitude_error REAL,
        observer_name TEXT,
        observer_location TEXT,
        instrument TEXT,
        coma_diameter_arcmin REAL,
        tail_length_arcmin REAL,
        tail_pa_deg REAL,
        notes TEXT,
        data_json TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        UNIQUE(observation_id)
      );
      CREATE INDEX IF NOT EXISTS idx_cobs_date ON cobs_observations(date);
      CREATE INDEX IF NOT EXISTS idx_cobs_object ON cobs_observations(object_id);
      CREATE INDEX IF NOT EXISTS idx_cobs_observer ON cobs_observations(observer_name);
    `);

    // API response cache (fallback data)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS api_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        params_hash TEXT NOT NULL,
        response_data TEXT NOT NULL,
        status_code INTEGER,
        headers TEXT,
        ttl_seconds INTEGER DEFAULT 3600,
        created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER,
        UNIQUE(endpoint, params_hash)
      );
      CREATE INDEX IF NOT EXISTS idx_api_cache_endpoint ON api_cache(endpoint);
      CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
    `);

    // Data source health tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS source_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT NOT NULL,
        status TEXT CHECK(status IN ('healthy', 'degraded', 'failed')) DEFAULT 'healthy',
        last_success INTEGER,
        last_failure INTEGER,
        failure_count INTEGER DEFAULT 0,
        error_message TEXT,
        response_time_ms INTEGER,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
      CREATE INDEX IF NOT EXISTS idx_source_health_name ON source_health(source_name);
    `);
  }

  /**
   * Store JPL Horizons ephemeris data
   */
  storeJPLData(data: {
    objectId: string;
    date: string;
    ra?: number;
    dec?: number;
    distance?: number;
    velocity?: number;
    magnitude?: number;
    elongation?: number;
    phaseAngle?: number;
    sunDistance?: number;
    fullData?: any;
  }) {
    if (!this.db) return false;

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO jpl_horizons (
          object_id, date, ra, dec, distance_au, velocity_kmps,
          magnitude, elongation, phase_angle, sun_distance_au, data_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
      `);

      stmt.run(
        data.objectId,
        data.date,
        data.ra,
        data.dec,
        data.distance,
        data.velocity,
        data.magnitude,
        data.elongation,
        data.phaseAngle,
        data.sunDistance,
        JSON.stringify(data.fullData || {})
      );

      logger.debug({ objectId: data.objectId, date: data.date }, 'Stored JPL data');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to store JPL data');
      return false;
    }
  }

  /**
   * Get JPL Horizons data for date range
   */
  getJPLData(objectId: string, startDate?: string, endDate?: string) {
    if (!this.db) return [];

    try {
      let query = 'SELECT * FROM jpl_horizons WHERE object_id = ?';
      const params: any[] = [objectId];

      if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
      }
      if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY date ASC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row: any) => ({
        ...row,
        data_json: row.data_json ? JSON.parse(row.data_json as string) : null
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to get JPL data');
      return [];
    }
  }

  /**
   * Store COBS observations
   */
  storeCOBSObservations(observations: any[]) {
    if (!this.db) return 0;

    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO cobs_observations (
          observation_id, object_id, date, magnitude, magnitude_error,
          observer_name, observer_location, instrument,
          coma_diameter_arcmin, tail_length_arcmin, tail_pa_deg,
          notes, data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = this.db.transaction((obs: any[]) => {
        let count = 0;
        for (const o of obs) {
          stmt.run(
            o.id || `${o.object_id}_${o.date}_${o.observer_name}`,
            o.object_id || '3I',
            o.date,
            o.magnitude,
            o.magnitude_error,
            o.observer_name,
            o.observer_location,
            o.instrument,
            o.coma_diameter,
            o.tail_length,
            o.tail_pa,
            o.notes,
            JSON.stringify(o)
          );
          count++;
        }
        return count;
      });

      const count = insertMany(observations);
      logger.info({ count }, 'Stored COBS observations');
      return count;
    } catch (error) {
      logger.error({ error }, 'Failed to store COBS observations');
      return 0;
    }
  }

  /**
   * Get COBS observations
   */
  getCOBSObservations(options: {
    objectId?: string;
    startDate?: string;
    endDate?: string;
    observer?: string;
    limit?: number;
  } = {}) {
    if (!this.db) return [];

    try {
      let query = 'SELECT * FROM cobs_observations WHERE 1=1';
      const params: any[] = [];

      if (options.objectId) {
        query += ' AND object_id = ?';
        params.push(options.objectId);
      }
      if (options.startDate) {
        query += ' AND date >= ?';
        params.push(options.startDate);
      }
      if (options.endDate) {
        query += ' AND date <= ?';
        params.push(options.endDate);
      }
      if (options.observer) {
        query += ' AND observer_name = ?';
        params.push(options.observer);
      }

      query += ' ORDER BY date DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }

      const stmt = this.db.prepare(query);
      return stmt.all(...params);
    } catch (error) {
      logger.error({ error }, 'Failed to get COBS observations');
      return [];
    }
  }

  /**
   * Store API response for fallback
   */
  storeAPICache(endpoint: string, params: any, response: any, ttlSeconds = 3600) {
    if (!this.db) return false;

    try {
      const paramsHash = this.hashParams(params);
      const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO api_cache (
          endpoint, params_hash, response_data, ttl_seconds, expires_at
        ) VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        endpoint,
        paramsHash,
        JSON.stringify(response),
        ttlSeconds,
        expiresAt
      );

      logger.debug({ endpoint, ttl: ttlSeconds }, 'Stored API cache');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to store API cache');
      return false;
    }
  }

  /**
   * Get API response from cache
   */
  getAPICache(endpoint: string, params: any): any | null {
    if (!this.db) return null;

    try {
      const paramsHash = this.hashParams(params);
      const now = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        SELECT response_data FROM api_cache
        WHERE endpoint = ? AND params_hash = ? AND expires_at > ?
      `);

      const row = stmt.get(endpoint, paramsHash, now) as any;
      if (row) {
        logger.debug({ endpoint }, 'API cache hit');
        return JSON.parse(row.response_data);
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Failed to get API cache');
      return null;
    }
  }

  /**
   * Update source health status
   */
  updateSourceHealth(sourceName: string, status: 'healthy' | 'degraded' | 'failed', error?: string, responseTime?: number) {
    if (!this.db) return;

    try {
      const now = Math.floor(Date.now() / 1000);

      const stmt = this.db.prepare(`
        INSERT INTO source_health (
          source_name, status, last_success, last_failure, failure_count,
          error_message, response_time_ms, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_name) DO UPDATE SET
          status = excluded.status,
          last_success = CASE WHEN excluded.status = 'healthy' THEN excluded.last_success ELSE last_success END,
          last_failure = CASE WHEN excluded.status = 'failed' THEN excluded.last_failure ELSE last_failure END,
          failure_count = CASE WHEN excluded.status = 'failed' THEN failure_count + 1 ELSE 0 END,
          error_message = excluded.error_message,
          response_time_ms = excluded.response_time_ms,
          updated_at = excluded.updated_at
      `);

      stmt.run(
        sourceName,
        status,
        status === 'healthy' ? now : null,
        status === 'failed' ? now : null,
        status === 'failed' ? 1 : 0,
        error,
        responseTime,
        now
      );

      logger.debug({ source: sourceName, status }, 'Updated source health');
    } catch (error) {
      logger.error({ error }, 'Failed to update source health');
    }
  }

  /**
   * Get source health status
   */
  getSourceHealth(sourceName?: string) {
    if (!this.db) return [];

    try {
      const query = sourceName
        ? 'SELECT * FROM source_health WHERE source_name = ?'
        : 'SELECT * FROM source_health ORDER BY updated_at DESC';

      const stmt = this.db.prepare(query);
      return sourceName ? [stmt.get(sourceName)] : stmt.all();
    } catch (error) {
      logger.error({ error }, 'Failed to get source health');
      return [];
    }
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    if (!this.db) return 0;

    try {
      const now = Math.floor(Date.now() / 1000);
      const stmt = this.db.prepare('DELETE FROM api_cache WHERE expires_at < ?');
      const result = stmt.run(now);

      if (result.changes > 0) {
        logger.info({ deleted: result.changes }, 'Cleaned expired cache entries');
      }

      return result.changes;
    } catch (error) {
      logger.error({ error }, 'Failed to clean expired cache');
      return 0;
    }
  }

  /**
   * Get database statistics
   */
  getStats() {
    if (!this.db) return null;

    try {
      const tables = ['jpl_horizons', 'orbital_elements', 'cobs_observations', 'api_cache', 'source_health'];
      const stats: any = {};

      for (const table of tables) {
        const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
        const sizeStmt = this.db.prepare(`
          SELECT page_count * page_size as size
          FROM pragma_page_count(), pragma_page_size()
        `);

        stats[table] = {
          count: (countStmt.get() as any).count,
          size: (sizeStmt.get() as any).size
        };
      }

      return stats;
    } catch (error) {
      logger.error({ error }, 'Failed to get database stats');
      return null;
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('SQLite database closed');
    }
  }

  private hashParams(params: any): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
  }
}

// Export singleton instance
export const sqliteDB = new SQLiteDatabase();

// Cleanup on process exit
process.on('exit', () => sqliteDB.close());
process.on('SIGINT', () => {
  sqliteDB.close();
  process.exit(0);
});