import { AU } from '../../../core/constants';
import { getJD } from '../../../utils/JD';

export const atlas3i = {
	title: '3I/ATLAS (Interstellar Comet)',
	name: '3i-atlas',
	mass: 2.2e14, // Approximate comet mass
	radius: 50, // Visual size for rendering
	color: '#F97316', // Orange color for visibility
	orbit: {
		// Epoch at perihelion: October 29, 2025 11:44 UT
		// Sources:
		// - MPC MPEC 2025-N89: https://minorplanetcenter.net/mpec/K25/K25N89.html
		// - NASA Science: https://science.nasa.gov/solar-system/comets/3i-atlas/
		// - Wikipedia: https://en.wikipedia.org/wiki/3I/ATLAS
		// Last updated: December 2025 (refined orbital solution)
		epoch: getJD(new Date('2025-10-29T11:44:00.000Z')),
		base: {
			// Refined orbital elements - December 2025
			// q = 1.36 AU (perihelion distance)
			// e = 6.139 ± 0.00003 (highest eccentricity of any known object)
			// a = q/(1-e) ≈ -0.265 AU (negative for hyperbolic orbit)
			// v∞ = 57 km/s (hyperbolic excess velocity)
			// v_perihelion = 68 km/s
			a: -0.265 * AU, // Semi-major axis (negative for hyperbolic orbit)
			e: 6.139, // Eccentricity - highest of 3 known ISOs (> 1I at 1.2, > 2I at 3.4)
			i: 175.0, // Inclination in degrees (retrograde, ~5° from ecliptic plane)
			M: 0, // Mean anomaly at epoch (0 at perihelion)
			w: 127.79, // Argument of periapsis (degrees)
			o: 322.27, // Longitude of ascending node (degrees)
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