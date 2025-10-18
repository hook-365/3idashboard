'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { calculateOrbitPoints, calculateOrbitPointsWithDates, COMET_ORBITAL_ELEMENTS } from '@/lib/orbital-path-calculator';
import ThreeDInteractiveOverlay from '@/components/common/ThreeDInteractiveOverlay';

// Scale factor for visualization (1 AU = this many pixels)
const SCALE_FACTOR = 100;

// Planet colors and sizes (from ModernSolarSystem.tsx)
const BODY_CONFIG: Record<string, { color: string; size: number }> = {
  Sun: { color: '#FDB813', size: 25 },
  Mercury: { color: '#708090', size: 3 },
  Venus: { color: '#E8D44D', size: 5.8 },
  Earth: { color: '#1E90FF', size: 6.0 },
  Mars: { color: '#CD5C5C', size: 4 },
  Jupiter: { color: '#F5DEB3', size: 20 },
  Saturn: { color: '#EEE8AA', size: 17 },
  Uranus: { color: '#4FD8EB', size: 8 },
  Neptune: { color: '#4169E1', size: 7.5 },
  Pluto: { color: '#C19A6B', size: 2 },
};

// API data types
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

interface ApiData {
  planets: Planet[];
  comet_position: OrbitalPoint;
  orbital_trail?: OrbitalPoint[];
  orbital_projection?: OrbitalPoint[];
}

interface CometTrailData {
  name: string;
  color: string;
  currentPosition: { x: number; y: number; z: number };
  trail?: Array<{ x: number; y: number; z: number }>;
}

interface MultiCometViewProps {
  comets: CometTrailData[];
  showSun?: boolean;
  showEarth?: boolean;
}

