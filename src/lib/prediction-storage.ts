/**
 * Prediction Storage System
 *
 * Manages persistent storage of ephemeris predictions for historical validation.
 * Stores predictions in JSON files organized by capture date for efficient retrieval.
 *
 * Features:
 * - File-based storage in /data/predictions/ directory
 * - Automatic deduplication of predictions
 * - Efficient lookup by target date
 * - Historical validation support
 */

import * as fs from 'fs';
import * as path from 'path';
import type { EphemerisPoint } from './data-sources/theskylive';

const PREDICTIONS_DIR = path.join(process.cwd(), 'data', 'predictions');

export interface StoredPrediction {
  date: string;              // Date being predicted for (ISO format: "2025-10-09")
  prediction_date: string;   // When this prediction was made (ISO timestamp)
  ra: number;                // Right ascension (decimal degrees)
  dec: number;               // Declination (decimal degrees)
  magnitude?: number;        // Predicted magnitude
  source: string;            // Data source ('TheSkyLive')
}

/**
 * Ensure predictions directory exists
 */
function ensurePredictionsDir(): void {
  if (!fs.existsSync(PREDICTIONS_DIR)) {
    fs.mkdirSync(PREDICTIONS_DIR, { recursive: true });
    console.log(`Created predictions directory: ${PREDICTIONS_DIR}`);
  }
}

/**
 * Store ephemeris predictions to disk
 * Appends to daily prediction file with automatic deduplication
 *
 * @param predictions Array of ephemeris points to store
 */
export async function storePredictions(predictions: EphemerisPoint[]): Promise<void> {
  ensurePredictionsDir();

  const today = new Date().toISOString().split('T')[0];
  const filename = path.join(PREDICTIONS_DIR, `predictions_${today}.json`);

  console.log(`Storing ${predictions.length} predictions to ${filename}`);

  // Read existing predictions if file exists
  let existingPredictions: StoredPrediction[] = [];
  if (fs.existsSync(filename)) {
    try {
      const fileContent = fs.readFileSync(filename, 'utf-8');
      existingPredictions = JSON.parse(fileContent);
      console.log(`Found ${existingPredictions.length} existing predictions`);
    } catch (error) {
      console.error('Error reading existing predictions file:', error);
      // If file is corrupted, we'll overwrite it
      existingPredictions = [];
    }
  }

  // Convert ephemeris points to stored predictions
  const newPredictions: StoredPrediction[] = predictions.map(p => ({
    date: p.date,
    prediction_date: p.prediction_date,
    ra: p.ra,
    dec: p.dec,
    magnitude: p.magnitude,
    source: p.data_source
  }));

  // Merge and deduplicate based on date + source + prediction_date
  const allPredictions = [...existingPredictions, ...newPredictions];
  const uniquePredictions = Array.from(
    new Map(
      allPredictions.map(p => [
        `${p.date}_${p.source}_${p.prediction_date}`,
        p
      ])
    ).values()
  );

  console.log(`After deduplication: ${uniquePredictions.length} unique predictions`);

  // Sort by target date for easier browsing
  uniquePredictions.sort((a, b) => a.date.localeCompare(b.date));

  // Write to file with pretty formatting
  fs.writeFileSync(filename, JSON.stringify(uniquePredictions, null, 2), 'utf-8');

  console.log(`Successfully stored predictions to ${filename}`);
}

/**
 * Load predictions for a specific target date
 * Searches through all prediction files for entries matching the date
 *
 * @param date ISO date string (e.g., "2025-10-09")
 * @returns Array of all predictions made for that date
 */
export function loadPredictionsForDate(date: string): StoredPrediction[] {
  ensurePredictionsDir();

  if (!fs.existsSync(PREDICTIONS_DIR)) {
    console.log('Predictions directory does not exist');
    return [];
  }

  const files = fs.readdirSync(PREDICTIONS_DIR);
  const predictions: StoredPrediction[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const filepath = path.join(PREDICTIONS_DIR, file);
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const content: StoredPrediction[] = JSON.parse(fileContent);

      // Filter for predictions matching the target date
      const matching = content.filter((p: StoredPrediction) => p.date === date);
      predictions.push(...matching);
    } catch (error) {
      console.error(`Error reading prediction file ${file}:`, error);
    }
  }

  console.log(`Found ${predictions.length} predictions for date ${date}`);
  return predictions;
}

/**
 * Load all predictions within a date range
 *
 * @param startDate ISO date string (inclusive)
 * @param endDate ISO date string (inclusive)
 * @returns Array of all predictions within the range
 */
export function loadPredictionsForDateRange(
  startDate: string,
  endDate: string
): StoredPrediction[] {
  ensurePredictionsDir();

  if (!fs.existsSync(PREDICTIONS_DIR)) {
    console.log('Predictions directory does not exist');
    return [];
  }

  const files = fs.readdirSync(PREDICTIONS_DIR);
  const predictions: StoredPrediction[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    try {
      const filepath = path.join(PREDICTIONS_DIR, file);
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const content: StoredPrediction[] = JSON.parse(fileContent);

      // Filter for predictions within the date range
      const matching = content.filter(
        (p: StoredPrediction) => p.date >= startDate && p.date <= endDate
      );
      predictions.push(...matching);
    } catch (error) {
      console.error(`Error reading prediction file ${file}:`, error);
    }
  }

  console.log(
    `Found ${predictions.length} predictions for date range ${startDate} to ${endDate}`
  );
  return predictions;
}

/**
 * Get statistics about stored predictions
 */
export function getPredictionStats(): {
  totalFiles: number;
  totalPredictions: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  predictionDateRange: {
    earliest: string | null;
    latest: string | null;
  };
} {
  ensurePredictionsDir();

  const stats = {
    totalFiles: 0,
    totalPredictions: 0,
    dateRange: {
      earliest: null as string | null,
      latest: null as string | null
    },
    predictionDateRange: {
      earliest: null as string | null,
      latest: null as string | null
    }
  };

  if (!fs.existsSync(PREDICTIONS_DIR)) {
    return stats;
  }

  const files = fs.readdirSync(PREDICTIONS_DIR);
  const allDates: string[] = [];
  const allPredictionDates: string[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    stats.totalFiles++;

    try {
      const filepath = path.join(PREDICTIONS_DIR, file);
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const content: StoredPrediction[] = JSON.parse(fileContent);

      stats.totalPredictions += content.length;

      content.forEach(p => {
        allDates.push(p.date);
        allPredictionDates.push(p.prediction_date);
      });
    } catch (error) {
      console.error(`Error reading prediction file ${file}:`, error);
    }
  }

  if (allDates.length > 0) {
    allDates.sort();
    stats.dateRange.earliest = allDates[0];
    stats.dateRange.latest = allDates[allDates.length - 1];
  }

  if (allPredictionDates.length > 0) {
    allPredictionDates.sort();
    stats.predictionDateRange.earliest = allPredictionDates[0];
    stats.predictionDateRange.latest =
      allPredictionDates[allPredictionDates.length - 1];
  }

  return stats;
}
