import { AU } from '../../../core/constants';
import { getJD } from '../../../utils/JD';

export const atlas3i = {
	title: '3I/ATLAS (Interstellar Comet)',
	name: '3i-atlas',
	mass: 2.2e14, // Approximate comet mass
	radius: 50, // Visual size for rendering
	color: '#F97316', // Orange color for visibility
	orbit: {
		// Epoch at perihelion: October 30, 2025
		epoch: getJD(new Date('2025-10-30T00:00:00.000Z')),
		base: {
			// Orbital elements for 3I/ATLAS from JPL Horizons
			a: -1.9 * AU, // Semi-major axis (negative for hyperbolic orbit)
			e: 3.2, // Eccentricity (>1 indicates hyperbolic/interstellar trajectory)
			i: 109.0, // Inclination in degrees (retrograde orbit)
			M: 0, // Mean anomaly at epoch (0 at perihelion)
			w: 111.33, // Argument of periapsis (approximate)
			o: 58.42, // Longitude of ascending node (approximate)
		},
		// Daily change in orbital elements (minimal for interstellar object)
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