export default function MultiCometView({ comets, showSun = true, showEarth = true }: MultiCometViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    labelRenderer: CSS2DRenderer;
    controls: OrbitControls;
    animationId?: number;
    planetLabels: CSS2DObject[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlanetLabels, setShowPlanetLabels] = useState(true);
  const [solarSystemData, setSolarSystemData] = useState<ApiData | null>(null);
  const [atlasTrajectory, setAtlasTrajectory] = useState<{
    trail: OrbitalPoint[];
    projection: OrbitalPoint[];
  } | null>(null);

  // Fetch solar system position data on mount
  useEffect(() => {
    console.log('[MultiCometView] Fetching solar system position data...');

    fetch('/api/solar-system-position?trail_days=90')
      .then(res => res.json())
      .then(response => {
        if (response.success && response.data) {
          console.log('[MultiCometView] Solar system data received:', {
            planets: response.data.planets.length,
            cometPosition: response.data.comet_position,
            trailPoints: response.data.orbital_trail?.length || 0,
            projectionPoints: response.data.orbital_projection?.length || 0,
          });
          setSolarSystemData(response.data);

          // Extract 3I/ATLAS trajectory data
          if (response.data.orbital_trail && response.data.orbital_projection) {
            setAtlasTrajectory({
              trail: response.data.orbital_trail,
              projection: response.data.orbital_projection,
            });
          }
        } else {
          setError('Failed to load solar system data');
        }
      })
      .catch(err => {
        console.error('[MultiCometView] Error fetching solar system data:', err);
        setError(err.message || 'Failed to load visualization data');
      });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !solarSystemData) return;

    try {
      // Array to store planet/sun labels for toggling visibility
      const planetLabels: CSS2DObject[] = [];

      // Setup scene
      const scene = new THREE.Scene();
      const theme = document.documentElement.getAttribute('data-theme');
      const bgColor = theme === 'light' ? 0xf5f1e8 : 0x0f172a;
      scene.background = new THREE.Color(bgColor);

      const width = container.clientWidth || 800;
      const height = 600;
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);

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

      // Lighting
      const hemiLight = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 1.2);
      scene.add(hemiLight);

      const sunLight = new THREE.PointLight(0xffffee, 4.5, 5000);
      sunLight.position.set(0, 0, 0);
      scene.add(sunLight);

      // Stars background
      const starVertices = [];
      for (let i = 0; i < 2000; i++) {
        starVertices.push(
          Math.random() * 8000 - 4000,
          Math.random() * 8000 - 4000,
          Math.random() * 8000 - 4000
        );
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 })));

      // Create infinite grid using shader (from ModernSolarSystem)
      const createInfiniteGrid = () => {
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
      console.log('[MultiCometView] Added infinite shader-based grid');

      // Texture loader for planet textures
      const textureLoader = new THREE.TextureLoader();

      // Add Sun if requested
      if (showSun) {
        const sunConfig = BODY_CONFIG['Sun'];
        const sunMaterial = new THREE.MeshBasicMaterial({ color: sunConfig.color });

        const sunMesh = new THREE.Mesh(
          new THREE.SphereGeometry(sunConfig.size, 32, 32),
          sunMaterial
        );
        sunMesh.position.set(0, 0, 0);
        scene.add(sunMesh);

        // Load sun texture
        textureLoader.load(
          '/textures/planets/sun.jpg',
          (texture) => {
            sunMaterial.map = texture;
            sunMaterial.needsUpdate = true;
            console.log('[MultiCometView] ✓ Loaded texture for Sun');
          },
          undefined,
          () => {
            console.log('[MultiCometView] Using color for Sun (texture not found)');
          }
        );

        // Sun label
        const sunLabel = createLabel('Sol', sunConfig.color);
        sunLabel.position.set(0, sunConfig.size + 3, 0);
        scene.add(sunLabel);
        planetLabels.push(sunLabel);
      }

      // Render planets from API data
      solarSystemData.planets.forEach((planet) => {
        const config = BODY_CONFIG[planet.name];
        if (!config) {
          console.warn(`[MultiCometView] No config for planet: ${planet.name}`);
          return;
        }

        // Convert AU to visualization units with coordinate transformation
        // JPL: +X = vernal equinox, +Y = 90° ecliptic east, +Z = north ecliptic pole
        // Three.js: +X = right, +Y = up, +Z = toward viewer
        // Transform: (x, y, z) → (x, z, -y)
        const x = planet.x * SCALE_FACTOR;
        const y = planet.z * SCALE_FACTOR;
        const z = -planet.y * SCALE_FACTOR;

        // Create planet mesh with texture support
        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff, // White base so texture shows true colors
          metalness: 0.0,
          roughness: 1.0,
          emissive: parseInt(config.color.replace('#', '0x')),
          emissiveIntensity: 0.3 // Glow for better visibility
        });

        const planetMesh = new THREE.Mesh(
          new THREE.SphereGeometry(config.size, 32, 32),
          material
        );
        planetMesh.position.set(x, y, z);
        scene.add(planetMesh);

        // Load planet texture
        const texturePath = `/textures/planets/${planet.name.toLowerCase()}.jpg`;
        textureLoader.load(
          texturePath,
          (texture) => {
            material.map = texture;
            material.emissive.setHex(parseInt(config.color.replace('#', '0x')));
            material.emissiveIntensity = 0.15; // Subtle glow with texture
            material.needsUpdate = true;
            console.log(`[MultiCometView] ✓ Loaded texture for ${planet.name}`);
          },
          undefined,
          () => {
            console.log(`[MultiCometView] Using color fallback for ${planet.name}`);
            material.color.setHex(parseInt(config.color.replace('#', '0x')));
            material.emissive.setHex(parseInt(config.color.replace('#', '0x')));
            material.emissiveIntensity = 0.3;
          }
        );

        // Add Saturn's rings if applicable
        if (planet.name === 'Saturn') {
          const ringGeometry = new THREE.RingGeometry(config.size * 1.5, config.size * 2.5, 64);
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xC9B27C,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
          });

          const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
          ringMesh.position.set(x, y, z);
          ringMesh.rotation.x = Math.PI / 2; // Rotate to be horizontal
          scene.add(ringMesh);

          // Load ring texture
          textureLoader.load(
            '/textures/planets/saturn_ring.png',
            (texture) => {
              ringMaterial.map = texture;
              ringMaterial.transparent = true;
              ringMaterial.needsUpdate = true;
              console.log('[MultiCometView] ✓ Loaded Saturn ring texture');
            },
            undefined,
            () => {
              console.log('[MultiCometView] Using solid color for Saturn rings');
            }
          );
        }

        // Add planet label
        const label = createLabel(planet.name, config.color);
        label.position.set(x, y + config.size + 3, z);
        scene.add(label);
        planetLabels.push(label);

        // Render orbital path if available
        if (planet.orbital_path && planet.orbital_path.length > 1) {
          const orbitPoints = planet.orbital_path.map((point) =>
            new THREE.Vector3(
              point.x * SCALE_FACTOR,
              point.z * SCALE_FACTOR,
              -point.y * SCALE_FACTOR
            )
          );

          const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
          const orbitLine = new THREE.LineLoop(
            orbitGeometry,
            new THREE.LineBasicMaterial({
              color: config.color,
              opacity: 0.3,
              transparent: true,
            })
          );
          scene.add(orbitLine);
        }

        console.log(`[MultiCometView] Rendered ${planet.name} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
      });

      // Render comets with calculated orbital trajectories
      comets.forEach((comet) => {
        const cometColorNum = parseInt(comet.color.replace('#', '0x'));

        // Determine which trajectory to use
        let trajectoryPoints: THREE.Vector3[] = [];

        if (comet.name === '3I/ATLAS') {
          // Use real trajectory data from API
          if (atlasTrajectory) {
            // Render past trail (solid)
            if (atlasTrajectory.trail.length > 0) {
              const trailPoints = atlasTrajectory.trail.map(point =>
                new THREE.Vector3(
                  point.x * SCALE_FACTOR,
                  point.z * SCALE_FACTOR,
                  -point.y * SCALE_FACTOR
                )
              );
              const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
              const trailLine = new THREE.Line(
                trailGeometry,
                new THREE.LineBasicMaterial({
                  color: comet.color,
                  opacity: 0.8,
                  transparent: true,
                  linewidth: 2
                })
              );
              scene.add(trailLine);
              console.log(`[MultiCometView] Rendered 3I/ATLAS trail: ${trailPoints.length} points`);
            }

            // Render future projection (dashed) - filter to future only to avoid overlap with past trail
            if (atlasTrajectory.projection.length > 0) {
              const currentDate = new Date();
              const futureProjection = atlasTrajectory.projection.filter(point => {
                const pointDate = new Date(point.date || '');
                return pointDate >= currentDate;
              });

              console.log(`[MultiCometView] Filtered projection: ${atlasTrajectory.projection.length} total → ${futureProjection.length} future points`);

              if (futureProjection.length > 0) {
                const projectionPoints = futureProjection.map(point =>
                  new THREE.Vector3(
                    point.x * SCALE_FACTOR,
                    point.z * SCALE_FACTOR,
                    -point.y * SCALE_FACTOR
                  )
                );
                const projectionGeometry = new THREE.BufferGeometry().setFromPoints(projectionPoints);
                const projectionLine = new THREE.Line(
                  projectionGeometry,
                  new THREE.LineDashedMaterial({
                    color: comet.color,
                    opacity: 0.6,
                    transparent: true,
                    dashSize: 8,
                    gapSize: 4
                  })
                );
                projectionLine.computeLineDistances();
                scene.add(projectionLine);
                console.log(`[MultiCometView] Rendered 3I/ATLAS projection: ${projectionPoints.length} future points`);
              }
            }
          }
        } else {
          // Calculate orbital trajectory from elements with dates (SWAN, Lemmon, K1, Wierzchos)
          // Map display names to orbital element keys
          const nameMap: Record<string, string> = {
            'K1 ATLAS': 'K1',
            'SWAN': 'SWAN',
            'LEMMON': 'LEMMON',
            'WIERZCHOS': 'WIERZCHOS'
          };

          const upperName = comet.name.toUpperCase();
          const cometKey = nameMap[upperName] || upperName;
          const elements = COMET_ORBITAL_ELEMENTS[cometKey];

          if (elements) {
            // Get points with date information (use 360 points for smooth curves)
            const pointsWithDates = calculateOrbitPointsWithDates(elements, 360, SCALE_FACTOR);

            if (pointsWithDates.length > 1) {
              // Split into past and future based on current date
              const currentDate = new Date();
              const pastPoints: THREE.Vector3[] = [];
              const futurePoints: THREE.Vector3[] = [];
              let perihelionPoint: THREE.Vector3 | null = null;
              let firstDate: Date | null = null;
              let lastDate: Date | null = null;

              pointsWithDates.forEach(({ position, date }, idx) => {
                if (date <= currentDate) {
                  pastPoints.push(position);
                  if (!firstDate || date < firstDate) firstDate = date;
                } else {
                  futurePoints.push(position);
                  if (!lastDate || date > lastDate) lastDate = date;
                }

                // Find perihelion point (closest to perihelion date)
                if (elements.T && perihelionPoint === null) {
                  const timeDiff = Math.abs(date.getTime() - elements.T.getTime());
                  if (timeDiff < 24 * 60 * 60 * 1000) { // Within 1 day
                    perihelionPoint = position;
                  }
                }
              });

              // Render past trail (solid line) with smooth curve
              if (pastPoints.length > 1) {
                // Create smooth curve through points
                const curve = new THREE.CatmullRomCurve3(pastPoints);
                const smoothPoints = curve.getPoints(Math.max(100, pastPoints.length * 2));

                const pastGeometry = new THREE.BufferGeometry().setFromPoints(smoothPoints);
                const pastLine = new THREE.Line(
                  pastGeometry,
                  new THREE.LineBasicMaterial({
                    color: comet.color,
                    opacity: 0.8,
                    transparent: true,
                    linewidth: 2
                  })
                );
                scene.add(pastLine);
                console.log(`[MultiCometView] Rendered ${comet.name} past trail: ${pastPoints.length} → ${smoothPoints.length} smooth points`);
              }

              // Render future projection (dashed line) with smooth curve
              if (futurePoints.length > 1) {
                // Create smooth curve through points
                const curve = new THREE.CatmullRomCurve3(futurePoints);
                const smoothPoints = curve.getPoints(Math.max(100, futurePoints.length * 2));

                const futureGeometry = new THREE.BufferGeometry().setFromPoints(smoothPoints);
                const futureLine = new THREE.Line(
                  futureGeometry,
                  new THREE.LineDashedMaterial({
                    color: comet.color,
                    opacity: 0.6,
                    transparent: true,
                    dashSize: 8,
                    gapSize: 4
                  })
                );
                futureLine.computeLineDistances();
                scene.add(futureLine);
                console.log(`[MultiCometView] Rendered ${comet.name} future projection: ${futurePoints.length} → ${smoothPoints.length} smooth points`);
              }
            }
          } else {
            console.warn(`[MultiCometView] No orbital elements for ${comet.name}`);
          }
        }

        // Render current position marker
        const cometGroup = new THREE.Group();

        const nucleus = new THREE.Mesh(
          new THREE.SphereGeometry(2, 16, 16),
          new THREE.MeshPhongMaterial({
            color: cometColorNum,
            emissive: cometColorNum,
            emissiveIntensity: 0.8
          })
        );
        cometGroup.add(nucleus);

        const coma = new THREE.Mesh(
          new THREE.SphereGeometry(4, 16, 16),
          new THREE.MeshBasicMaterial({
            color: cometColorNum,
            transparent: true,
            opacity: 0.2
          })
        );
        cometGroup.add(coma);

        // Position comet
        const x = comet.currentPosition.x * SCALE_FACTOR;
        const y = comet.currentPosition.z * SCALE_FACTOR;
        const z = -comet.currentPosition.y * SCALE_FACTOR;
        cometGroup.position.set(x, y, z);
        scene.add(cometGroup);

        // Label
        const label = createLabel(comet.name, comet.color);
        label.position.set(x, y + 7, z);
        scene.add(label);

        console.log(`[MultiCometView] Rendered ${comet.name} at (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`);
      });

      // Camera position - adjusted for wider view to encompass all three comets
      // Position further back and higher to see inner solar system + all three comet orbits
      camera.position.set(400, 250, 400);
      camera.lookAt(0, 0, 0);

      // Setup controls with wider zoom range
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 50;
      controls.maxDistance = 3000; // Increased from 2000 to accommodate wider view
      controls.target.set(0, 0, 0);
      controls.update();

      console.log('[MultiCometView] Camera initialized:', {
        position: camera.position,
        target: controls.target,
        maxDistance: controls.maxDistance
      });

      sceneRef.current = { scene, camera, renderer, labelRenderer, controls, planetLabels };

      // Animation loop
      const animate = () => {
        controls.update();
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
        sceneRef.current!.animationId = requestAnimationFrame(animate);
      };
      animate();

      setLoading(false);

    } catch (err) {
      console.error('Error initializing 3D view:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize visualization');
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (sceneRef.current) {
        if (sceneRef.current.animationId) {
          cancelAnimationFrame(sceneRef.current.animationId);
        }
        if (container) {
          if (sceneRef.current.renderer.domElement.parentNode === container) {
            container.removeChild(sceneRef.current.renderer.domElement);
            sceneRef.current.renderer.dispose();
          }
          if (sceneRef.current.labelRenderer.domElement.parentNode === container) {
            container.removeChild(sceneRef.current.labelRenderer.domElement);
          }
        }
      }
    };
  }, [comets, showSun, showEarth, solarSystemData, atlasTrajectory]);

  // Toggle planet labels visibility
  useEffect(() => {
    if (sceneRef.current?.planetLabels) {
      sceneRef.current.planetLabels.forEach(label => {
        label.visible = showPlanetLabels;
      });
    }
  }, [showPlanetLabels]);

  // Helper function to create labels
  function createLabel(text: string, color: string): CSS2DObject {
    const div = document.createElement('div');
    div.textContent = text;
    div.style.color = color;
    div.style.fontSize = '12px';
    div.style.fontWeight = 'bold';
    div.style.fontFamily = 'system-ui, -apple-system, sans-serif';

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

    return new CSS2DObject(div);
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden">
      <div className="bg-[var(--color-bg-primary)] p-3 border-b border-[var(--color-border-primary)]">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
          3D Orbital Comparison
        </h3>
        <div className="text-xs text-[var(--color-text-tertiary)] mt-1">
          Real-time solar system positions • Complete orbital trajectories • Drag to rotate • Scroll to zoom
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-[var(--color-bg-primary)] relative"
        style={{ height: '600px' }}
      >
        {/* Interactive Overlay - Shows hint on first visit */}
        {!loading && !error && (
          <ThreeDInteractiveOverlay
            overlayId="multi-comet-view"
            desktopMessage="Click and drag to compare comets!"
            mobileMessage="Touch and drag to compare comets!"
          />
        )}

        {/* Label Control - Positioned inside visualization */}
        {!loading && !error && (
          <div className="absolute top-4 right-4 z-10 bg-[var(--color-bg-secondary)]/90 backdrop-blur-sm border border-[var(--color-border-primary)] rounded-lg p-3 shadow-lg">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">
              Planet Labels
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="planetLabels"
                  checked={showPlanetLabels === true}
                  onChange={() => setShowPlanetLabels(true)}
                  className="w-3.5 h-3.5 text-blue-500 cursor-pointer"
                />
                <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                  Show
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="planetLabels"
                  checked={showPlanetLabels === false}
                  onChange={() => setShowPlanetLabels(false)}
                  className="w-3.5 h-3.5 text-blue-500 cursor-pointer"
                />
                <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                  Hide
                </span>
              </label>
            </div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[var(--color-text-tertiary)] text-lg mb-2">Loading 3D orbital view...</div>
              <div className="text-[var(--color-text-tertiary)] text-sm">
                {!solarSystemData ? 'Fetching real-time solar system positions...' : 'Calculating orbital trajectories...'}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-red-400">{error}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-[var(--color-bg-primary)] p-3 border-t border-[var(--color-border-primary)]">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {comets.map((comet) => (
            <div key={comet.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: comet.color }}
              />
              <span className="text-[var(--color-text-secondary)]">{comet.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
