/**
 * Celestial Body Data
 * Planet and comet orbital elements for visualization
 * Data sourced from jsOrrery body definitions
 */

import { AU } from './orbital-mechanics';

export interface CelestialBody {
  title: string;
  name: string;
  mass: number;
  radius: number;
  color: string;
  orbit: {
    epoch?: number; // Julian date
    base: {
      a: number; // Semi-major axis (meters, multiply AU by 149597870000)
      e: number; // Eccentricity
      i: number; // Inclination (degrees)
      M?: number; // Mean anomaly (degrees)
      w?: number; // Argument of periapsis (degrees)
      o: number; // Longitude of ascending node (degrees)
      l?: number; // Mean longitude (degrees)
      lp?: number; // Longitude of periapsis (degrees)
    };
    day?: Partial<{
      a: number;
      e: number;
      i: number;
      M: number;
      w: number;
      o: number;
      l: number;
      lp: number;
    }>;
    cy?: Partial<{
      a: number;
      e: number;
      i: number;
      M: number;
      w: number;
      o: number;
      l: number;
      lp: number;
    }>;
  };
}

// Convert AU to meters (for Three.js coordinate system we'll use a scaled AU)
const AU_M = AU * 1000;

/**
 * Sun
 */
export const sun: CelestialBody = {
  title: 'The Sun',
  name: 'sun',
  mass: 1.9891e30,
  radius: 695700,
  color: '#FDB813',
  orbit: {
    base: {
      a: 0,
      e: 0,
      i: 0,
      o: 0,
    },
  },
};

/**
 * Mercury
 */
export const mercury: CelestialBody = {
  title: 'Mercury',
  name: 'mercury',
  mass: 3.3011e23,
  radius: 2439.7,
  color: '#8C7853',
  orbit: {
    base: {
      a: 0.38709927 * AU_M,
      e: 0.20563593,
      i: 7.00497902,
      l: 252.25032350,
      lp: 77.45779628,
      o: 48.33076593,
    },
    cy: {
      a: 0.00000037 * AU_M,
      e: 0.00001906,
      i: -0.00594749,
      l: 149472.67411175,
      lp: 0.16047689,
      o: -0.12534081,
    },
  },
};

/**
 * Venus
 */
export const venus: CelestialBody = {
  title: 'Venus',
  name: 'venus',
  mass: 4.8675e24,
  radius: 6051.8,
  color: '#FFC649',
  orbit: {
    base: {
      a: 0.72333566 * AU_M,
      e: 0.00677672,
      i: 3.39467605,
      l: 181.97909950,
      lp: 131.60246718,
      o: 76.67984255,
    },
    cy: {
      a: 0.00000390 * AU_M,
      e: -0.00004107,
      i: -0.00078890,
      l: 58517.81538729,
      lp: 0.00268329,
      o: -0.27769418,
    },
  },
};

/**
 * Earth
 */
export const earth: CelestialBody = {
  title: 'The Earth',
  name: 'earth',
  mass: 5.9736e24,
  radius: 6371,
  color: '#2E8B57',
  orbit: {
    base: {
      a: 1.00000261 * AU_M,
      e: 0.01671123,
      i: -0.00001531,
      l: 100.46457166,
      lp: 102.93768193,
      o: 0.0,
    },
    cy: {
      a: 0.00000562 * AU_M,
      e: -0.00004392,
      i: -0.01294668,
      l: 35999.37244981,
      lp: 0.32327364,
      o: 0.0,
    },
  },
};

/**
 * Mars
 */
export const mars: CelestialBody = {
  title: 'Mars',
  name: 'mars',
  mass: 6.4171e23,
  radius: 3389.5,
  color: '#DC2626',
  orbit: {
    base: {
      a: 1.52371034 * AU_M,
      e: 0.09339410,
      i: 1.84969142,
      l: -4.55343205,
      lp: -23.94362959,
      o: 49.55953891,
    },
    cy: {
      a: 0.00001847 * AU_M,
      e: 0.00007882,
      i: -0.00813131,
      l: 19140.30268499,
      lp: 0.44441088,
      o: -0.29257343,
    },
  },
};

/**
 * Jupiter
 */
export const jupiter: CelestialBody = {
  title: 'Jupiter',
  name: 'jupiter',
  mass: 1.8986e27,
  radius: 71492,
  color: '#D4A574',
  orbit: {
    base: {
      a: 5.202887 * AU_M,
      e: 0.04838624,
      i: 1.30439695,
      l: 34.39644051,
      lp: 14.72847983,
      o: 100.4739091,
    },
    cy: {
      a: -0.00011607 * AU_M,
      e: -0.00013253,
      i: -0.00183714,
      l: 3034.74612775,
      lp: 0.21252668,
      o: 0.20469106,
    },
  },
};

/**
 * Saturn
 */
export const saturn: CelestialBody = {
  title: 'Saturn',
  name: 'saturn',
  mass: 5.6834e26,
  radius: 58232,
  color: '#F4D47C',
  orbit: {
    base: {
      a: 9.53667594 * AU_M,
      e: 0.05386179,
      i: 2.48599187,
      l: 49.95424423,
      lp: 92.59887831,
      o: 113.66242448,
    },
    cy: {
      a: -0.00125060 * AU_M,
      e: -0.00050991,
      i: 0.00193609,
      l: 1222.49362201,
      lp: -0.41897216,
      o: -0.28867794,
    },
  },
};

/**
 * Uranus
 */
