// TypeScript interfaces for comet data structures

export interface CometObservation {
  id: string;
  date: string | Date;
  magnitude: number;
  observer: {
    id: string;
    name: string;
    location: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    telescope?: string;
    observationCount?: number;
  };
  location: {
    lat: number;
    lng: number;
    name: string;
  };
  telescope?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  coordinates?: {
    ra: string;
    dec: string;
  };
}

export interface LightCurvePoint {
  date: string | Date;
  magnitude: number;
  source?: string;
  observer?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CometData {
  name: string;
  designation: string;
  perihelionDate: string;
  currentMagnitude: number;
  observations: CometObservation[];
  lightCurve: LightCurvePoint[];
}

export interface CometStats {
  totalObservations: number;
  activeObservers: number;
  daysUntilPerihelion: number;
  currentMagnitude: number;
  brightestMagnitude: number;
  lastUpdated: string;
}

export interface Observer {
  id: string;
  name: string;
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  observationCount: number;
}

export interface DashboardData {
  comet: CometData;
  stats: CometStats;
  observers: Observer[];
}

export interface CometMorphologyData {
  date: string | Date;
  comaSize: number; // arcminutes
  dustConcentration: number; // DC scale 0-10
  tailLength: number; // degrees
  tailPositionAngle: number; // degrees from north
  observer?: string;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  heliocentric_distance?: number; // AU
  geocentric_distance?: number; // AU
}