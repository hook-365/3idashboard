import { AU } from '../../../core/constants';
import { getJD } from '../../../utils/JD';

export const atlas3i = {
	title: '3I/ATLAS (Interstellar Comet)',
	name: '3i-atlas',
	mass: 2.2e14, // Approximate comet mass
	radius: 50, // Visual size for rendering
	color: '#F97316', // Orange color for visibility
	orbit: {
		// Epoch at perihelion: October 29, 2025 05:03:46 UTC
		// Source: Minor Planet Center MPEC 2025-N12 (Official orbital solution)
		// Perihelion date: 2025 Oct. 29.21095 TT
		epoch: getJD(new Date('2025-10-29T05:03:46.000Z')),
		base: {
			// Official orbital elements from Minor Planet Center MPEC 2025-N12
			// Last updated: 2025-07-01 (discovery announcement)
			// q = 1.3745928 AU, a = q/(1-e) = -0.26044 AU
			a: -0.26044 * AU, // Semi-major axis (negative for hyperbolic orbit)
			e: 6.2769203, // Eccentricity (highly hyperbolic - fastest interstellar object known)
			i: 175.11669, // Inclination in degrees (retrograde, ~5° from ecliptic plane)
			M: 0, // Mean anomaly at epoch (0 at perihelion)
			w: 127.79317, // Argument of periapsis (degrees)
			o: 322.27219, // Longitude of ascending node (degrees)
		},
		// Daily change in orbital elements (minimal for interstellar object)
		day: {
			a: 0,
			e: 0,
			i: 0,
			M: 0.01308656479244564, // Daily motion (approximate)
			w: 0,
			o: 0,
		},
	},
};