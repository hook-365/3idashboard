/**
 * Planet Positions Library
 *
 * Functions for calculating real-time planet positions and orbital paths
 * using astronomy-engine (JPL ephemeris data).
 *
 * Extracted from solar-system-position API route.
 */

import * as Astronomy from 'astronomy-engine';
import logger from '@/lib/logger';
import { equatorialToEcliptic } from './orbital-calculations';

/**
 * Planet orbital data with real orbital elements from NASA
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
export const PLANET_ORBITS = [
  {
    name: 'Mercury',
    distance: 0.387,
    period: 87.97,
    orbital_elements: {
      semi_major_axis: 0.38709927,
      eccentricity: 0.20563593,
      inclination: 7.00497902,
      longitude_of_ascending_node: 48.33076593,
      argument_of_periapsis: 77.45779628 - 48.33076593,
      mean_anomaly: 0
    }
  },
  {
    name: 'Venus',
    distance: 0.723,
    period: 224.7,
    orbital_elements: {
      semi_major_axis: 0.72333566,
      eccentricity: 0.00677672,
      inclination: 3.39467605,
      longitude_of_ascending_node: 76.67984255,
      argument_of_periapsis: 131.60246718 - 76.67984255,
      mean_anomaly: 0
    }
  },
  {
    name: 'Earth',
    distance: 1.0,
    period: 365.25,
    orbital_elements: {
      semi_major_axis: 1.00000261,
      eccentricity: 0.01671123,
      inclination: -0.00001531,
      longitude_of_ascending_node: 0.0,
      argument_of_periapsis: 102.93768193,
      mean_anomaly: 0
    }
  },
  {
    name: 'Mars',
    distance: 1.524,
    period: 686.98,
    orbital_elements: {
      semi_major_axis: 1.52371034,
      eccentricity: 0.09339410,
      inclination: 1.84969142,
      longitude_of_ascending_node: 49.55953891,
      argument_of_periapsis: 286.50210402 - 49.55953891,
      mean_anomaly: 0
    }
  },
  {
    name: 'Jupiter',
    distance: 5.203,
    period: 4332.59,
    orbital_elements: {
      semi_major_axis: 5.20288700,
      eccentricity: 0.04838624,
      inclination: 1.30439695,
      longitude_of_ascending_node: 100.47390909,
      argument_of_periapsis: 273.86740341 - 100.47390909,
      mean_anomaly: 0
    }
  },
  {
    name: 'Saturn',
    distance: 9.537,
    period: 10759.22,
    orbital_elements: {
      semi_major_axis: 9.53667594,
      eccentricity: 0.05386179,
      inclination: 2.48599187,
      longitude_of_ascending_node: 113.66242448,
      argument_of_periapsis: 339.39212340 - 113.66242448,
      mean_anomaly: 0
    }
  },
  {
    name: 'Uranus',
    distance: 19.19,
    period: 30688.5,
    orbital_elements: {
      semi_major_axis: 19.18916464,
      eccentricity: 0.04725744,
      inclination: 0.77263783,
      longitude_of_ascending_node: 74.01692503,
      argument_of_periapsis: 96.99882904 - 74.01692503,
      mean_anomaly: 0
    }
  },
  {
    name: 'Neptune',
    distance: 30.069,
    period: 60182,
    orbital_elements: {
      semi_major_axis: 30.06992276,
      eccentricity: 0.00859048,
      inclination: 1.77004347,
      longitude_of_ascending_node: 131.78405855,
      argument_of_periapsis: 276.33591656 - 131.78405855,
      mean_anomaly: 0
    }
  },
  {
    name: 'Pluto',
    distance: 39.48,
    period: 90560,
    orbital_elements: {
      semi_major_axis: 39.48211675,
      eccentricity: 0.24882730,
      inclination: 17.14001206,
      longitude_of_ascending_node: 110.30393684,
      argument_of_periapsis: 224.06891629 - 110.30393684,
      mean_anomaly: 0
    }
  }
];

/**
 * Calculate all planet positions using astronomy-engine
 * Provides accurate real-time positions based on JPL ephemeris data
 * IMPORTANT: Converts from equatorial to ecliptic coordinates to match JPL comet data
 */
