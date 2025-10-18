'use client';

import { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { additionalComets } from '@/lib/celestial-bodies';
import ThreeDInteractiveOverlay from '@/components/common/ThreeDInteractiveOverlay';
import { calculateAllPlanetPositions } from '@/lib/planet-positions';

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

// Dual trajectory types
interface TrajectoryPoint {
  date: string;
  x: number;
  y: number;
  z: number;
  distance_from_sun: number;
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
  '3I/ATLAS': { color: '#FFFFFF', size: 8, emissive: 0.8 } // White/black (theme-dependent) - interstellar visitor
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
  orbitalAnimationId?: number; // Separate animation frame for orbital movement
}

type CenterTarget = 'sun' | 'earth' | 'atlas';
type CenterMode = 'default' | 'sun';

// Props interface for component
interface ModernSolarSystemProps {
  centerMode?: CenterMode;
  autoPlay?: boolean;
  showControls?: boolean;
  initialDate?: Date;
  followComet?: boolean; // Camera tracks comet during animation
}

// Helper function to get theme-aware colors
function getThemeAwareColor(type: 'atlas' | 'label' | 'hud-text'): string {
  const theme = document.documentElement.getAttribute('data-theme');

  if (type === 'atlas') {
    // ATLAS comet color: black in light mode, white in dark mode
    return theme === 'light' ? '#000000' : '#FFFFFF';
  } else if (type === 'label') {
    // Label text color: dark in light mode, light in dark mode
    return theme === 'light' ? '#1f2937' : '#ffffff';
  } else if (type === 'hud-text') {
    // HUD secondary text color: dark gray in light mode, light gray in dark mode
    return theme === 'light' ? '#4b5563' : '#9ca3af';
  }

  return '#ffffff'; // Default fallback
}

// Helper function to interpolate position from orbital trail data
function interpolatePosition(
  date: Date,
  orbitalPath: OrbitalPoint[] | undefined
): THREE.Vector3 | null {
  if (!orbitalPath || orbitalPath.length < 2) return null;

  const targetTime = date.getTime();

  // Find the two points to interpolate between
  let beforeIndex = -1;
  let afterIndex = -1;

  for (let i = 0; i < orbitalPath.length - 1; i++) {
    const currentDate = new Date(orbitalPath[i].date || '').getTime();
    const nextDate = new Date(orbitalPath[i + 1].date || '').getTime();

    if (targetTime >= currentDate && targetTime <= nextDate) {
      beforeIndex = i;
      afterIndex = i + 1;
      break;
    }
  }

  // If date is before start or after end, return edge positions
  if (beforeIndex === -1) {
    if (targetTime < new Date(orbitalPath[0].date || '').getTime()) {
      const p = orbitalPath[0];
      return new THREE.Vector3(p.x * SCALE_FACTOR, p.z * SCALE_FACTOR, -p.y * SCALE_FACTOR);
    } else {
      const p = orbitalPath[orbitalPath.length - 1];
      return new THREE.Vector3(p.x * SCALE_FACTOR, p.z * SCALE_FACTOR, -p.y * SCALE_FACTOR);
    }
  }

  // Linear interpolation between the two points
  const before = orbitalPath[beforeIndex];
  const after = orbitalPath[afterIndex];
  const beforeTime = new Date(before.date || '').getTime();
  const afterTime = new Date(after.date || '').getTime();
  const t = (targetTime - beforeTime) / (afterTime - beforeTime);

  const x = THREE.MathUtils.lerp(before.x, after.x, t) * SCALE_FACTOR;
  const y = THREE.MathUtils.lerp(before.z, after.z, t) * SCALE_FACTOR;
  const z = THREE.MathUtils.lerp(-before.y, -after.y, t) * SCALE_FACTOR;

  return new THREE.Vector3(x, y, z);
}

// Helper function for easing (ease-out cubic)
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const ModernSolarSystem = memo(function ModernSolarSystem({
  centerMode = 'default',
  autoPlay = false,
  showControls = true,
  initialDate,
  followComet = false
}: ModernSolarSystemProps = {}) {
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
  const logTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Animation states
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [animationSpeed] = useState(5); // days per second (5 days per second for faster animation)
  const [orbitalData, setOrbitalData] = useState<ApiData | null>(null);
  const [cameraFlyInComplete, setCameraFlyInComplete] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(Date.now());
  const currentDateRef = useRef<Date>(currentDate); // Ref to avoid re-triggering effect
  const lastStateUpdateRef = useRef<number>(Date.now()); // For throttling state updates
  const isPlayingRef = useRef<boolean>(isPlaying); // Ref for playing state

  // Sync refs with state when state changes externally
  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

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

  // Handle responsive height based on viewport
  useEffect(() => {
    const calculateHeight = () => {
      // On mobile (width < 768px), use responsive height based on viewport
      // On desktop, maintain fixed 600px height
      const isMobile = window.innerWidth < 768;
      const newHeight = isMobile ? Math.min(600, window.innerHeight * 0.6) : 600;
      setContainerHeight(newHeight);
    };

    // Calculate on mount
    calculateHeight();

    // Recalculate on window resize
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, []);

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

        // Store orbital data for animation
        const apiData = positionResponse.data;
        setOrbitalData(apiData);

        // Extract timeline range from orbital trail and projection data
        const allDates: Date[] = [];
        if (apiData.orbital_trail) {
          apiData.orbital_trail.forEach((p: OrbitalPoint) => {
            if (p.date) allDates.push(new Date(p.date));
          });
        }
        if (apiData.orbital_projection) {
          apiData.orbital_projection.forEach((p: OrbitalPoint) => {
            if (p.date) allDates.push(new Date(p.date));
          });
        }

        if (allDates.length > 0) {
          const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
          const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
          setTimelineRange({ start: startDate, end: endDate });
          console.log(`Timeline range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        }

        // Check if response has cache warning
        if (positionResponse.warning) {
          console.warn('⚠️  Using cached data:', positionResponse.warning);
          setCacheWarning(positionResponse.warning);
        } else {
          setCacheWarning(null);
        }

        initScene(apiData, activityResponse.data?.currentActivity);
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

        // Get theme-aware background color
        const getSceneBackground = () => {
          const theme = document.documentElement.getAttribute('data-theme');
          switch(theme) {
            case 'light': return 0xf5f1e8;  // Warm cream
            case 'dark': return 0x0f172a;   // Slate-900
            case 'high-contrast': return 0x000000;  // Pure black
            default: return 0x0f172a;       // Default to dark
          }
        };

        scene.background = new THREE.Color(getSceneBackground());

        const width = container.clientWidth || 800;
        const height = containerHeight;
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
        // Hemisphere light for ambient fill (sky vs ground) - increased for better planet visibility
        const hemiLight = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 1.2);
        scene.add(hemiLight);

        // Point light from the Sun - balanced intensity to show textures
        const sunLight = new THREE.PointLight(0xffffee, 4.5, 20000);
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
        function createLabel(text: string, color: string, isAtlas = false): CSS2DObject {
          const div = document.createElement('div');
          div.textContent = text;

          // Use theme-aware color for labels
          div.style.color = isAtlas ? getThemeAwareColor('label') : color;
          div.style.fontSize = '12px';
          div.style.fontWeight = 'bold';
          div.style.fontFamily = 'system-ui, -apple-system, sans-serif';

          // Theme-aware text shadow and background
          const theme = document.documentElement.getAttribute('data-theme');
          if (theme === 'light') {
            div.style.textShadow = '0 0 4px rgba(255,255,255,0.9)';
            div.style.backgroundColor = 'rgba(255,255,255,0.85)';
          } else {
            div.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
            div.style.backgroundColor = 'rgba(0,0,0,0.7)';
          }

          div.style.padding = '2px 6px';
          div.style.borderRadius = '3px';
          div.style.whiteSpace = 'nowrap';
          div.style.pointerEvents = 'none';
          div.className = 'css2d-label'; // Add class for later theme updates

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
          new THREE.SphereGeometry(sunConfig.size, 24, 24), // Optimized: 64x64 → 24x24 segments
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
            emissiveIntensity: 0.3 // Increased glow for better planet visibility
          });

          // Attempt to load texture asynchronously
          console.log(`Attempting to load texture: ${texturePath}`);
          textureLoader.load(
            texturePath,
            (texture) => {
              material.map = texture;
              // Keep subtle emissive glow when texture loads for better visibility
              material.emissive.setHex(parseInt(config.color.replace('#', '0x')));
              material.emissiveIntensity = 0.15; // Subtle glow to enhance visibility
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
              material.emissiveIntensity = 0.3; // Increased for better visibility
            }
          );

          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(config.size, 16, 16), // Optimized: 64x64 → 16x16 segments
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
            // Optimize: Reduce point density for better performance
            // Keep every Nth point based on total count (more decimation for longer paths)
            const step = Math.max(1, Math.floor(planet.orbital_path.length / 120)); // Max 120 points per orbit
            const optimizedPath = planet.orbital_path.filter((_, idx) => idx % step === 0);

            const orbitPoints = optimizedPath.map((point: OrbitalPoint) => {
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
            console.log(`✓ Added orbital path for ${planet.name} with ${orbitPoints.length} points (optimized from ${planet.orbital_path.length}), color: ${config.color}`);
          } else {
            console.warn(`✗ No orbital path for ${planet.name}`);
          }
        });

        // Create 3I/ATLAS comet with nucleus and coma
        const cometConfig = BODY_CONFIG['3I/ATLAS'];

        // Create comet group
        const cometGroup = new THREE.Group();

        // Get theme-aware color for ATLAS (black in light mode, white in dark mode)
        const atlasColorHex = getThemeAwareColor('atlas');
        const atlasColorNum = parseInt(atlasColorHex.replace('#', '0x'));

        // Create smaller bright nucleus at center
        const nucleusSize = 1.5; // Reduced from 2
        const nucleusMesh = new THREE.Mesh(
          new THREE.SphereGeometry(nucleusSize, 16, 16),
          new THREE.MeshPhongMaterial({
            color: atlasColorNum, // Theme-aware: black in light, white in dark
            emissive: atlasColorNum, // Bright glow matching color
            emissiveIntensity: 1.0,
            shininess: 100
          })
        );
        nucleusMesh.position.set(0, 0, 0); // Centered in group
        nucleusMesh.userData.isAtlas = true; // Mark for theme updates
        cometGroup.add(nucleusMesh);

        // Create glowing coma around nucleus (same center)
        const comaSize = 4; // Reduced from 5
        const comaMesh = new THREE.Mesh(
          new THREE.SphereGeometry(comaSize, 16, 16),
          new THREE.MeshBasicMaterial({
            color: atlasColorNum, // Theme-aware: black in light, white in dark
            transparent: true,
            opacity: 0.2, // Slightly more transparent
            depthWrite: false
          })
        );
        comaMesh.position.set(0, 0, 0); // Centered in group
        comaMesh.userData.isAtlas = true; // Mark for theme updates
        cometGroup.add(comaMesh);

        const cometX = apiData.comet_position.x * SCALE_FACTOR;
        const cometY = apiData.comet_position.z * SCALE_FACTOR;
        const cometZ = -apiData.comet_position.y * SCALE_FACTOR;
        cometGroup.position.set(cometX, cometY, cometZ);
        scene.add(cometGroup);
        bodies.set('3I/ATLAS', cometGroup);

        // Add simple CSS2D label that follows the comet (theme-aware)
        const cometLabel = createLabel('3I/ATLAS', cometConfig.color, true);
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

        // Create 3I/ATLAS past trail (observations) - solid red line
        if (apiData.orbital_trail && apiData.orbital_trail.length > 1) {
          // Filter to only show PAST points (before or equal to current date) to avoid overlap with projection
          const currentDate = new Date();
          const pastTrail = apiData.orbital_trail.filter(point => {
            const pointDate = new Date(point.date || '');
            return pointDate <= currentDate;
          });

          console.log(`Orbital trail: ${apiData.orbital_trail.length} total points → ${pastTrail.length} past points (filtering future)`);

          if (pastTrail.length > 0) {
            // Optimize: Reduce trail point density for better performance (max 150 points)
            const step = Math.max(1, Math.floor(pastTrail.length / 150));
            const optimizedTrail = pastTrail.filter((_, idx) => idx % step === 0);

            const trailPoints: THREE.Vector3[] = [];
            optimizedTrail.forEach((point: OrbitalPoint) => {
              const x = point.x * SCALE_FACTOR;
              const y = point.z * SCALE_FACTOR;
              const z = -point.y * SCALE_FACTOR;
              trailPoints.push(new THREE.Vector3(x, y, z));
            });

            const trailPositions = new Float32Array(trailPoints.length * 3);
            trailPoints.forEach((p, i) => {
              trailPositions[i * 3] = p.x;
              trailPositions[i * 3 + 1] = p.y;
              trailPositions[i * 3 + 2] = p.z;
            });

            const trailGeometry = new THREE.BufferGeometry();
            trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

            const trailLine = new THREE.Line(
              trailGeometry,
              new THREE.LineBasicMaterial({
                color: 0xFF3333,  // Solid red for past observations
                opacity: 0.9,
                transparent: true,
                linewidth: 2
              })
            );
            scene.add(trailLine);
            console.log(`✓ Created 3I/ATLAS past trail with ${trailPoints.length} points (solid red, optimized from ${pastTrail.length} past points)`);
            console.log(`  Trail start: (${trailPoints[0].x.toFixed(1)}, ${trailPoints[0].y.toFixed(1)}, ${trailPoints[0].z.toFixed(1)})`);
            console.log(`  Trail end: (${trailPoints[trailPoints.length-1].x.toFixed(1)}, ${trailPoints[trailPoints.length-1].y.toFixed(1)}, ${trailPoints[trailPoints.length-1].z.toFixed(1)})`);
          }
        }

        // Create projected path using Kepler mechanics from API (future only)
        console.log('Checking for orbital_projection:', !!apiData.orbital_projection, 'length:', apiData.orbital_projection?.length);
        if (apiData.orbital_projection && apiData.orbital_projection.length > 0) {
          // Filter to only show FUTURE points (strictly after current date) to avoid overlap with past trail
          const currentDate = new Date();
          const futureProjection = apiData.orbital_projection.filter(point => {
            const pointDate = new Date(point.date || '');
            return pointDate > currentDate; // Strictly greater than (not equal) to avoid overlap
          });

          console.log(`Orbital projection: ${apiData.orbital_projection.length} total points → ${futureProjection.length} future points (filtering past/current)`);

          if (futureProjection.length > 0) {
            // Optimize: Reduce projection point density for better performance (max 150 points)
            const step = Math.max(1, Math.floor(futureProjection.length / 150));
            const optimizedProjection = futureProjection.filter((_, idx) => idx % step === 0);

            const futurePoints: THREE.Vector3[] = [];

            // Convert projection points to Three.js coordinates
            for (const point of optimizedProjection) {
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
            console.log(`✓ Created 3I/ATLAS projected path with ${futurePoints.length} points (orange dashed, optimized from ${futureProjection.length} future points)`);
            console.log(`  Projection start: (${futurePoints[0].x.toFixed(1)}, ${futurePoints[0].y.toFixed(1)}, ${futurePoints[0].z.toFixed(1)})`);
            console.log(`  Projection end: (${futurePoints[futurePoints.length-1].x.toFixed(1)}, ${futurePoints[futurePoints.length-1].y.toFixed(1)}, ${futurePoints[futurePoints.length-1].z.toFixed(1)})`);
          } else {
            console.warn('No future projection points available (all projection data is in the past)');
          }

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

            // Theme-aware perihelion line color: bright orange in both themes
            const perihelionColor = 0xFF6600; // Bright orange - visible in all themes

            const reticleMaterial = new THREE.LineBasicMaterial({
              color: perihelionColor,
              linewidth: 2,
              opacity: 1.0,
              transparent: false
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

            // Add CSS2D label that follows perihelion marker (bright orange to match line)
            const perihelionLabel = createLabel('Perihelion', '#FF6600');
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
        let viewCenter = getCenterPosition(centerTarget);

        // Sun-centered mode: adjust camera for solar system overview
        if (centerMode === 'sun') {
          viewCenter = new THREE.Vector3(0, 0, 0);
          // Position camera for solar system view (higher and further back)
          camera.position.set(-300, 200, 300);
        } else {
          // Default mode: Set specific camera position for ideal comet viewing angle
          camera.position.set(-162.4, 58.3, 170.2);
        }

        // Store final camera position for fly-in animation
        const targetCameraPosition = camera.position.clone();

        // Set camera to far-away start position for fly-in
        const startPosition = new THREE.Vector3(-500, 300, 500);
        camera.position.copy(startPosition);

        console.log(`Camera fly-in: start=(${startPosition.x.toFixed(1)}, ${startPosition.y.toFixed(1)}, ${startPosition.z.toFixed(1)}), target=(${viewCenter.x.toFixed(1)}, ${viewCenter.y.toFixed(1)}, ${viewCenter.z.toFixed(1)}), end=(${targetCameraPosition.x.toFixed(1)}, ${targetCameraPosition.y.toFixed(1)}, ${targetCameraPosition.z.toFixed(1)})`);

        // Setup OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.copy(viewCenter);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 20;
        controls.maxDistance = 3000;
        controls.enabled = false; // Disable during fly-in
        controls.update();

        // Camera fly-in animation (2.5 seconds)
        const flyInDuration = 2500;
        const flyInStartTime = Date.now();

        const performFlyIn = () => {
          const elapsed = Date.now() - flyInStartTime;
          const progress = Math.min(elapsed / flyInDuration, 1);
          const easedProgress = easeOutCubic(progress);

          // Interpolate camera position
          camera.position.lerpVectors(startPosition, targetCameraPosition, easedProgress);
          camera.lookAt(viewCenter);

          if (progress < 1) {
            requestAnimationFrame(performFlyIn);
          } else {
            // Fly-in complete - enable controls
            controls.enabled = true;
            setCameraFlyInComplete(true);
            console.log('Camera fly-in complete');
          }
        };

        // Start fly-in animation
        performFlyIn();

        // Log camera position when user moves it (throttled to avoid spam)
        controls.addEventListener('change', () => {
          if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);
          logTimeoutRef.current = setTimeout(() => {
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
      // Clear any pending timeouts
      if (logTimeoutRef.current) clearTimeout(logTimeoutRef.current);

      // Cancel orbital animation loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (sceneRef.current) {
        // Cancel main animation loop
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        // Cancel orbital animation loop
        if (sceneRef.current.orbitalAnimationId) {
          cancelAnimationFrame(sceneRef.current.orbitalAnimationId);
        }

        // Dispose scene objects (geometries, materials, textures)
        if (sceneRef.current.scene) {
          sceneRef.current.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              // Dispose geometry
              if (object.geometry) {
                object.geometry.dispose();
              }
              // Dispose material(s)
              if (object.material) {
                if (Array.isArray(object.material)) {
                  object.material.forEach(material => {
                    // Dispose textures
                    if (material.map) material.map.dispose();
                    if (material.lightMap) material.lightMap.dispose();
                    if (material.bumpMap) material.bumpMap.dispose();
                    if (material.normalMap) material.normalMap.dispose();
                    if (material.specularMap) material.specularMap.dispose();
                    if (material.envMap) material.envMap.dispose();
                    material.dispose();
                  });
                } else {
                  // Dispose textures
                  if (object.material.map) object.material.map.dispose();
                  if (object.material.lightMap) object.material.lightMap.dispose();
                  if (object.material.bumpMap) object.material.bumpMap.dispose();
                  if (object.material.normalMap) object.material.normalMap.dispose();
                  if (object.material.specularMap) object.material.specularMap.dispose();
                  if (object.material.envMap) object.material.envMap.dispose();
                  object.material.dispose();
                }
              }
            } else if (object instanceof THREE.Line || object instanceof THREE.Points) {
              // Dispose geometry for lines and point clouds (star field)
              if (object.geometry) {
                object.geometry.dispose();
              }
              if (object.material) {
                if (Array.isArray(object.material)) {
                  object.material.forEach(material => material.dispose());
                } else {
                  object.material.dispose();
                }
              }
            }
          });
        }

        // Dispose controls
        if (sceneRef.current.controls) {
          sceneRef.current.controls.dispose();
        }

        // Remove DOM elements and dispose renderers
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

  // Handle window resize - update camera and renderer
  useEffect(() => {
    if (!sceneRef.current) return;

    const { camera, renderer, labelRenderer } = sceneRef.current;
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = containerHeight;

    // Update camera aspect ratio
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
  }, [containerHeight]);

  // Orbital animation loop - updates positions based on timeline
  useEffect(() => {
    if (!sceneRef.current || !orbitalData || !timelineRange) return;

    const animate = () => {
      if (!sceneRef.current || !orbitalData) return;

      // Calculate time delta for smooth animation
      const now = Date.now();
      const deltaTime = (now - lastFrameTimeRef.current) / 1000; // seconds
      lastFrameTimeRef.current = now;

      // Update current date if playing (using ref to avoid re-triggering effect)
      if (isPlayingRef.current) {
        const newDate = new Date(currentDateRef.current.getTime() + (deltaTime * animationSpeed * 24 * 60 * 60 * 1000));

        // Stop at end of timeline
        if (newDate > timelineRange.end) {
          currentDateRef.current = timelineRange.end;
          isPlayingRef.current = false;
          setCurrentDate(timelineRange.end);
          setIsPlaying(false);
        } else {
          currentDateRef.current = newDate;

          // Throttle state updates to every 50ms for smoother performance
          if (now - lastStateUpdateRef.current > 50) {
            setCurrentDate(newDate);
            lastStateUpdateRef.current = now;
          }
        }
      }

      // Update comet position (use ref for current position)
      const atlasBody = sceneRef.current.bodies.get('3I/ATLAS');
      if (atlasBody && orbitalData.orbital_trail) {
        // Combine trail and projection for full timeline
        const fullPath = [
          ...(orbitalData.orbital_trail || []),
          ...(orbitalData.orbital_projection || [])
        ].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateA - dateB;
        });

        const newPosition = interpolatePosition(currentDateRef.current, fullPath);
        if (newPosition) {
          // Store previous position for camera offset calculation
          const prevPosition = atlasBody.position.clone();
          atlasBody.position.copy(newPosition);

          // Camera following: if followComet is enabled, move camera to track the comet
          if (followComet && sceneRef.current?.controls) {
            const controls = sceneRef.current.controls;
            const camera = sceneRef.current.camera;

            // Calculate the movement delta
            const delta = new THREE.Vector3().subVectors(newPosition, prevPosition);

            // Move camera by the same delta to maintain relative position
            camera.position.add(delta);

            // Update controls target to new comet position
            controls.target.copy(newPosition);
            controls.update();
          }
        }
      }

      // Update planet positions using real orbital mechanics
      try {
        const planetPositions = calculateAllPlanetPositions(currentDateRef.current);

        planetPositions.forEach((planetData) => {
          const body = sceneRef.current?.bodies.get(planetData.name);
          if (body) {
            // Convert astronomy-engine coordinates to Three.js coordinates
            // astronomy-engine: heliocentric ecliptic (x, y, z in AU)
            // Three.js: x right, y up, z toward camera (flip y/z)
            const newPosition = new THREE.Vector3(
              planetData.x * SCALE_FACTOR,
              planetData.z * SCALE_FACTOR,
              -planetData.y * SCALE_FACTOR
            );
            body.position.copy(newPosition);
          }
        });
      } catch (error) {
        console.error('Error calculating planet positions:', error);
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    lastFrameTimeRef.current = Date.now();
    animate();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [orbitalData, timelineRange, animationSpeed, followComet]);

  // Handle theme changes - update scene background, ATLAS colors, and labels
  useEffect(() => {
    if (!sceneRef.current) return;

    const updateTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      let bgColor: number;

      switch(theme) {
        case 'light':
          bgColor = 0xf5f1e8;  // Warm cream
          break;
        case 'dark':
          bgColor = 0x0f172a;  // Slate-900
          break;
        case 'high-contrast':
          bgColor = 0x000000;  // Pure black
          break;
        default:
          bgColor = 0x0f172a;  // Default to dark
      }

      // Update scene background
      if (sceneRef.current.scene.background) {
        (sceneRef.current.scene.background as THREE.Color).setHex(bgColor);
      }

      // Update ATLAS comet color (black in light mode, white in dark mode)
      const atlasColorHex = getThemeAwareColor('atlas');
      const atlasColorNum = parseInt(atlasColorHex.replace('#', '0x'));

      sceneRef.current.scene.traverse((object) => {
        // Update ATLAS nucleus and coma colors
        if (object.userData.isAtlas && object instanceof THREE.Mesh) {
          if (object.material instanceof THREE.MeshPhongMaterial) {
            object.material.color.setHex(atlasColorNum);
            object.material.emissive.setHex(atlasColorNum);
          } else if (object.material instanceof THREE.MeshBasicMaterial) {
            object.material.color.setHex(atlasColorNum);
          }
        }
      });

      // Update CSS2D labels
      const labelColor = getThemeAwareColor('label');
      const labels = document.querySelectorAll('.css2d-label');
      labels.forEach((label) => {
        const div = label as HTMLDivElement;
        div.style.color = labelColor;

        if (theme === 'light') {
          div.style.textShadow = '0 0 4px rgba(255,255,255,0.9)';
          div.style.backgroundColor = 'rgba(255,255,255,0.85)';
        } else {
          div.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
          div.style.backgroundColor = 'rgba(0,0,0,0.7)';
        }
      });
    };

    // Set initial theme
    updateTheme();

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
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

  // Keyboard controls - Space to play/pause
  useEffect(() => {
    if (!showControls || !timelineRange) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle Space key
      if (e.code === 'Space') {
        // Prevent page scroll
        e.preventDefault();
        // Toggle play/pause
        setIsPlaying(prev => !prev);
        console.log('Space key pressed - toggling animation');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, timelineRange]);

  return (
    <div className="w-full bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden">
      {/* Compact Header */}
      <div className="bg-[var(--color-bg-primary)] p-3 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center justify-center gap-3 text-sm">
          {/* Title and Date */}
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Current Solar System Position</h3>
          <span className="text-[var(--color-text-tertiary)] text-xs">
            {currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative">
        {/* HUD Toggle - Upper Left Corner */}
        {!loading && !error && (
          <div className="absolute top-2 left-2 z-10 bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm border border-[var(--color-border-primary)]/50 rounded px-2 py-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showHud}
                onChange={(e) => setShowHud(e.target.checked)}
                className="w-3 h-3 cursor-pointer"
              />
              <span className="text-[var(--color-text-secondary)] text-xs">HUD</span>
            </label>
          </div>
        )}

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
          className="bg-[var(--color-bg-primary)] relative"
          style={{ height: `${containerHeight}px` }}
        >
        {/* Interactive Overlay - Shows hint on first visit */}
        {!loading && !error && (
          <ThreeDInteractiveOverlay
            overlayId="modern-solar-system"
            desktopMessage="Click and drag to explore!"
            mobileMessage="Touch and drag to explore!"
          />
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[var(--color-text-tertiary)] text-lg mb-4">Loading 3D Solar System...</div>
              <div className="text-[var(--color-text-tertiary)] text-sm">Fetching real-time position data</div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-400 text-lg mb-4">Failed to Load</div>
              <div className="text-[var(--color-text-tertiary)] text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* HUD - Heads-Up Display */}
        {hudData && !loading && !error && showHud && (
          <div className="absolute top-3 right-3 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm border-2 border-[var(--color-border-primary)] rounded p-2 text-xs font-mono pointer-events-none z-50 shadow-lg">
            <div className="text-[var(--color-text-primary)] font-bold text-sm mb-1.5 border-b-2 border-[var(--color-border-primary)] pb-1">
              3I/ATLAS
            </div>

            {/* Velocity & Activity */}
            <div className="space-y-1 mb-1.5 pb-1.5 border-b border-[var(--color-border-secondary)]">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--color-text-secondary)]">Velocity:</span>
                <span className="text-[var(--color-accent-blue)] font-semibold">
                  {hudData.velocity.toFixed(1)} km/s{' '}
                  {hudData.velocityTrend === 'up' ? '↑' : hudData.velocityTrend === 'down' ? '↓' : '→'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--color-text-secondary)]">Activity:</span>
                <span className={`font-semibold ${
                  hudData.activityLevel === 'EXTREME' ? 'text-red-600 dark:text-red-400' :
                  hudData.activityLevel === 'HIGH' ? 'text-orange-600 dark:text-orange-400' :
                  hudData.activityLevel === 'MODERATE' ? 'text-yellow-600 dark:text-yellow-400' :
                  hudData.activityLevel === 'LOW' ? 'text-green-600 dark:text-green-400' :
                  'text-[var(--color-text-secondary)]'
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
            <div className="space-y-1 mb-1.5 pb-1.5 border-b border-[var(--color-border-secondary)]">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--color-text-secondary)]">Dist (Sun):</span>
                <span className="text-blue-700 dark:text-blue-300">{hudData.distanceFromSun.toFixed(2)} AU</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--color-text-secondary)]">Dist (Earth):</span>
                <span className="text-green-700 dark:text-green-300">{hudData.distanceFromEarth.toFixed(2)} AU</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--color-text-secondary)]">Eccent:</span>
                <span className="text-purple-700 dark:text-purple-300">{hudData.eccentricity.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--color-text-secondary)]">Inclin:</span>
                <span className="text-purple-700 dark:text-purple-300">{hudData.inclination.toFixed(1)}°</span>
              </div>
            </div>

            {/* Mission Parameters */}
            <div className="space-y-1 mb-1.5 pb-1.5 border-b border-[var(--color-border-secondary)]">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[var(--color-text-secondary)]">Perihelion:</span>
                <span className="text-yellow-700 dark:text-yellow-300">Oct 30, 2025</span>
              </div>
            </div>

            {/* Data Source & Timestamp */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between items-center gap-2">
                <span className="text-[var(--color-text-tertiary)]">Source:</span>
                <span className="text-[var(--color-text-tertiary)] truncate max-w-[100px]">{hudData.dataSource}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[var(--color-text-tertiary)]">Update:</span>
                <span className="text-[var(--color-text-tertiary)]">
                  {new Date(hudData.lastUpdate).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="text-[var(--color-text-tertiary)] italic mt-1 pt-1 border-t border-[var(--color-border-secondary)]">
                Sizes not to scale
              </div>
            </div>
          </div>
        )}

        {/* Timeline Controls - Bottom overlay */}
        {showControls && timelineRange && !loading && !error && cameraFlyInComplete && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-3xl z-20">
            <div className="bg-black/70 backdrop-blur-sm border border-[var(--color-border-primary)] rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-4">
                {/* Play/Pause Button */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--color-chart-primary)] hover:opacity-80 transition-opacity flex items-center justify-center text-white shadow-lg"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  title={isPlaying ? 'Pause animation (Space)' : 'Play animation (Space)'}
                >
                  {isPlaying ? (
                    // Pause icon
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    // Play icon
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Timeline Slider Container */}
                <div className="flex-1 flex flex-col gap-2">
                  {/* Current Date Display */}
                  <div className="text-center">
                    <div className="text-[var(--color-text-primary)] font-semibold text-lg">
                      {currentDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC'
                      })}
                    </div>
                    <div className="text-[var(--color-text-tertiary)] text-xs">
                      {animationSpeed === 1 ? '1 day per second' : `${animationSpeed} days per second`}
                    </div>
                  </div>

                  {/* Timeline Slider */}
                  <div className="relative">
                    <input
                      type="range"
                      min={timelineRange.start.getTime()}
                      max={timelineRange.end.getTime()}
                      value={currentDate.getTime()}
                      onChange={(e) => {
                        setCurrentDate(new Date(parseInt(e.target.value)));
                        setIsPlaying(false); // Pause when user manually scrubs
                      }}
                      className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer slider-thumb"
                      style={{
                        background: `linear-gradient(to right,
                          var(--color-chart-primary) 0%,
                          var(--color-chart-primary) ${((currentDate.getTime() - timelineRange.start.getTime()) / (timelineRange.end.getTime() - timelineRange.start.getTime())) * 100}%,
                          var(--color-bg-tertiary) ${((currentDate.getTime() - timelineRange.start.getTime()) / (timelineRange.end.getTime() - timelineRange.start.getTime())) * 100}%,
                          var(--color-bg-tertiary) 100%)`
                      }}
                    />

                    {/* Date Labels */}
                    <div className="flex justify-between mt-1 text-xs text-[var(--color-text-tertiary)]">
                      <span>{timelineRange.start.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>
                      <span>{timelineRange.end.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Keyboard Hint */}
              <div className="mt-2 text-center text-xs text-[var(--color-text-tertiary)] opacity-70">
                Press Space to play/pause
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
});

export default ModernSolarSystem;