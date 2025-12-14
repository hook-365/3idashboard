/**
 * Standardized configuration for analytics charts
 * Ensures all charts use consistent date ranges and parameters
 *
 * Sources for orbital data:
 * - MPC MPEC 2025-N89: https://minorplanetcenter.net/mpec/K25/K25N89.html
 * - NASA Science: https://science.nasa.gov/solar-system/comets/3i-atlas/
 * - Wikipedia: https://en.wikipedia.org/wiki/3I/ATLAS
 *
 * Last updated: December 14, 2025
 */

// Standard date ranges for all analytics charts
export const ANALYTICS_DATE_CONFIG = {
  // Discovery timeline:
  // - May 21, 2025: Earliest precovery (Weizmann Observatory)
  // - July 1, 2025: Official discovery (ATLAS Chile)
  // - July 2, 2025: MPC announcement, designated 3I/ATLAS
  START_DATE: '2025-07-01T00:00:00.000Z',

  // Perihelion: October 29, 2025 at 11:44 UT
  // Source: NASA, MPC, TheSkyLive
  // Note: Rounded to Oct 29 for chart display (actual time 11:44 UT)
  PERIHELION_DATE: '2025-10-29T11:44:00.000Z',

  // Standard end date - end of year for consistency
  END_DATE: '2025-12-31T23:59:59.999Z',

  // Days from start to perihelion
  DAYS_TO_PERIHELION: 120, // July 1 to Oct 29

  // Total period in days
  TOTAL_DAYS: 183, // July 1 to Dec 31

  // Query parameters for consistent API calls
  QUERY_PARAMS: {
    startDate: '2025-07-01',
    endDate: '2025-12-31',
    limit: 365,
    days: 90  // Maximum for orbital-velocity API (prevents JPL Horizons timeouts)
  }
};

// Coma size conversion constants for meaningful units
export const COMA_CONVERSIONS = {
  // 1 arcminute at different distances (in km)
  ARCMIN_TO_KM_AT_1AU: 725, // km per arcminute at 1 AU

  // Comparative sizes for context
  EARTH_DIAMETER_KM: 12742,
  MOON_DIAMETER_KM: 3474,
  SUN_DIAMETER_KM: 1391000,

  // Distance scaling function
  getKmFromArcmin: (arcminutes: number, distanceAU: number): number => {
    return arcminutes * COMA_CONVERSIONS.ARCMIN_TO_KM_AT_1AU * distanceAU;
  },

  // Comparative context function
  getComparativeSize: (sizeKm: number): { value: number; unit: string; description: string } => {
    if (sizeKm >= COMA_CONVERSIONS.SUN_DIAMETER_KM) {
      return {
        value: parseFloat((sizeKm / COMA_CONVERSIONS.SUN_DIAMETER_KM).toFixed(2)),
        unit: 'Suns',
        description: `${(sizeKm / COMA_CONVERSIONS.SUN_DIAMETER_KM).toFixed(1)} times the Sun's diameter`
      };
    } else if (sizeKm >= COMA_CONVERSIONS.EARTH_DIAMETER_KM * 10) {
      return {
        value: parseFloat((sizeKm / COMA_CONVERSIONS.EARTH_DIAMETER_KM).toFixed(1)),
        unit: 'Earths',
        description: `${(sizeKm / COMA_CONVERSIONS.EARTH_DIAMETER_KM).toFixed(1)} Earth diameters`
      };
    } else if (sizeKm >= COMA_CONVERSIONS.MOON_DIAMETER_KM) {
      return {
        value: parseFloat((sizeKm / COMA_CONVERSIONS.MOON_DIAMETER_KM).toFixed(1)),
        unit: 'Moons',
        description: `${(sizeKm / COMA_CONVERSIONS.MOON_DIAMETER_KM).toFixed(1)} Moon diameters`
      };
    } else {
      return {
        value: parseFloat((sizeKm / 1000).toFixed(0)),
        unit: 'km',
        description: `${(sizeKm / 1000).toFixed(0)} thousand kilometers`
      };
    }
  }
};

// Orbital velocity visualization improvements
export const ORBITAL_VIZ_CONFIG = {
  // More meaningful velocity units
  AU_PER_DAY_TO_KM_PER_SEC: 1731.46, // Conversion factor

  // Velocity magnitude context
  EARTH_ORBITAL_VELOCITY_KM_S: 29.78, // km/s
  ESCAPE_VELOCITY_KM_S: 11.2, // Earth escape velocity

  // Convert AU/day to km/s for better understanding
  convertVelocity: (auPerDay: number): { kmPerSec: number; earthOrbitalRatio: number } => {
    const kmPerSec = auPerDay * ORBITAL_VIZ_CONFIG.AU_PER_DAY_TO_KM_PER_SEC;
    const earthOrbitalRatio = kmPerSec / ORBITAL_VIZ_CONFIG.EARTH_ORBITAL_VELOCITY_KM_S;
    return { kmPerSec, earthOrbitalRatio };
  }
};

// Chart configuration for consistent styling
export const CHART_STYLE_CONFIG = {
  colors: {
    primary: '#3b82f6',      // Blue
    secondary: '#10b981',    // Green
    accent: '#f59e0b',       // Orange
    danger: '#ef4444',       // Red
    purple: '#8b5cf6',       // Purple
    gray: '#6b7280'          // Gray
  },

  // Consistent perihelion marker
  perihelionMarker: {
    x: ANALYTICS_DATE_CONFIG.PERIHELION_DATE,
    borderColor: '#dc2626',
    borderWidth: 2,
    label: {
      content: 'Perihelion (Oct 29)',
      enabled: true,
      position: 'top'
    }
  }
};

const analyticsConfig = {
  ANALYTICS_DATE_CONFIG,
  COMA_CONVERSIONS,
  ORBITAL_VIZ_CONFIG,
  CHART_STYLE_CONFIG
};
export default analyticsConfig;