export const uranus: CelestialBody = {
  title: 'Uranus',
  name: 'uranus',
  mass: 8.681e25,
  radius: 25362,
  color: '#4FC3F7',
  orbit: {
    base: {
      a: 19.18916464 * AU_M,
      e: 0.04725744,
      i: 0.77263783,
      l: 313.23810451,
      lp: 170.95427630,
      o: 74.01692503,
    },
    cy: {
      a: -0.00196176 * AU_M,
      e: -0.00004397,
      i: -0.00242939,
      l: 428.48202785,
      lp: 0.40805281,
      o: 0.04240589,
    },
  },
};

/**
 * Neptune
 */
export const neptune: CelestialBody = {
  title: 'Neptune',
  name: 'neptune',
  mass: 1.0243e26,
  radius: 24622,
  color: '#5E72E4',
  orbit: {
    base: {
      a: 30.06992276 * AU_M,
      e: 0.00859048,
      i: 1.77004347,
      l: -55.12002969,
      lp: 44.96476227,
      o: 131.78422574,
    },
    cy: {
      a: 0.00026291 * AU_M,
      e: 0.00005105,
      i: 0.00035372,
      l: 218.45945325,
      lp: -0.32241464,
      o: -0.00508664,
    },
  },
};

/**
 * Pluto (dwarf planet)
 */
export const pluto: CelestialBody = {
  title: 'Pluto',
  name: 'pluto',
  mass: 1.309e22,
  radius: 1188.3,
  color: '#C2A37D',
  orbit: {
    base: {
      a: 39.48211675 * AU_M,
      e: 0.24882730,
      i: 17.14001206,
      l: 238.92903833,
      lp: 224.06891629,
      o: 110.30393684,
    },
    cy: {
      a: -0.00031596 * AU_M,
      e: 0.00005170,
      i: 0.00004818,
      l: 145.20780515,
      lp: -0.04062942,
      o: -0.01183482,
    },
  },
};

/**
 * 3I/ATLAS (Interstellar Comet)
 * Official orbital elements from Minor Planet Center (epoch 2025-May-05)
 */
export const atlas3i: CelestialBody = {
  title: '3I/ATLAS (Interstellar Comet)',
  name: '3i-atlas',
  mass: 2.2e14,
  radius: 50,
  color: '#F97316',
  orbit: {
    epoch: 2460613.5, // October 29, 2025 11:44 UT (perihelion)
    base: {
      a: -1.3746 * AU_M, // Negative for hyperbolic orbit, q=1.3746 AU perihelion distance
      e: 6.2769, // Hyperbolic eccentricity (MPC: 6.2769203)
      i: 175.117, // Nearly anti-aligned with ecliptic (MPC: 175.11669°)
      M: 0, // At perihelion
      w: 127.79, // Argument of periapsis (MPC: 127.79317°)
      o: 322.27, // Longitude of ascending node (MPC: 322.27219°)
    },
    day: {
      a: 0,
      e: 0,
      i: 0,
      M: 0.01308656479244564, // Daily motion
      w: 0,
      o: 0,
    },
  },
};

/**
 * All celestial bodies in the solar system
 */
export const celestialBodies: CelestialBody[] = [
  sun,
  mercury,
  venus,
  earth,
  mars,
  jupiter,
  saturn,
  uranus,
  neptune,
  pluto,
  atlas3i,
];

/**
 * Get body by name
 */
export function getBodyByName(name: string): CelestialBody | undefined {
  return celestialBodies.find((body) => body.name === name);
}

/**
 * Additional Comets Registry (2025)
 * For optional display in solar system visualization
 */
export interface CometInfo {
  id: string;
  name: string;
  designation: string;
  color: string;
  description: string;
  perihelionDate: string;
  discoveryDate?: string;
  visible: boolean; // Default visibility
}

export const additionalComets: CometInfo[] = [
  {
    id: 'tsuchinshan',
    name: 'Tsuchinshan-ATLAS',
    designation: 'C/2023 A3',
    color: '#FFA500', // Orange
    description: 'Bright comet visible in late 2024',
    perihelionDate: '2024-09-27',
    visible: false
  },
  {
    id: 'halley',
    name: 'Halley',
    designation: '1P/Halley',
    color: '#00D9FF', // Cyan
    description: 'Famous periodic comet, returns every 76 years',
    perihelionDate: '2061-07-28',
    visible: false
  },
  {
    id: 'encke',
    name: 'Encke',
    designation: '2P/Encke',
    color: '#FFD700', // Gold
    description: 'Short-period comet with 3.3 year orbit',
    perihelionDate: '2024-02-22',
    visible: false
  },
  {
    id: 'pons-brooks',
    name: 'Pons-Brooks',
    designation: '12P/Pons-Brooks',
    color: '#FF69B4', // Hot pink
    description: 'Periodic comet with 71 year orbit',
    perihelionDate: '2024-04-21',
    visible: false
  },
  {
    id: 'lemmon',
    name: 'Lemmon',
    designation: 'C/2021 S3',
    color: '#9370DB', // Medium purple
    description: 'Recent discovery, long-period comet',
    perihelionDate: '2023-02-07',
    visible: false
  },
  {
    id: 'atlas',
    name: 'ATLAS (Y4)',
    designation: 'C/2019 Y4',
    color: '#DC143C', // Crimson
    description: 'Disintegrated comet discovered by ATLAS',
    perihelionDate: '2020-05-31',
    visible: false
  }
];