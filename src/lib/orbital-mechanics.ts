/**
 * Orbital Mechanics Calculations
 * Extracted and modernized from jsOrrery for use with React Three Fiber
 */

import { Vector3 } from 'three';

// Constants
export const G = 6.6742e-11; // Gravitational constant
export const AU = 149597870; // Astronomical unit in km
export const KM = 1000; // km to m
export const DEG_TO_RAD = Math.PI / 180;
export const CIRCLE = 2 * Math.PI;
export const DAY = 60 * 60 * 24; // seconds
export const YEAR = 365.25; // days
export const CENTURY = 100 * YEAR; // days
export const J2000 = 2451545; // Julian date for J2000 epoch

// Math utilities
export function sinh(a: number): number {
  return (Math.exp(a) - Math.exp(-a)) / 2;
}

export function cosh(a: number): number {
  return (Math.exp(a) + Math.exp(-a)) / 2;
}

export function sign(a: number): number {
  return a >= 0.0 ? 1 : -1;
}

// Julian Date utilities
const UNIX_EPOCH_JULIAN_DATE = 2440587.5;

export function getJD(date: Date): number {
  return date.getTime() / 1000 / DAY + UNIX_EPOCH_JULIAN_DATE;
}

export function getJ2000SecondsFromJD(jd: number): number {
  return (jd - J2000) * DAY;
}

export function getDateFromJD(jd: number): Date {
  const t = (jd - UNIX_EPOCH_JULIAN_DATE) * DAY * 1000;
  return new Date(t);
}

// Orbital element types
export interface OrbitalElements {
  a: number; // Semi-major axis (m)
  e: number; // Eccentricity
  i: number; // Inclination (degrees)
  M?: number; // Mean anomaly (degrees)
  w?: number; // Argument of periapsis (degrees)
  o: number; // Longitude of ascending node (degrees)
  l?: number; // Mean longitude (degrees)
  lp?: number; // Longitude of periapsis (degrees)
}

export interface ComputedElements extends OrbitalElements {
  E: number; // Eccentric anomaly
  pos: Vector3; // Position in orbital plane
  r: number; // Distance from center
  v: number; // True anomaly
  t: number; // Time offset from epoch
}

// Eccentric anomaly solvers
function solveEccentricAnomaly(
  f: (x: number) => number,
  x0: number,
  maxIter: number
): number {
  let x = 0;
  let x2 = x0;

  for (let i = 0; i < maxIter; i++) {
    x = x2;
    x2 = f(x);
  }

  return x2;
}

function solveKepler(e: number, M: number) {
  return (x: number) => {
    return x + (M + e * Math.sin(x) - x) / (1 - e * Math.cos(x));
  };
}

function solveKeplerLaguerreConway(e: number, M: number) {
  return (x: number) => {
    const s = e * Math.sin(x);
    const c = e * Math.cos(x);
    const f = x - s - M;
    const f1 = 1 - c;
    const f2 = s;

    return (
      x +
      -5 * f / (f1 + sign(f1) * Math.sqrt(Math.abs(16 * f1 * f1 - 20 * f * f2)))
    );
  };
}

function solveKeplerLaguerreConwayHyp(e: number, M: number) {
  return (x: number) => {
    const s = e * sinh(x);
    const c = e * cosh(x);
    const f = x - s - M;
    const f1 = c - 1;
    const f2 = s;

    return (
      x +
      -5 * f / (f1 + sign(f1) * Math.sqrt(Math.abs(16 * f1 * f1 - 20 * f * f2)))
    );
  };
}

export function solveEccentricAnomalyForElements(e: number, M: number): number {
  if (e === 0.0) {
    return M;
  } else if (e < 0.9) {
    return solveEccentricAnomaly(solveKepler(e, M), M, 6);
  } else if (e < 1.0) {
    const E = M + 0.85 * e * (Math.sin(M) >= 0.0 ? 1 : -1);
    return solveEccentricAnomaly(solveKeplerLaguerreConway(e, M), E, 8);
  } else if (e === 1.0) {
    return M;
  }

  // Hyperbolic orbit (e > 1)
  const E = Math.log((2 * M) / e + 1.85);
  return solveEccentricAnomaly(solveKeplerLaguerreConwayHyp(e, M), E, 30);
}

