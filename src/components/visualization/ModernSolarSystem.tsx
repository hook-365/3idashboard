'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { additionalComets } from '@/lib/celestial-bodies';

// Scale factor for visualization (1 AU = this many pixels)
const SCALE_FACTOR = 100;

// Type definitions for API data
interface OrbitalPoint {
  x: number;
  y: number;
  z: number;
  date?: string;
}

interface Planet {
  name: string;
  x: number;
  y: number;
  z: number;
  orbital_path?: OrbitalPoint[];
}

interface OrbitalPlane {
  eccentricity: number;
}

interface ApiData {
  planets: Planet[];
  comet_position: OrbitalPoint & {
    distance_from_sun?: number;
    distance_from_earth?: number;
  };
  orbital_trail?: OrbitalPoint[];
  orbital_projection?: OrbitalPoint[];
  orbital_plane?: OrbitalPlane & {
    inclination?: number;
    ascending_node?: number;
    argument_of_periapsis?: number;
  };
  velocities?: {
    comet_velocity?: {
      magnitude?: number; // AU/day
    };
  };
  metadata?: {
    data_source?: string;
    epoch?: string;
    trail_period_days?: number;
  };
}

// Planet colors and sizes (compromise scale for visibility)
// Colors chosen for scientific accuracy and visual distinction
// Maintains correct ordering: Sun > Jupiter > Saturn > ... > Pluto
const BODY_CONFIG: Record<string, { color: string; size: number; emissive?: number }> = {
  Sun: { color: '#FDB813', size: 25, emissive: 0.8 },     // Central star (scaled for visibility)
  Mercury: { color: '#708090', size: 3 },                  // Slate gray - baked, cratered surface
  Venus: { color: '#E8D44D', size: 5.8 },                  // Sulfur yellow - thick acidic clouds
  Earth: { color: '#1E90FF', size: 6.0 },                  // Ocean blue - the blue marble
  Mars: { color: '#CD5C5C', size: 4 },                     // Rust orange - iron oxide surface
  Jupiter: { color: '#F5DEB3', size: 20 },                 // Cream - swirling storm bands
  Saturn: { color: '#EEE8AA', size: 17 },                  // Pale gold - elegant rings
  Uranus: { color: '#4FD8EB', size: 8 },                   // Cyan/ice blue - methane atmosphere
  Neptune: { color: '#4169E1', size: 7.5 },                // Deep cobalt - outer ice giant
  Pluto: { color: '#C19A6B', size: 2 },                    // Caramel brown - nitrogen ice plains
  '3I/ATLAS': { color: '#FFFFFF', size: 8, emissive: 0.8 } // Bright white glow - interstellar visitor
};

// Type for Three.js scene reference
interface SceneRef {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  controls: OrbitControls;
  gridHelper: THREE.Mesh; // Shader-based infinite grid
  bodies: Map<string, THREE.Mesh | THREE.Group>;
  animationId?: number;
}

type CenterTarget = 'sun' | 'earth' | 'atlas';

