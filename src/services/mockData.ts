// Mock data for development - will be replaced with real COBS API data
export const mockCometData = {
  name: '3I/ATLAS',
  designation: 'Interstellar Comet',
  perihelionDate: '2025-10-30T00:00:00Z',
  currentMagnitude: 12.5,
  observations: [
    {
      id: '1',
      date: '2025-09-20T00:00:00Z',
      magnitude: 12.8,
      observer: 'John Smith',
      location: 'Arizona, USA',
      telescope: '16-inch Reflector',
      coordinates: { lat: 33.4484, lng: -112.0740 },
      quality: 'good'
    },
    {
      id: '2',
      date: '2025-09-21T00:00:00Z',
      magnitude: 12.6,
      observer: 'Maria Garcia',
      location: 'Chile',
      telescope: '20-inch Reflector',
      coordinates: { lat: -33.4489, lng: -70.6693 },
      quality: 'excellent'
    },
    {
      id: '3',
      date: '2025-09-22T00:00:00Z',
      magnitude: 12.5,
      observer: 'Hiroshi Tanaka',
      location: 'Japan',
      telescope: '14-inch SCT',
      coordinates: { lat: 35.6762, lng: 139.6503 },
      quality: 'good'
    },
    {
      id: '4',
      date: '2025-09-23T00:00:00Z',
      magnitude: 12.4,
      observer: 'Emma Wilson',
      location: 'Australia',
      telescope: '18-inch Dobsonian',
      coordinates: { lat: -33.8688, lng: 151.2093 },
      quality: 'fair'
    },
    {
      id: '5',
      date: '2025-09-24T00:00:00Z',
      magnitude: 12.3,
      observer: 'Pierre Dubois',
      location: 'France',
      telescope: '12-inch Refractor',
      coordinates: { lat: 48.8566, lng: 2.3522 },
      quality: 'excellent'
    },
    {
      id: '6',
      date: '2025-09-19T00:00:00Z',
      magnitude: 12.9,
      observer: 'Sarah Johnson',
      location: 'California, USA',
      telescope: '12-inch SCT',
      coordinates: { lat: 34.0522, lng: -118.2437 },
      quality: 'good'
    },
    {
      id: '7',
      date: '2025-09-18T00:00:00Z',
      magnitude: 13.0,
      observer: 'Klaus Mueller',
      location: 'Germany',
      telescope: '10-inch Reflector',
      coordinates: { lat: 52.5200, lng: 13.4050 },
      quality: 'fair'
    },
    {
      id: '8',
      date: '2025-09-17T00:00:00Z',
      magnitude: 13.1,
      observer: 'Roberto Silva',
      location: 'Brazil',
      telescope: '14-inch Reflector',
      coordinates: { lat: -23.5505, lng: -46.6333 },
      quality: 'good'
    },
    {
      id: '9',
      date: '2025-09-16T00:00:00Z',
      magnitude: 13.2,
      observer: 'Lisa Chen',
      location: 'Taiwan',
      telescope: '8-inch SCT',
      coordinates: { lat: 25.0330, lng: 121.5654 },
      quality: 'poor'
    },
    {
      id: '10',
      date: '2025-09-15T00:00:00Z',
      magnitude: 13.1,
      observer: 'David Park',
      location: 'South Korea',
      telescope: '16-inch Reflector',
      coordinates: { lat: 37.5665, lng: 126.9780 },
      quality: 'excellent'
    }
  ].map(obs => ({
    ...obs,
    observer: {
      id: obs.id,
      name: obs.observer,
      location: obs.location,
      coordinates: obs.coordinates,
      telescope: obs.telescope,
      observationCount: 1
    },
    location: {
      lat: obs.coordinates.lat,
      lng: obs.coordinates.lng,
      name: obs.location
    },
    coordinates: {
      ra: '12h 34m 56s',
      dec: '+12° 34\' 56"'
    }
  })),
  lightCurve: [
    { date: '2025-08-15', magnitude: 13.8, observer: 'ESO La Silla', source: 'Professional' },
    { date: '2025-08-20', magnitude: 13.6, observer: 'Mauna Kea', source: 'Professional' },
    { date: '2025-08-25', magnitude: 13.4, observer: 'John Smith', source: 'Amateur' },
    { date: '2025-09-01', magnitude: 13.2, observer: 'Maria Garcia', source: 'Amateur' },
    { date: '2025-09-03', magnitude: 13.1, observer: 'Hiroshi Tanaka', source: 'Amateur' },
    { date: '2025-09-05', magnitude: 13.0, observer: 'Emma Wilson', source: 'Amateur' },
    { date: '2025-09-07', magnitude: 12.9, observer: 'Pierre Dubois', source: 'Amateur' },
    { date: '2025-09-10', magnitude: 12.9, observer: 'NEOWISE Survey', source: 'Survey' },
    { date: '2025-09-12', magnitude: 12.8, observer: 'John Smith', source: 'Amateur' },
    { date: '2025-09-15', magnitude: 12.7, observer: 'Catalina Sky Survey', source: 'Survey' },
    { date: '2025-09-17', magnitude: 12.6, observer: 'Maria Garcia', source: 'Amateur' },
    { date: '2025-09-20', magnitude: 12.5, observer: 'Hiroshi Tanaka', source: 'Amateur' },
    { date: '2025-09-22', magnitude: 12.4, observer: 'Emma Wilson', source: 'Amateur' },
    { date: '2025-09-24', magnitude: 12.3, observer: 'Pierre Dubois', source: 'Amateur' },
  ]
};

