import { sun } from './bodies/sun';
import { mercury } from './bodies/mercury';
import { venus } from './bodies/venus';
import { earth } from './bodies/earth';
import { mars } from './bodies/mars';
import { jupiter } from './bodies/jupiter';
import { saturn } from './bodies/saturn';
import { uranus } from './bodies/uranus';
import { neptune } from './bodies/neptune';
import { pluto } from './bodies/pluto';
import { atlas3i } from './bodies/atlas3i';

export default {
	name: 'SolarSystemWith3I',
	title: 'Solar System with 3I/ATLAS',
	commonBodies: [
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
		atlas3i, // Add 3I/ATLAS interstellar comet
	],
	secondsPerTick: { min: 3600 * 5, max: 3600 * 25, initial: 3600 * 10 },
	defaultGuiSettings: {
		planetScale: 10,
		lookAt: 'atlas3i', // Focus on 3I/ATLAS by default
	},
	help: 'This scenario shows the Solar System with the interstellar comet 3I/ATLAS. The comet is on a hyperbolic trajectory, passing through our solar system once before departing forever. Perihelion (closest approach to the Sun) is on October 30, 2025.',
};