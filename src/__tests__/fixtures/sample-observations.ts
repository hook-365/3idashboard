/**
 * Sample test fixtures for astronomical observations
 * Using realistic data ranges for 3I/ATLAS comet
 */

import { CometObservation } from '@/types/comet';

/**
 * Sample COBS observations near perihelion (Oct 29, 2025)
 * Magnitudes typically range from 11-19 for this comet
 */
export const SAMPLE_COBS_OBSERVATIONS: CometObservation[] = [
  {
    id: 'obs-1',
    date: '2025-10-20T00:00:00.000Z',
    magnitude: 14.2,
    observer: {
      id: 'obs-1',
      name: 'John Doe',
      location: 'USA',
    },
    location: { name: 'USA', lat: 40.7128, lng: -74.0060 },
    telescope: 'Refractor 150mm',
    uncertainty: 0.3,
    source: 'COBS',
  },
  {
    id: 'obs-2',
    date: '2025-10-22T00:00:00.000Z',
    magnitude: 13.8,
    observer: {
      id: 'obs-2',
      name: 'Jane Smith',
      location: 'UK',
    },
    location: { name: 'UK', lat: 51.5074, lng: -0.1278 },
    telescope: 'Reflector 200mm',
    uncertainty: 0.2,
    source: 'COBS',
  },
  {
    id: 'obs-3',
    date: '2025-10-25T00:00:00.000Z',
    magnitude: 13.2,
    observer: {
      id: 'obs-3',
      name: 'Bob Johnson',
      location: 'Australia',
    },
    location: { name: 'Australia', lat: -33.8688, lng: 151.2093 },
    telescope: 'SCT 250mm',
    uncertainty: 0.25,
    source: 'COBS',
  },
  {
    id: 'obs-4',
    date: '2025-10-27T00:00:00.000Z',
    magnitude: 12.8,
    observer: {
      id: 'obs-4',
      name: 'Alice Williams',
      location: 'Canada',
    },
    location: { name: 'Canada', lat: 43.6532, lng: -79.3832 },
    telescope: 'Refractor 180mm',
    uncertainty: 0.15,
    source: 'COBS',
  },
  {
    id: 'obs-5',
    date: '2025-10-29T00:00:00.000Z', // Perihelion day
    magnitude: 12.3,
    observer: {
      id: 'obs-5',
      name: 'Charlie Brown',
      location: 'Germany',
    },
    location: { name: 'Germany', lat: 52.5200, lng: 13.4050 },
    telescope: 'Reflector 300mm',
    uncertainty: 0.2,
    source: 'COBS',
  },
];

/**
 * Observations with brightening trend (approaching perihelion)
 */
export const BRIGHTENING_OBSERVATIONS: CometObservation[] = [
  {
    id: 'obs-6',
    date: '2025-09-15T00:00:00.000Z',
    magnitude: 16.5,
    observer: {
      id: 'obs-a',
      name: 'Observer A',
      location: 'USA',
    },
    location: { name: 'USA', lat: 40.0, lng: -100.0 },
    telescope: 'Telescope A',
    uncertainty: 0.4,
    source: 'COBS',
  },
  {
    id: 'obs-7',
    date: '2025-09-22T00:00:00.000Z',
    magnitude: 15.8,
    observer: {
      id: 'obs-b',
      name: 'Observer B',
      location: 'France',
    },
    location: { name: 'France', lat: 48.8566, lng: 2.3522 },
    telescope: 'Telescope B',
    uncertainty: 0.3,
    source: 'COBS',
  },
  {
    id: 'obs-8',
    date: '2025-09-29T00:00:00.000Z',
    magnitude: 15.1,
    observer: {
      id: 'obs-c',
      name: 'Observer C',
      location: 'Japan',
    },
    location: { name: 'Japan', lat: 35.6762, lng: 139.6503 },
    telescope: 'Telescope C',
    uncertainty: 0.35,
    source: 'COBS',
  },
  {
    id: 'obs-9',
    date: '2025-10-06T00:00:00.000Z',
    magnitude: 14.5,
    observer: {
      id: 'obs-d',
      name: 'Observer D',
      location: 'Spain',
    },
    location: { name: 'Spain', lat: 40.4168, lng: -3.7038 },
    telescope: 'Telescope D',
    uncertainty: 0.25,
    source: 'COBS',
  },
];

/**
 * Observations with dimming trend (after perihelion)
 */
