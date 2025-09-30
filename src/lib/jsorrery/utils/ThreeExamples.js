import THREE from 'three';

window.THREE = THREE;

import 'three.Projector';
import 'three.OrbitControls';

export const Projector = window.THREE.Projector;
export const OrbitControls = window.THREE.OrbitControls;
import Stats from 'three.Stats';
export { Stats };