/**
 * Calculate orbital elements at a given Julian date
 */
export function calculateElements(
  baseElements: OrbitalElements,
  dailyChange: Partial<OrbitalElements>,
  jd: number,
  epoch?: number
): ComputedElements {
  // Calculate time since epoch
  let correctedTimeEpoch = getJ2000SecondsFromJD(jd);
  if (epoch) {
    const epochOffset = getJ2000SecondsFromJD(epoch);
    correctedTimeEpoch -= epochOffset;
  }

  const tDays = correctedTimeEpoch / DAY;
  const T = tDays / CENTURY;

  // Compute element changes over time
  // Note: dailyChange values are treated as per-century changes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const computed: any = {
    t: correctedTimeEpoch,
    a: baseElements.a + (dailyChange.a || 0) * T,
    e: baseElements.e + (dailyChange.e || 0) * T,
    i: baseElements.i + (dailyChange.i || 0) * T,
    M: (baseElements.M || 0) + (dailyChange.M || 0) * T,
    w: (baseElements.w || 0) + (dailyChange.w || 0) * T,
    o: baseElements.o + (dailyChange.o || 0) * T,
  };

  // Handle mean longitude notation (used by most planets)
  if (baseElements.l !== undefined && baseElements.lp !== undefined) {
    // Compute l and lp with their changes (per century)
    computed.l = baseElements.l + (dailyChange.l || 0) * T;
    computed.lp = baseElements.lp + (dailyChange.lp || 0) * T;

    // Derive w and M from l and lp
    computed.w = computed.lp - computed.o;
    computed.M = computed.l - computed.lp;
  }

  // Convert angles to radians
  computed.i *= DEG_TO_RAD;
  computed.o *= DEG_TO_RAD;
  computed.w *= DEG_TO_RAD;
  computed.M *= DEG_TO_RAD;

  // Solve for eccentric anomaly
  computed.E = solveEccentricAnomalyForElements(computed.e, computed.M);

  // Normalize angles
  computed.E %= CIRCLE;
  computed.i %= CIRCLE;
  computed.o %= CIRCLE;
  computed.w %= CIRCLE;
  computed.M %= CIRCLE;

  // Calculate position in orbital plane
  if (computed.e < 1.0) {
    // Elliptical orbit
    computed.pos = new Vector3(
      computed.a * (Math.cos(computed.E) - computed.e),
      computed.a * Math.sqrt(1 - computed.e * computed.e) * Math.sin(computed.E),
      0
    );
  } else {
    // Hyperbolic orbit (for 3I/ATLAS)
    const a = Math.abs(computed.a);
    computed.pos = new Vector3(
      a * (computed.e - cosh(computed.E)),
      a * Math.sqrt(computed.e * computed.e - 1) * sinh(computed.E),
      0
    );
  }

  computed.r = computed.pos.length();
  computed.v = Math.atan2(computed.pos.y, computed.pos.x);

  return computed as ComputedElements;
}

/**
 * Convert orbital plane position to 3D ecliptic coordinates
 */
export function getPositionFromElements(computed: ComputedElements): Vector3 {
  // Clone position to avoid mutation
  const pos = computed.pos.clone();

  // Apply orbital plane rotation
  // 1. Rotate by argument of periapsis (w)
  pos.applyAxisAngle(new Vector3(0, 0, 1), computed.w!);

  // 2. Rotate by inclination (i)
  pos.applyAxisAngle(new Vector3(1, 0, 0), computed.i);

  // 3. Rotate by longitude of ascending node (o)
  pos.applyAxisAngle(new Vector3(0, 0, 1), computed.o);

  return pos;
}

/**
 * Calculate position at a given Julian date
 */
export function calculatePosition(
  baseElements: OrbitalElements,
  dailyChange: Partial<OrbitalElements>,
  jd: number,
  epoch?: number
): Vector3 {
  const computed = calculateElements(baseElements, dailyChange, jd, epoch);
  return getPositionFromElements(computed);
}