export function calculateAllPlanetPositions(date: Date = new Date()): Array<{
  name: string;
  x: number;
  y: number;
  z: number;
  distance_from_sun: number;
}> {
  logger.info({ date: date.toISOString() }, 'Calculating planet positions using astronomy-engine');

  const planets = [
    { name: 'Mercury', body: Astronomy.Body.Mercury },
    { name: 'Venus', body: Astronomy.Body.Venus },
    { name: 'Earth', body: Astronomy.Body.Earth },
    { name: 'Mars', body: Astronomy.Body.Mars },
    { name: 'Jupiter', body: Astronomy.Body.Jupiter },
    { name: 'Saturn', body: Astronomy.Body.Saturn },
    { name: 'Uranus', body: Astronomy.Body.Uranus },
    { name: 'Neptune', body: Astronomy.Body.Neptune },
    { name: 'Pluto', body: Astronomy.Body.Pluto }
  ];

  return planets.map(planet => {
    // Get heliocentric position (J2000 equatorial coordinates)
    const position = Astronomy.HelioVector(planet.body, date);

    // Convert from equatorial to ecliptic coordinates to match JPL data
    const ecliptic = equatorialToEcliptic(position.x, position.y, position.z);

    const distance_from_sun = Math.sqrt(
      ecliptic.x * ecliptic.x +
      ecliptic.y * ecliptic.y +
      ecliptic.z * ecliptic.z
    );

    logger.info({ planetName: planet.name, equatorial: { x: parseFloat(position.x.toFixed(4)), y: parseFloat(position.y.toFixed(4)), z: parseFloat(position.z.toFixed(4)) }, ecliptic: { x: parseFloat(ecliptic.x.toFixed(4)), y: parseFloat(ecliptic.y.toFixed(4)), z: parseFloat(ecliptic.z.toFixed(4)) } }, 'Planet position calculated');

    return {
      name: planet.name,
      x: ecliptic.x,
      y: ecliptic.y,
      z: ecliptic.z,
      distance_from_sun
    };
  });
}

/**
 * Calculate orbital path for a planet by sampling positions throughout its orbit
 * Returns array of 3D coordinates representing the complete orbital ellipse
 * IMPORTANT: Converts from equatorial to ecliptic coordinates
 */
export function calculatePlanetOrbitalPath(
  planetBody: Astronomy.Body,
  planetName: string,
  currentDate: Date = new Date(),
  numSamples: number = 100
): Array<{ x: number; y: number; z: number }> {
  const orbitData = PLANET_ORBITS.find(p => p.name === planetName);
  if (!orbitData) {
    logger.warn({ planetName }, 'No orbit data found for planet');
    return [];
  }

  const orbitalPeriodDays = orbitData.period;
  const path: Array<{ x: number; y: number; z: number }> = [];

  // Sample positions over one complete orbit
  for (let i = 0; i < numSamples; i++) {
    const fractionOfOrbit = i / numSamples;
    const daysOffset = fractionOfOrbit * orbitalPeriodDays;
    const sampleDate = new Date(currentDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);

    const position = Astronomy.HelioVector(planetBody, sampleDate);

    // Convert from equatorial to ecliptic coordinates
    const ecliptic = equatorialToEcliptic(position.x, position.y, position.z);

    path.push({
      x: ecliptic.x,
      y: ecliptic.y,
      z: ecliptic.z
    });
  }

  return path;
}

/**
 * Calculate Earth's position using astronomy-engine
 * Provides accurate position based on JPL ephemeris data
 * IMPORTANT: Converts from equatorial to ecliptic coordinates
 */
export function calculateEarthPosition(date: Date = new Date()): { x: number; y: number; z: number } {
  const position = Astronomy.HelioVector(Astronomy.Body.Earth, date);
  // Convert from equatorial to ecliptic coordinates
  return equatorialToEcliptic(position.x, position.y, position.z);
}

/**
 * Calculate Earth's orbital velocity vector using astronomy-engine
 * IMPORTANT: Returns velocity in ecliptic coordinates
 */
export function calculateEarthVelocity(date: Date = new Date()): { x: number; y: number; z: number; magnitude: number } {
  // Calculate velocity by getting position at current time and slightly after
  const dt = 0.01; // 0.01 days = ~14.4 minutes
  const date2 = new Date(date.getTime() + dt * 24 * 60 * 60 * 1000);
  const pos1_eq = Astronomy.HelioVector(Astronomy.Body.Earth, date);
  const pos2_eq = Astronomy.HelioVector(Astronomy.Body.Earth, date2);

  // Convert both positions to ecliptic
  const pos1 = equatorialToEcliptic(pos1_eq.x, pos1_eq.y, pos1_eq.z);
  const pos2 = equatorialToEcliptic(pos2_eq.x, pos2_eq.y, pos2_eq.z);

  const vx = (pos2.x - pos1.x) / dt;
  const vy = (pos2.y - pos1.y) / dt;
  const vz = (pos2.z - pos1.z) / dt;

  const magnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);

  return {
    x: vx,
    y: vy,
    z: vz,
    magnitude
  };
}