export const DIMMING_OBSERVATIONS: CometObservation[] = [
  {
    id: 'obs-10',
    date: '2025-11-05T00:00:00.000Z',
    magnitude: 13.2,
    observer: {
      id: 'obs-e',
      name: 'Observer E',
      location: 'Italy',
    },
    location: { name: 'Italy', lat: 41.9028, lng: 12.4964 },
    telescope: 'Telescope E',
    uncertainty: 0.3,
    source: 'COBS',
  },
  {
    id: 'obs-11',
    date: '2025-11-12T00:00:00.000Z',
    magnitude: 13.9,
    observer: {
      id: 'obs-f',
      name: 'Observer F',
      location: 'Poland',
    },
    location: { name: 'Poland', lat: 52.2297, lng: 21.0122 },
    telescope: 'Telescope F',
    uncertainty: 0.25,
    source: 'COBS',
  },
  {
    id: 'obs-12',
    date: '2025-11-19T00:00:00.000Z',
    magnitude: 14.5,
    observer: {
      id: 'obs-g',
      name: 'Observer G',
      location: 'Brazil',
    },
    location: { name: 'Brazil', lat: -15.8267, lng: -47.9218 },
    telescope: 'Telescope G',
    uncertainty: 0.35,
    source: 'COBS',
  },
  {
    id: 'obs-13',
    date: '2025-11-26T00:00:00.000Z',
    magnitude: 15.2,
    observer: {
      id: 'obs-h',
      name: 'Observer H',
      location: 'Chile',
    },
    location: { name: 'Chile', lat: -33.4489, lng: -70.6693 },
    telescope: 'Telescope H',
    uncertainty: 0.4,
    source: 'COBS',
  },
];

/**
 * Edge case: Observation at exact perihelion
 */
export const PERIHELION_OBSERVATION: CometObservation = {
  id: 'obs-perihelion',
  date: '2025-10-29T11:35:31.000Z', // Exact perihelion time
  magnitude: 12.1,
  observer: {
    id: 'obs-perihelion',
    name: 'Perihelion Observer',
    location: 'Hawaii',
  },
  location: { name: 'Hawaii', lat: 19.8968, lng: -155.5828 },
  telescope: 'Large Telescope',
  uncertainty: 0.1,
  source: 'COBS',
};

/**
 * Edge case: Missing or invalid data
 */
export const INVALID_OBSERVATIONS = [
  {
    date: '2025-10-15T00:00:00.000Z',
    magnitude: null, // Invalid magnitude
    observer: 'Invalid Observer',
    instrument: 'Telescope',
    uncertainty: 0.3,
  },
  {
    date: 'invalid-date', // Invalid date
    magnitude: 14.5,
    observer: 'Bad Date Observer',
    instrument: 'Telescope',
    uncertainty: 0.3,
  },
];

/**
 * 3I/ATLAS orbital parameters from MPEC 2025-SI6
 */
export const ATLAS_3I_ORBITAL_ELEMENTS = {
  perihelionDate: new Date('2025-10-29T11:35:31Z'),
  perihelionDistance: 1.356320, // AU
  eccentricity: 6.138559, // Hyperbolic orbit
  argumentOfPerihelion: 128.0127, // degrees
  longitudeOfAscendingNode: 322.1574, // degrees
  inclination: 175.1131, // degrees
  epoch: new Date('2025-11-21T00:00:00Z'),
};

/**
 * Sample JPL Horizons ephemeris data
 */
export const SAMPLE_JPL_DATA = {
  ephemeris: {
    r: 1.45, // Heliocentric distance in AU
    delta: 0.98, // Geocentric distance in AU
    phase: 35.2, // Phase angle in degrees
    elongation: 145.8, // Solar elongation in degrees
    magnitude: 13.5, // Predicted magnitude
  },
  position: {
    x: 0.856, // AU
    y: -1.123, // AU
    z: 0.034, // AU
  },
  velocity: {
    x: 0.0123, // AU/day
    y: 0.0089, // AU/day
    z: -0.0012, // AU/day
  },
};

/**
 * Sample positions near perihelion for testing orbital calculations
 */
export const SAMPLE_ORBITAL_POSITIONS = [
  {
    daysFromPerihelion: -30, // 30 days before perihelion
    expectedDistance: 1.8, // Approximate AU
  },
  {
    daysFromPerihelion: 0, // At perihelion
    expectedDistance: 1.356320, // Exact perihelion distance
  },
  {
    daysFromPerihelion: 30, // 30 days after perihelion
    expectedDistance: 2.1, // Approximate AU
  },
  {
    daysFromPerihelion: 90, // 90 days after perihelion
    expectedDistance: 4.5, // Approximate AU
  },
];

/**
 * Quality level mappings for uncertainty
 */
export const QUALITY_MAPPINGS = {
  excellent: { minUncertainty: 0, maxUncertainty: 0.15 },
  good: { minUncertainty: 0.15, maxUncertainty: 0.3 },
  fair: { minUncertainty: 0.3, maxUncertainty: 0.5 },
  poor: { minUncertainty: 0.5, maxUncertainty: 1.0 },
};