export default function ModernSolarSystem() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showHud, setShowHud] = useState(true);
  const [centerTarget, setCenterTarget] = useState<CenterTarget>('atlas');
  const [visibleComets, setVisibleComets] = useState<Set<string>>(new Set());
  const [cometTrails, setCometTrails] = useState<Map<string, THREE.Vector3[]>>(new Map());
  const [cacheWarning, setCacheWarning] = useState<{
    message: string;
    dataAge: string;
    cachedAt: string;
  } | null>(null);
  const sceneRef = useRef<SceneRef | null>(null);

  // HUD state
  const [hudData, setHudData] = useState<{
    velocity: number;
    velocityTrend: 'up' | 'down' | 'stable';
    activityLevel: string; // EXTREME, HIGH, MODERATE, LOW
    activityIndex: number;
    distanceFromSun: number;
    distanceFromEarth: number;
    eccentricity: number;
    inclination: number;
    dataSource: string;
    lastUpdate: string;
  } | null>(null);

  const currentDate = new Date();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    console.log('Fetching solar system data...');

    // Fetch both position data and activity data in parallel
    Promise.all([
      fetch('/api/solar-system-position?trail_days=90&refresh=true').then(res => res.json()),
      fetch('/api/simple-activity?days=183').then(res => res.json())
    ])
      .then(([positionResponse, activityResponse]) => {
        if (!positionResponse.success || !positionResponse.data) {
          throw new Error('Failed to fetch solar system data');
        }
        console.log('Solar system data received:', positionResponse.data);
        console.log('Activity data received:', activityResponse.data?.currentActivity);

        // Check if response has cache warning
        if (positionResponse.warning) {
          console.warn('⚠️  Using cached data:', positionResponse.warning);
          setCacheWarning(positionResponse.warning);
        } else {
          setCacheWarning(null);
        }

        initScene(positionResponse.data, activityResponse.data?.currentActivity);
      })
      .catch(err => {
        console.error('Error fetching solar system data:', err);
        setError('Failed to load solar system data');
        setLoading(false);
      });

    function initScene(apiData: ApiData, activityData?: { level: string; index: number }) {
      // Skip if already initialized
      if (sceneRef.current) {
        console.log('Scene already initialized, skipping...');
        return;
      }

      try {
        // Setup scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000510);

        const width = container.clientWidth || 800;
        const height = 600;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100000);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        // Setup CSS2D renderer for labels
        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(width, height);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0';
        labelRenderer.domElement.style.pointerEvents = 'none';
        container.appendChild(labelRenderer.domElement);

        // Enhanced lighting for realistic planet illumination
        // Hemisphere light for ambient fill (sky vs ground)
        const hemiLight = new THREE.HemisphereLight(0x888888, 0x222222, 0.8);
        scene.add(hemiLight);

        // Point light from the Sun - more intense for better planet illumination
        const sunLight = new THREE.PointLight(0xffffee, 5, 20000);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = false; // Shadows are expensive, keep them off
        scene.add(sunLight);

        // Stars background
        const starVertices = [];
        for (let i = 0; i < 5000; i++) {
          starVertices.push(
            Math.random() * 20000 - 10000,
            Math.random() * 20000 - 10000,
            Math.random() * 20000 - 10000
          );
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 2 })));

        // Create truly infinite grid using shader
        const createInfiniteGrid = () => {
          // Infinite grid shader
          const vertexShader = `
            varying vec3 worldPosition;
            void main() {
              vec4 worldPos = modelMatrix * vec4(position, 1.0);
              worldPosition = worldPos.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `;

          const fragmentShader = `
            varying vec3 worldPosition;
            uniform vec3 gridColor;
            uniform float gridSize;
            uniform float gridThickness;
            uniform float fadeDistance;
            uniform float maxOpacity;

            float getGrid(vec2 pos, float size) {
              vec2 grid = abs(fract(pos / size - 0.5) - 0.5) / fwidth(pos / size);
              float line = min(grid.x, grid.y);
              return 1.0 - min(line, 1.0);
            }

            void main() {
              // Get grid lines at two scales
              float grid1 = getGrid(worldPosition.xz, gridSize);
              float grid2 = getGrid(worldPosition.xz, gridSize * 10.0);

              // Combine grids
              float gridPattern = max(grid1 * 0.5, grid2);

              // Distance-based fade
              float dist = length(worldPosition.xz);
              float fade = 1.0 - smoothstep(fadeDistance * 0.5, fadeDistance, dist);

              // Final color with fade
              float alpha = gridPattern * fade * maxOpacity;

              if (alpha < 0.01) discard;

              gl_FragColor = vec4(gridColor, alpha);
            }
          `;

          const gridMaterial = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
              gridColor: { value: new THREE.Color(0x888888) },
              gridSize: { value: 10.0 },
              gridThickness: { value: 1.0 },
              fadeDistance: { value: 1000.0 },
              maxOpacity: { value: 0.6 }
            },
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            extensions: {
              derivatives: true
            }
          });

          // Large plane for the grid
          const gridGeometry = new THREE.PlaneGeometry(10000, 10000);
          gridGeometry.rotateX(-Math.PI / 2);

          const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
          gridMesh.position.y = 0;

          return gridMesh;
        };

        const gridHelper = createInfiniteGrid();
        scene.add(gridHelper);
        console.log('Added infinite shader-based grid');

        const bodies = new Map<string, THREE.Mesh | THREE.Group>();
        const labels = new Map<string, CSS2DObject>();

        // Helper function to create a label
        function createLabel(text: string, color: string): CSS2DObject {
          const div = document.createElement('div');
          div.textContent = text;
          div.style.color = color;
          div.style.fontSize = '12px';
          div.style.fontWeight = 'bold';
          div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
          div.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
          div.style.padding = '2px 6px';
          div.style.borderRadius = '3px';
          div.style.backgroundColor = 'rgba(0,0,0,0.7)';
          div.style.whiteSpace = 'nowrap';
          div.style.pointerEvents = 'none';
          return new CSS2DObject(div);
        }

        // Texture loader
        const textureLoader = new THREE.TextureLoader();

        // Create Sun with texture support
        const sunConfig = BODY_CONFIG['Sun'];
        const sunMaterial = new THREE.MeshBasicMaterial({
          color: sunConfig.color
        });

        // Load sun texture
        textureLoader.load(
          '/textures/planets/sun.jpg',
          (texture) => {
            sunMaterial.map = texture;
            sunMaterial.needsUpdate = true;
            console.log('✓ Loaded texture for Sun');
          },
          undefined,
          () => {
            console.log('Using color for Sun (texture not found)');
          }
        );

        const sunMesh = new THREE.Mesh(
          new THREE.SphereGeometry(sunConfig.size, 64, 64),
          sunMaterial
        );
        sunMesh.position.set(0, 0, 0);
        scene.add(sunMesh);
        bodies.set('Sun', sunMesh);

        const sunLabel = createLabel('Sol', sunConfig.color);
        sunLabel.userData.mesh = sunMesh;
        sunLabel.userData.offset = sunConfig.size + 3;
        scene.add(sunLabel);
        labels.set('Sun', sunLabel);

        console.log('Sun position:', sunMesh.position);

        // Create planets from API data
        apiData.planets.forEach((planet: Planet) => {
          const config = BODY_CONFIG[planet.name];
          if (!config) {
            console.warn(`No config for planet: ${planet.name}`);
            return;
          }

          // Try to load texture, fallback to color if not available
          const texturePath = `/textures/planets/${planet.name.toLowerCase()}.jpg`;

          const material = new THREE.MeshStandardMaterial({
            color: 0xffffff, // White base so texture shows true colors
            metalness: 0.0,
            roughness: 1.0,
            emissive: parseInt(config.color.replace('#', '0x')),
            emissiveIntensity: 0.3 // Add subtle glow to make planets more visible
          });

          // Attempt to load texture asynchronously
          console.log(`Attempting to load texture: ${texturePath}`);
          textureLoader.load(
            texturePath,
            (texture) => {
              material.map = texture;
              material.needsUpdate = true;
              console.log(`✓ Loaded texture for ${planet.name}`, texture);
            },
            undefined,
            (_error) => {
              console.error(`✗ Failed to load texture for ${planet.name}:`, _error);
              console.log(`Using color fallback for ${planet.name}`);
              // If texture fails, use the planet's color
              material.color.setHex(parseInt(config.color.replace('#', '0x')));
              material.emissive.setHex(parseInt(config.color.replace('#', '0x')));
              material.emissiveIntensity = 0.4; // Increased for better visibility
            }
          );

          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(config.size, 64, 64),
            material
          );

          // Convert AU to visualization units
          // JPL uses ecliptic coordinates: x=forward, y=left, z=up
          // Three.js: x=right, y=up, z=forward
          const x = planet.x * SCALE_FACTOR;
          const y = planet.z * SCALE_FACTOR;
          const z = -planet.y * SCALE_FACTOR;

          mesh.position.set(x, y, z);
          scene.add(mesh);
          bodies.set(planet.name, mesh);

          // Add Saturn's rings
          if (planet.name === 'Saturn') {
            const ringInnerRadius = config.size * 1.2;
            const ringOuterRadius = config.size * 2.0;
            const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 64);

            const ringMaterial = new THREE.MeshBasicMaterial({
              color: 0xD4A373,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.8
            });

            // Load ring texture
            textureLoader.load(
              '/textures/planets/saturn_ring.png',
              (texture) => {
                ringMaterial.map = texture;
                ringMaterial.transparent = true;
                ringMaterial.needsUpdate = true;
                console.log('✓ Loaded Saturn ring texture');
              },
              undefined,
              () => {
                console.log('Using solid color for Saturn rings (texture not found)');
              }
            );

            const rings = new THREE.Mesh(ringGeometry, ringMaterial);

            // Tilt rings to match Saturn's axial tilt (26.7 degrees)
            rings.rotation.x = Math.PI / 2; // Rotate to horizontal
            rings.rotation.y = 26.7 * Math.PI / 180; // Saturn's tilt

            mesh.add(rings); // Attach to Saturn so it moves with the planet
            console.log('Added rings to Saturn');
          }

          // Add CSS2D label that follows the planet
          const label = createLabel(planet.name, config.color);
          label.userData.mesh = mesh;
          label.userData.offset = config.size + 3;
          scene.add(label);
          labels.set(planet.name, label);

          // Create simple circular orbit path (approximate)
          // Calculate radius from actual 3D position in Three.js space (ignoring y for ecliptic plane projection)
          const orbitRadius = Math.sqrt(x * x + z * z);
          const actualDistance = Math.sqrt(x * x + y * y + z * z);

          console.log(`${planet.name} position: (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}), orbit radius: ${orbitRadius.toFixed(1)}, 3D distance: ${actualDistance.toFixed(1)}`);

          // Draw accurate 3D orbital path from API data
          console.log(`${planet.name} has orbital_path?`, !!planet.orbital_path, planet.orbital_path?.length);
          if (planet.orbital_path && planet.orbital_path.length > 0) {
            const orbitPoints = planet.orbital_path.map((point: OrbitalPoint) => {
              // Convert from heliocentric ecliptic to Three.js coordinates
              const px = point.x * SCALE_FACTOR;
              const py = point.z * SCALE_FACTOR;
              const pz = -point.y * SCALE_FACTOR;
              return new THREE.Vector3(px, py, pz);
            });

            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
            const orbitLine = new THREE.LineLoop(
              orbitGeometry,
              new THREE.LineBasicMaterial({
                color: config.color,
                opacity: 0.6,
                transparent: true
              })
            );
            scene.add(orbitLine);
            console.log(`✓ Added orbital path for ${planet.name} with ${orbitPoints.length} points, color: ${config.color}`);
          } else {
            console.warn(`✗ No orbital path for ${planet.name}`);
          }
        });

        // Create 3I/ATLAS comet with nucleus and coma
        const cometConfig = BODY_CONFIG['3I/ATLAS'];

        // Create comet group
        const cometGroup = new THREE.Group();

        // Create smaller bright nucleus at center
        const nucleusSize = 1.5; // Reduced from 2
        const nucleusMesh = new THREE.Mesh(
          new THREE.SphereGeometry(nucleusSize, 16, 16),
          new THREE.MeshPhongMaterial({
            color: cometConfig.color, // Use white from config
            emissive: cometConfig.color, // Bright white glow
            emissiveIntensity: 1.0,
            shininess: 100
          })
        );
        nucleusMesh.position.set(0, 0, 0); // Centered in group
        cometGroup.add(nucleusMesh);

        // Create glowing coma around nucleus (same center)
        const comaSize = 4; // Reduced from 5
        const comaMesh = new THREE.Mesh(
          new THREE.SphereGeometry(comaSize, 16, 16),
          new THREE.MeshBasicMaterial({
            color: cometConfig.color, // Use white from config
            transparent: true,
            opacity: 0.2, // Slightly more transparent
            depthWrite: false
          })
        );
        comaMesh.position.set(0, 0, 0); // Centered in group
        cometGroup.add(comaMesh);

        const cometX = apiData.comet_position.x * SCALE_FACTOR;
        const cometY = apiData.comet_position.z * SCALE_FACTOR;
        const cometZ = -apiData.comet_position.y * SCALE_FACTOR;
        cometGroup.position.set(cometX, cometY, cometZ);
        scene.add(cometGroup);
        bodies.set('3I/ATLAS', cometGroup);

        // Add simple CSS2D label that follows the comet
        const cometLabel = createLabel('3I/ATLAS', cometConfig.color);
        cometLabel.userData.mesh = cometGroup;
        cometLabel.userData.offset = comaSize + 3;
        scene.add(cometLabel);
        labels.set('3I/ATLAS', cometLabel);

        console.log(`3I/ATLAS API position: (${apiData.comet_position.x.toFixed(3)}, ${apiData.comet_position.y.toFixed(3)}, ${apiData.comet_position.z.toFixed(3)})`);
        console.log(`3I/ATLAS Three.js position: (${cometX.toFixed(1)}, ${cometY.toFixed(1)}, ${cometZ.toFixed(1)})`);

        // Add velocity vector arrow to show motion direction
        // and calculate HUD data
        if (apiData.orbital_trail && apiData.orbital_trail.length >= 5) {
          const recentPoints = apiData.orbital_trail.slice(-5);
          const velocityVec = new THREE.Vector3(
            (apiData.comet_position.x - recentPoints[0].x) * SCALE_FACTOR,
            (apiData.comet_position.z - recentPoints[0].z) * SCALE_FACTOR,
            -(apiData.comet_position.y - recentPoints[0].y) * SCALE_FACTOR
          );

          // Shorter arrow (10 units)
          const arrowLength = 10;
          const arrowDir = velocityVec.normalize();

          // Create arrow
          const arrowHelper = new THREE.ArrowHelper(
            arrowDir,
            new THREE.Vector3(0, 0, 0), // Position relative to comet group
            arrowLength,
            0xFFDD44, // Bright yellow
            arrowLength * 0.25, // Head length
            arrowLength * 0.15  // Head width
          );
          arrowHelper.line.material.linewidth = 2;
          (arrowHelper.line.material as THREE.LineBasicMaterial).opacity = 0.9;
          (arrowHelper.line.material as THREE.LineBasicMaterial).transparent = true;

          cometGroup.add(arrowHelper);
          console.log(`✓ Added velocity vector arrow`);

          // Calculate velocity and acceleration for HUD
          // Convert from AU/day to km/s: 1 AU/day = 1731.46 km/s
          const AU_PER_DAY_TO_KM_PER_S = 1731.46;

          // Use API velocity if available, otherwise calculate from trail
          let velocityKmPerS = 0;
          if (apiData.velocities?.comet_velocity?.magnitude) {
            velocityKmPerS = apiData.velocities.comet_velocity.magnitude * AU_PER_DAY_TO_KM_PER_S;
          } else {
            // Calculate from trail points (5 days apart)
            const distanceAU = Math.sqrt(
              Math.pow(apiData.comet_position.x - recentPoints[0].x, 2) +
              Math.pow(apiData.comet_position.y - recentPoints[0].y, 2) +
              Math.pow(apiData.comet_position.z - recentPoints[0].z, 2)
            );
            const timeDays = 5; // 5 recent points
            velocityKmPerS = (distanceAU / timeDays) * AU_PER_DAY_TO_KM_PER_S;
          }

          // Calculate velocity trend (accelerating/decelerating) from orbital trail
          // Same approach as analytics page: compare velocities at different times
          let velocityTrend: 'up' | 'down' | 'stable' = 'stable';
          if (apiData.orbital_trail.length >= 6) {
            // Calculate velocity from two different time periods
            const oldPoints = apiData.orbital_trail.slice(-6, -3); // 6-3 points ago
            const recentPointsForTrend = apiData.orbital_trail.slice(-3); // Last 3 points

            // Velocity from older period (AU/day)
            const oldDist = Math.sqrt(
              Math.pow(oldPoints[oldPoints.length-1].x - oldPoints[0].x, 2) +
              Math.pow(oldPoints[oldPoints.length-1].y - oldPoints[0].y, 2) +
              Math.pow(oldPoints[oldPoints.length-1].z - oldPoints[0].z, 2)
            );
            const oldVel = oldDist / (oldPoints.length - 1); // AU/day average

            // Velocity from recent period (AU/day)
            const recentDist = Math.sqrt(
              Math.pow(recentPointsForTrend[recentPointsForTrend.length-1].x - recentPointsForTrend[0].x, 2) +
              Math.pow(recentPointsForTrend[recentPointsForTrend.length-1].y - recentPointsForTrend[0].y, 2) +
              Math.pow(recentPointsForTrend[recentPointsForTrend.length-1].z - recentPointsForTrend[0].z, 2)
            );
            const recentVel = recentDist / (recentPointsForTrend.length - 1); // AU/day average

            // Compare velocities: if recent > old, we're accelerating
            const velDiff = recentVel - oldVel;
            if (Math.abs(velDiff) > 0.0001) { // Threshold in AU/day
              velocityTrend = velDiff > 0 ? 'up' : 'down';
            }
          }

          // Update HUD data with activity level from API
          setHudData({
            velocity: velocityKmPerS,
            velocityTrend,
            activityLevel: activityData?.level || 'UNKNOWN',
            activityIndex: activityData?.index || 0,
            distanceFromSun: apiData.comet_position.distance_from_sun || 0,
            distanceFromEarth: apiData.comet_position.distance_from_earth || 0,
            eccentricity: apiData.orbital_plane?.eccentricity || 0,
            inclination: apiData.orbital_plane?.inclination || 0,
            dataSource: apiData.metadata?.data_source || 'Unknown',
            lastUpdate: apiData.metadata?.epoch || new Date().toISOString()
          });
        }

        // Calculate and log distances to planets
        const earthBody = bodies.get('Earth');
        const marsBody = bodies.get('Mars');
        if (earthBody && marsBody) {
          const distToEarth = cometGroup.position.distanceTo(earthBody.position);
          const distToMars = cometGroup.position.distanceTo(marsBody.position);
          console.log(`Distance from comet to Earth: ${(distToEarth / SCALE_FACTOR).toFixed(2)} AU (${distToEarth.toFixed(1)} units)`);
          console.log(`Distance from comet to Mars: ${(distToMars / SCALE_FACTOR).toFixed(2)} AU (${distToMars.toFixed(1)} units)`);
        }

        // Create 3I/ATLAS hyperbolic orbit path from orbital elements
        if (apiData.orbital_plane && apiData.orbital_plane.eccentricity > 1) {
          try {
            // For hyperbolic orbits (e > 1), we can't show a full orbit
            // Instead, show the trajectory from the API trail data as the "orbit"
            console.log(`3I/ATLAS has hyperbolic orbit (e=${apiData.orbital_plane.eccentricity.toFixed(2)})`);
          } catch (err) {
            console.warn('Failed to create comet orbit path:', err);
          }
        }

        // Create 3I/ATLAS trail from API data with gradient fade
        if (apiData.orbital_trail && apiData.orbital_trail.length > 1) {
          const trailPoints: THREE.Vector3[] = [];
          apiData.orbital_trail.forEach((point: OrbitalPoint) => {
            const x = point.x * SCALE_FACTOR;
            const y = point.z * SCALE_FACTOR;
            const z = -point.y * SCALE_FACTOR;
            trailPoints.push(new THREE.Vector3(x, y, z));
          });

          // Add current position as the final point to connect with projection
          const currentPos = apiData.comet_position;
          trailPoints.push(new THREE.Vector3(
            currentPos.x * SCALE_FACTOR,
            currentPos.z * SCALE_FACTOR,
            -currentPos.y * SCALE_FACTOR
          ));

          // Create positions and colors for gradient fade
          const trailPositions = new Float32Array(trailPoints.length * 3);
          const trailColors = new Float32Array(trailPoints.length * 3);

          trailPoints.forEach((p, i) => {
            // Position
            trailPositions[i * 3] = p.x;
            trailPositions[i * 3 + 1] = p.y;
            trailPositions[i * 3 + 2] = p.z;

            // Color fade: dim at start (old) to bright at end (current)
            // Use exponential fade for more dramatic effect
            const t = i / (trailPoints.length - 1); // 0 to 1
            const intensity = Math.pow(t, 0.5); // Square root for smoother fade

            // Red to bright red gradient
            trailColors[i * 3] = 1.0; // R
            trailColors[i * 3 + 1] = intensity * 0.2; // G (slight orange tint when bright)
            trailColors[i * 3 + 2] = 0.0; // B
          });

          const trailGeometry = new THREE.BufferGeometry();
          trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
          trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

          const trailLine = new THREE.Line(
            trailGeometry,
            new THREE.LineBasicMaterial({
              vertexColors: true,
              opacity: 0.8,
              transparent: true,
              linewidth: 2
            })
          );
          scene.add(trailLine);
          console.log(`Created 3I/ATLAS trail with ${trailPoints.length} points and gradient fade (old→current)`);
          console.log(`  Trail start: (${trailPoints[0].x.toFixed(1)}, ${trailPoints[0].y.toFixed(1)}, ${trailPoints[0].z.toFixed(1)})`);
          console.log(`  Trail end: (${trailPoints[trailPoints.length-1].x.toFixed(1)}, ${trailPoints[trailPoints.length-1].y.toFixed(1)}, ${trailPoints[trailPoints.length-1].z.toFixed(1)})`);
        }

        // Create projected path using Kepler mechanics from API
        console.log('Checking for orbital_projection:', !!apiData.orbital_projection, 'length:', apiData.orbital_projection?.length);
        if (apiData.orbital_projection && apiData.orbital_projection.length > 0) {
          const futurePoints: THREE.Vector3[] = [];
          console.log('Starting projection rendering with', apiData.orbital_projection.length, 'points');

          // Convert projection points to Three.js coordinates
          for (const point of apiData.orbital_projection) {
            // Convert from heliocentric ecliptic to Three.js coordinates
            const px = point.x * SCALE_FACTOR;
            const py = point.z * SCALE_FACTOR;  // Z becomes Y (up)
            const pz = -point.y * SCALE_FACTOR; // Y becomes -Z
            futurePoints.push(new THREE.Vector3(px, py, pz));
          }

          const futurePositions = new Float32Array(futurePoints.length * 3);
          futurePoints.forEach((p, i) => {
            futurePositions[i * 3] = p.x;
            futurePositions[i * 3 + 1] = p.y;
            futurePositions[i * 3 + 2] = p.z;
          });

          const futureGeometry = new THREE.BufferGeometry();
          futureGeometry.setAttribute('position', new THREE.BufferAttribute(futurePositions, 3));

          // Use dashed line for future projection
          const futureLine = new THREE.Line(
            futureGeometry,
            new THREE.LineDashedMaterial({
              color: '#FF6600',  // Orange to distinguish from trail
              opacity: 0.8,
              transparent: true,
              dashSize: 8,
              gapSize: 4
            })
          );
          futureLine.computeLineDistances(); // Required for dashed lines
          scene.add(futureLine);
          console.log(`Created 3I/ATLAS projected path with ${futurePoints.length} points`);
          console.log(`  Projection start: (${futurePoints[0].x.toFixed(1)}, ${futurePoints[0].y.toFixed(1)}, ${futurePoints[0].z.toFixed(1)})`);
          console.log(`  Projection end: (${futurePoints[futurePoints.length-1].x.toFixed(1)}, ${futurePoints[futurePoints.length-1].y.toFixed(1)}, ${futurePoints[futurePoints.length-1].z.toFixed(1)})`);

          // Add perihelion marker - find the point closest to perihelion date
          const perihelionDate = new Date('2025-10-30T00:00:00Z');
          const perihelionPoint = apiData.orbital_projection.reduce((closest, point) => {
            const pointDate = new Date(point.date || '');
            const closestDate = new Date(closest.date || '');
            return Math.abs(pointDate.getTime() - perihelionDate.getTime()) <
                   Math.abs(closestDate.getTime() - perihelionDate.getTime()) ? point : closest;
          });

          if (perihelionPoint) {
            const perihelionX = perihelionPoint.x * SCALE_FACTOR;
            const perihelionY = perihelionPoint.z * SCALE_FACTOR;
            const perihelionZ = -perihelionPoint.y * SCALE_FACTOR;

            // Create reticle marker for perihelion (crosshair)
            const reticleLength = 8; // 1/6 of original size, all arms equal length

            const reticleMaterial = new THREE.LineBasicMaterial({
              color: '#FFFF00',
              linewidth: 1,
              opacity: 0.9,
              transparent: true
            });

            // Vertical line
            const verticalGeometry = new THREE.BufferGeometry();
            const verticalVertices = new Float32Array([
              perihelionX, perihelionY - reticleLength, perihelionZ,  // Bottom
              perihelionX, perihelionY + reticleLength, perihelionZ   // Top
            ]);
            verticalGeometry.setAttribute('position', new THREE.BufferAttribute(verticalVertices, 3));
            const verticalLine = new THREE.Line(verticalGeometry, reticleMaterial);
            scene.add(verticalLine);

            // Horizontal line (X-axis)
            const horizontalXGeometry = new THREE.BufferGeometry();
            const horizontalXVertices = new Float32Array([
              perihelionX - reticleLength, perihelionY, perihelionZ,  // Left
              perihelionX + reticleLength, perihelionY, perihelionZ   // Right
            ]);
            horizontalXGeometry.setAttribute('position', new THREE.BufferAttribute(horizontalXVertices, 3));
            const horizontalXLine = new THREE.Line(horizontalXGeometry, reticleMaterial);
            scene.add(horizontalXLine);

            // Horizontal line (Z-axis)
            const horizontalZGeometry = new THREE.BufferGeometry();
            const horizontalZVertices = new Float32Array([
              perihelionX, perihelionY, perihelionZ - reticleLength,  // Back
              perihelionX, perihelionY, perihelionZ + reticleLength   // Front
            ]);
            horizontalZGeometry.setAttribute('position', new THREE.BufferAttribute(horizontalZVertices, 3));
            const horizontalZLine = new THREE.Line(horizontalZGeometry, reticleMaterial);
            scene.add(horizontalZLine);

            // Create a dummy object at perihelion center for label positioning
            const perihelionMarker = new THREE.Object3D();
            perihelionMarker.position.set(perihelionX, perihelionY, perihelionZ);
            scene.add(perihelionMarker);

            // Add CSS2D label that follows perihelion marker
            const perihelionLabel = createLabel('Perihelion', '#FFFF00');
            perihelionLabel.userData.mesh = perihelionMarker;
            perihelionLabel.userData.offset = reticleLength + 3;
            scene.add(perihelionLabel);
            labels.set('Perihelion', perihelionLabel);

            const now = new Date();
            const perihelionDate = new Date('2025-10-30T00:00:00Z');
            const daysUntilPerihelion = Math.round((perihelionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            console.log(`Added perihelion marker at ${daysUntilPerihelion} days from now`);
            console.log(`Perihelion position: (${perihelionX.toFixed(1)}, ${perihelionY.toFixed(1)}, ${perihelionZ.toFixed(1)})`);
          }
        }

        // Helper function to get center position based on target
        const getCenterPosition = (target: CenterTarget): THREE.Vector3 => {
          switch (target) {
            case 'sun':
              return new THREE.Vector3(0, 0, 0);
            case 'earth':
              const earthBody = bodies.get('Earth');
              return earthBody ? earthBody.position.clone() : new THREE.Vector3(0, 0, 0);
            case 'atlas':
              return new THREE.Vector3(cometX, cometY, cometZ);
            default:
              return new THREE.Vector3(cometX, cometY, cometZ);
          }
        };

        // Initial camera setup - specific position for optimal comet view
        // Target the comet position (centerTarget default is 'atlas')
        const viewCenter = getCenterPosition(centerTarget);

        // Set specific camera position for ideal viewing angle
        camera.position.set(-162.4, 58.3, 170.2);

        console.log(`Camera positioned: position=(${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}), target=(${viewCenter.x.toFixed(1)}, ${viewCenter.y.toFixed(1)}, ${viewCenter.z.toFixed(1)})`);

        // Setup OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.copy(viewCenter);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 20;
        controls.maxDistance = 3000;
        controls.update();

        // Point camera at center after controls are set up
        camera.lookAt(viewCenter);

        // Log camera position when user moves it (throttled to avoid spam)
        let logTimeout: NodeJS.Timeout;
        controls.addEventListener('change', () => {
          clearTimeout(logTimeout);
          logTimeout = setTimeout(() => {
            const pos = camera.position;
            const target = controls.target;
            const distance = pos.distanceTo(target);
            console.log(`Camera: position=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}), target=(${target.x.toFixed(1)}, ${target.y.toFixed(1)}, ${target.z.toFixed(1)}), distance=${distance.toFixed(1)}`);
          }, 500); // Log after 500ms of no movement
        });

        sceneRef.current = { scene, camera, renderer, labelRenderer, controls, gridHelper, bodies };

        // Animation loop
        const animate = () => {
          controls.update();

          // Update label positions to follow their meshes
          labels.forEach((label) => {
            if (label.userData.mesh) {
              const mesh = label.userData.mesh as THREE.Object3D;
              label.position.copy(mesh.position);
              label.position.y += label.userData.offset;
            }
          });

          renderer.render(scene, camera);
          labelRenderer.render(scene, camera);
          sceneRef.current!.animationId = requestAnimationFrame(animate);
        };
        animate();

        setLoading(false);
        console.log('Three.js initialization complete');
      } catch (err) {
        console.error('Three.js initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize 3D visualization');
        setLoading(false);
      }
    }

    // Cleanup function
    return () => {
      if (sceneRef.current) {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        if (sceneRef.current.controls) {
          sceneRef.current.controls.dispose();
        }
        if (container) {
          if (sceneRef.current.renderer && sceneRef.current.renderer.domElement.parentNode === container) {
            container.removeChild(sceneRef.current.renderer.domElement);
            sceneRef.current.renderer.dispose();
          }
          if (sceneRef.current.labelRenderer && sceneRef.current.labelRenderer.domElement.parentNode === container) {
            container.removeChild(sceneRef.current.labelRenderer.domElement);
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle grid visibility toggle
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.gridHelper.visible = showGrid;
    }
  }, [showGrid]);

  // Fetch and render additional comet trails
  useEffect(() => {
    console.log(`[Additional Comets] Visible comets changed:`, Array.from(visibleComets));

    if (visibleComets.size === 0) {
      // Remove all comet trails when no comets are visible
      console.log('[Additional Comets] No comets visible, clearing trails');
      setCometTrails(new Map());
      return;
    }

    const enabledComets = additionalComets.filter(c => visibleComets.has(c.id));
    const designations = enabledComets.map(c => c.designation).join(',');

    console.log(`[Additional Comets] Fetching trails for:`, enabledComets.map(c => `${c.name} (${c.designation})`).join(', '));

    fetch(`/api/additional-comets?designations=${designations}&trail_days=90`)
      .then(res => res.json())
      .then(response => {
        console.log('[Additional Comets] API response:', response);

        if (!response.success) {
          console.warn('[Additional Comets] API returned success=false:', response.error);
          return;
        }

        if (!response.data || response.data.length === 0) {
          console.warn('[Additional Comets] No trail data returned. This usually means:');
          console.warn('  - JPL Horizons is temporarily unavailable (503 errors)');
          console.warn('  - The comet designations are not in JPL database');
          console.warn('  - The requested date range has no data');
          return;
        }

        const newTrails = new Map();
        response.data.forEach((comet: { designation: string; trail?: { x: number; y: number; z: number }[] }) => {
          const cometInfo = additionalComets.find(c => c.designation === comet.designation);
          if (cometInfo && comet.trail && comet.trail.length > 0) {
            newTrails.set(cometInfo.id, {
              ...comet,
              color: cometInfo.color
            });
            console.log(`  ✓ ${cometInfo.name}: ${comet.trail.length} points`);
          }
        });

        setCometTrails(newTrails);
        console.log(`[Additional Comets] Loaded ${newTrails.size} comet trails (requested ${enabledComets.length})`);
      })
      .catch(err => {
        console.error('[Additional Comets] Error fetching:', err);
      });
  }, [visibleComets]);

  // Render additional comet trails in the scene
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current.scene;

    // Remove old comet trail objects
    const oldTrails = scene.children.filter(obj => obj.userData.isAdditionalCometTrail);
    oldTrails.forEach(obj => scene.remove(obj));

    // Add new comet trails
    cometTrails.forEach((cometData, cometId) => {
      if (!cometData.trail || cometData.trail.length === 0) return;

      const points = cometData.trail.map((point: { x: number; y: number; z: number }) =>
        new THREE.Vector3(
          point.x * SCALE_FACTOR,
          point.z * SCALE_FACTOR,
          -point.y * SCALE_FACTOR
        )
      );

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: cometData.color || '#FFFFFF',
        linewidth: 1,
        opacity: 0.6,
        transparent: true
      });

      const trail = new THREE.Line(geometry, material);
      trail.userData.isAdditionalCometTrail = true;
      trail.userData.cometId = cometId;
      scene.add(trail);
    });
  }, [cometTrails]);

  // Handle center target change
  useEffect(() => {
    if (!sceneRef.current) return;

    const { controls, bodies, gridHelper } = sceneRef.current;
    let targetPosition: THREE.Vector3;

    switch (centerTarget) {
      case 'sun':
        targetPosition = new THREE.Vector3(0, 0, 0);
        break;
      case 'earth':
        const earthBody = bodies.get('Earth');
        targetPosition = earthBody ? earthBody.position.clone() : new THREE.Vector3(0, 0, 0);
        break;
      case 'atlas':
        const atlasBody = bodies.get('3I/ATLAS');
        targetPosition = atlasBody ? atlasBody.position.clone() : new THREE.Vector3(0, 0, 0);
        break;
      default:
        targetPosition = new THREE.Vector3(0, 0, 0);
    }

    // Update grid position to center on target
    gridHelper.position.copy(targetPosition);

    // Update controls target
    controls.target.copy(targetPosition);
    controls.update();

    console.log(`Center target changed to ${centerTarget}, position: (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}, ${targetPosition.z.toFixed(1)})`);
  }, [centerTarget]);

  return (
    <div className="max-w-5xl mx-auto bg-gray-800 rounded-lg overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gray-900 p-3 border-b border-gray-700">
        <div className="flex flex-col gap-3 text-sm" role="banner">
          {/* Title and Date */}
          <div className="flex items-center justify-center gap-3">
            <h3 className="text-base font-semibold text-white">Current Solar System Position</h3>
            <span className="text-gray-400 text-xs">
              {currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Grid Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-gray-300 text-xs">Grid</span>
            </label>

            {/* HUD Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showHud}
                onChange={(e) => setShowHud(e.target.checked)}
                className="w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-gray-300 text-xs">HUD</span>
            </label>

            {/* Center Target */}
            <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
              <span className="text-gray-400 text-xs">Center:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="centerTarget"
                  value="sun"
                  checked={centerTarget === 'sun'}
                  onChange={() => setCenterTarget('sun')}
                  className="cursor-pointer"
                />
                <span className="text-gray-300 text-xs">Sol</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="centerTarget"
                  value="earth"
                  checked={centerTarget === 'earth'}
                  onChange={() => setCenterTarget('earth')}
                  className="cursor-pointer"
                />
                <span className="text-gray-300 text-xs">Earth</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="centerTarget"
                  value="atlas"
                  checked={centerTarget === 'atlas'}
                  onChange={() => setCenterTarget('atlas')}
                  className="cursor-pointer"
                />
                <span className="text-gray-300 text-xs">3I/ATLAS</span>
              </label>
            </div>

            {/* Additional Comets Toggle - DISABLED: JPL Horizons lacks data for these comets */}
            {/* Backend infrastructure remains in place for future use:
                - /api/additional-comets endpoint
                - fetchCometOrbitalTrail() function
                - additionalComets registry in celestial-bodies.ts
                Re-enable by uncommenting this section when suitable comets are found
            */}
            {false && (
              <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
                <span className="text-gray-400 text-xs">Other Comets:</span>
                {additionalComets.map((comet) => (
                  <label key={comet.id} className="flex items-center gap-1 cursor-pointer" title={comet.description}>
                    <input
                      type="checkbox"
                      checked={visibleComets.has(comet.id)}
                      onChange={(e) => {
                        const newVisible = new Set(visibleComets);
                        if (e.target.checked) {
                          newVisible.add(comet.id);
                        } else {
                          newVisible.delete(comet.id);
                        }
                        setVisibleComets(newVisible);
                      }}
                      className="w-3 h-3 cursor-pointer"
                    />
                    <span className="text-gray-300 text-xs" style={{ color: comet.color }}>{comet.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subtitle */}
        <div className="text-xs text-gray-500 mt-1.5">
          3I/ATLAS past trail (solid) and future path (dashed) • Drag to rotate • Scroll to zoom
        </div>
      </div>

      {/* Cache Warning Banner */}
      {cacheWarning && (
        <div className="bg-yellow-900/30 border-y border-yellow-700/50 px-4 py-2">
          <div className="flex items-start gap-2 text-sm">
            <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
            </svg>
            <div className="flex-1">
              <div className="text-yellow-200 font-medium">
                {cacheWarning.message}
              </div>
              <div className="text-yellow-300/80 text-xs mt-0.5">
                Data is {cacheWarning.dataAge} (from {new Date(cacheWarning.cachedAt).toLocaleString()}) •
                Live API temporarily unavailable
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="bg-gray-900 relative"
        style={{ height: '500px' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-lg mb-4">Loading 3D Solar System...</div>
              <div className="text-gray-500 text-sm">Fetching real-time position data</div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-lg mb-4">Failed to Load</div>
              <div className="text-gray-400 text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* HUD - Heads-Up Display */}
        {hudData && !loading && !error && showHud && (
          <div className="absolute top-3 right-3 bg-black/85 backdrop-blur-sm border border-gray-700 rounded p-2 text-xs font-mono pointer-events-none z-50">
            <div className="text-white font-bold text-sm mb-1.5 border-b border-gray-700 pb-1">
              3I/ATLAS
            </div>

            {/* Velocity & Activity */}
            <div className="space-y-1 mb-1.5 pb-1.5 border-b border-gray-700">
              <div className="flex justify-between items-center gap-3">
                <span className="text-gray-400">Velocity:</span>
                <span className="text-cyan-300 font-semibold">
                  {hudData.velocity.toFixed(1)} km/s{' '}
                  {hudData.velocityTrend === 'up' ? '↑' : hudData.velocityTrend === 'down' ? '↓' : '→'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-gray-400">Activity:</span>
                <span className={`font-semibold ${
                  hudData.activityLevel === 'EXTREME' ? 'text-red-400' :
                  hudData.activityLevel === 'HIGH' ? 'text-orange-400' :
                  hudData.activityLevel === 'MODERATE' ? 'text-yellow-400' :
                  hudData.activityLevel === 'LOW' ? 'text-green-400' :
                  'text-gray-400'
                }`}>
                  {hudData.activityLevel === 'EXTREME' ? '🔥 Extreme' :
                   hudData.activityLevel === 'HIGH' ? '⚡ High' :
                   hudData.activityLevel === 'MODERATE' ? '🟡 Moderate' :
                   hudData.activityLevel === 'LOW' ? '🟢 Low' :
                   '⚪ Unknown'}
                </span>
              </div>
            </div>

            {/* Orbital Parameters */}
            <div className="space-y-1 mb-1.5 pb-1.5 border-b border-gray-700">
              <div className="flex justify-between items-center gap-3">
                <span className="text-gray-400">Dist (Sun):</span>
                <span className="text-blue-300">{hudData.distanceFromSun.toFixed(2)} AU</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-gray-400">Dist (Earth):</span>
                <span className="text-green-300">{hudData.distanceFromEarth.toFixed(2)} AU</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-gray-400">Eccent:</span>
                <span className="text-purple-300">{hudData.eccentricity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-gray-400">Inclin:</span>
                <span className="text-purple-300">{hudData.inclination.toFixed(1)}°</span>
              </div>
            </div>

            {/* Mission Parameters */}
            <div className="space-y-1 mb-1.5 pb-1.5 border-b border-gray-700">
              <div className="flex justify-between items-center gap-3">
                <span className="text-gray-400">Perihelion:</span>
                <span className="text-yellow-300">Oct 30, 2025</span>
              </div>
            </div>

            {/* Data Source & Timestamp */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between items-center gap-2">
                <span className="text-gray-500">Source:</span>
                <span className="text-gray-400 truncate max-w-[100px]">{hudData.dataSource}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-gray-500">Update:</span>
                <span className="text-gray-400">
                  {new Date(hudData.lastUpdate).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="text-gray-500 italic mt-1 pt-1 border-t border-gray-800">
                Sizes not to scale
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}