export const mockStats = {
  totalObservations: 127,
  activeObservers: 23,
  daysUntilPerihelion: Math.ceil((new Date('2025-10-30').getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  currentMagnitude: 12.3,
  brightestMagnitude: 12.3,
  lastUpdated: new Date().toISOString()
};

export const mockObservers = [
  { id: '1', name: 'John Smith', location: 'Arizona, USA', coordinates: { lat: 33.4484, lng: -112.0740 }, observationCount: 15 },
  { id: '2', name: 'Maria Garcia', location: 'Chile', coordinates: { lat: -33.4489, lng: -70.6693 }, observationCount: 12 },
  { id: '3', name: 'Hiroshi Tanaka', location: 'Japan', coordinates: { lat: 35.6762, lng: 139.6503 }, observationCount: 18 },
  { id: '4', name: 'Emma Wilson', location: 'Australia', coordinates: { lat: -33.8688, lng: 151.2093 }, observationCount: 9 },
  { id: '5', name: 'Pierre Dubois', location: 'France', coordinates: { lat: 48.8566, lng: 2.3522 }, observationCount: 11 },
];

// Mock morphology data showing comet's physical evolution
export const mockMorphologyData = [
  {
    date: '2025-07-15T00:00:00Z',
    comaSize: 0.8, // arcminutes
    dustConcentration: 8, // DC scale 0-10
    tailLength: 0.2, // degrees
    tailPositionAngle: 285, // degrees from north
    observer: 'John Smith',
    quality: 'good' as const,
    heliocentric_distance: 3.2, // AU
    geocentric_distance: 2.8, // AU
    notes: 'First detection of weak coma activity'
  },
  {
    date: '2025-08-01T00:00:00Z',
    comaSize: 1.2,
    dustConcentration: 7,
    tailLength: 0.5,
    tailPositionAngle: 283,
    observer: 'Maria Garcia',
    quality: 'excellent' as const,
    heliocentric_distance: 2.9,
    geocentric_distance: 2.4,
    notes: 'Clear tail development becoming visible'
  },
  {
    date: '2025-08-15T00:00:00Z',
    comaSize: 1.8,
    dustConcentration: 6,
    tailLength: 0.8,
    tailPositionAngle: 280,
    observer: 'Hiroshi Tanaka',
    quality: 'good' as const,
    heliocentric_distance: 2.6,
    geocentric_distance: 2.1,
    notes: 'Coma expansion accelerating'
  },
  {
    date: '2025-09-01T00:00:00Z',
    comaSize: 2.5,
    dustConcentration: 5,
    tailLength: 1.2,
    tailPositionAngle: 278,
    observer: 'Emma Wilson',
    quality: 'excellent' as const,
    heliocentric_distance: 2.2,
    geocentric_distance: 1.8,
    notes: 'Significant brightening and tail extension'
  },
  {
    date: '2025-09-15T00:00:00Z',
    comaSize: 3.2,
    dustConcentration: 4,
    tailLength: 1.8,
    tailPositionAngle: 275,
    observer: 'Pierre Dubois',
    quality: 'good' as const,
    heliocentric_distance: 1.9,
    geocentric_distance: 1.5,
    notes: 'Peak activity approaching'
  },
  {
    date: '2025-10-01T00:00:00Z',
    comaSize: 4.1,
    dustConcentration: 3,
    tailLength: 2.5,
    tailPositionAngle: 272,
    observer: 'John Smith',
    quality: 'excellent' as const,
    heliocentric_distance: 1.5,
    geocentric_distance: 1.2,
    notes: 'Maximum coma development observed'
  },
  {
    date: '2025-10-15T00:00:00Z',
    comaSize: 4.8,
    dustConcentration: 2,
    tailLength: 3.2,
    tailPositionAngle: 270,
    observer: 'Maria Garcia',
    quality: 'excellent' as const,
    heliocentric_distance: 1.2,
    geocentric_distance: 0.9,
    notes: 'Pre-perihelion maximum activity'
  },
  {
    date: '2025-10-30T00:00:00Z', // Perihelion
    comaSize: 5.5,
    dustConcentration: 1,
    tailLength: 4.0,
    tailPositionAngle: 268,
    observer: 'Hiroshi Tanaka',
    quality: 'excellent' as const,
    heliocentric_distance: 1.0,
    geocentric_distance: 0.8,
    notes: 'Perihelion passage - maximum brightness'
  },
  {
    date: '2025-11-15T00:00:00Z',
    comaSize: 4.9,
    dustConcentration: 2,
    tailLength: 3.8,
    tailPositionAngle: 265,
    observer: 'Emma Wilson',
    quality: 'good' as const,
    heliocentric_distance: 1.3,
    geocentric_distance: 1.1,
    notes: 'Post-perihelion activity decline beginning'
  },
  {
    date: '2025-12-01T00:00:00Z',
    comaSize: 3.8,
    dustConcentration: 3,
    tailLength: 2.9,
    tailPositionAngle: 262,
    observer: 'Pierre Dubois',
    quality: 'good' as const,
    heliocentric_distance: 1.7,
    geocentric_distance: 1.4,
    notes: 'Gradual fading as comet recedes'
  },
  {
    date: '2025-12-15T00:00:00Z',
    comaSize: 2.9,
    dustConcentration: 4,
    tailLength: 2.1,
    tailPositionAngle: 260,
    observer: 'John Smith',
    quality: 'fair' as const,
    heliocentric_distance: 2.1,
    geocentric_distance: 1.8,
    notes: 'Continued decline in activity'
  },
  {
    date: '2026-01-01T00:00:00Z',
    comaSize: 2.1,
    dustConcentration: 5,
    tailLength: 1.5,
    tailPositionAngle: 258,
    observer: 'Maria Garcia',
    quality: 'fair' as const,
    heliocentric_distance: 2.6,
    geocentric_distance: 2.2,
    notes: 'Activity stabilizing at lower level'
  }
];