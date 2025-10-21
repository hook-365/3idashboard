'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import * as Astronomy from 'astronomy-engine';
import { equatorialToEcliptic } from '@/lib/orbital-calculations';
import ThreeDInteractiveOverlay from '@/components/common/ThreeDInteractiveOverlay';

interface TrajectoryPoint {
  date: string;
  x: number;
  y: number;
  z: number;
  distance_from_sun: number;
}

interface PredictionEpoch {
  epoch_date: string;
  source: string;
  days_old: number;
  trail: TrajectoryPoint[];
  current: {
    x: number;
    y: number;
    z: number;
    distance_from_sun: number;
  };
}

interface PredictionAccuracyVizProps {
  epochsData: {
    epochs: PredictionEpoch[];
    metadata: {
      numEpochs: number;
      dateRange: {
        start: string;
        end: string;
      };
    };
  };
}

const SCALE_FACTOR = 100; // 1 AU = 100 Three.js units

const EPOCH_COLORS = [
  { color: 0xff4444, name: 'July Prediction', opacity: 0.7 },      // Red (oldest)
  { color: 0xffaa00, name: 'Sept Prediction', opacity: 0.7 },      // Orange (middle)
  { color: 0x00ff88, name: 'Oct Prediction', opacity: 0.8 }        // Green (newest)
];

export default function PredictionAccuracyViz({ epochsData }: PredictionAccuracyVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    labelRenderer: CSS2DRenderer;
    controls: OrbitControls;
    gridHelper: THREE.Mesh;
  } | null>(null);

  const [showGrid, setShowGrid] = useState(true);
  const [containerHeight] = useState(600); // Fixed height to match ModernSolarSystem

  // Timeline controls
  const discoveryDate = new Date('2025-06-14T00:00:00.000Z');

  // Timeline spans from discovery to post-perihelion
  // Start: Discovery date (June 14, 2025)
  // End: May 2, 2026 (before trajectory becomes uncertain)
  const timelineStart = new Date('2025-06-14T00:00:00.000Z');
  const timelineEnd = new Date('2026-05-02T00:00:00.000Z'); // ~6 months after perihelion

  // Important dates to mark
  const closestApproachEarth = new Date('2025-12-19T00:00:00.000Z'); // 1.798 AU
  const perihelionDate = new Date('2025-10-29T05:03:46.000Z'); // Closest to Sun

  const [timelineDate, setTimelineDate] = useState(new Date('2025-10-10T00:00:00.000Z'));
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const [planetaryCloseApproaches, setPlanetaryCloseApproaches] = useState<{
    planet: string;
    date: Date;
    distance: number;
  }[]>([]);

  const currentDate = new Date();

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();

    // Get theme-aware background color (matching ModernSolarSystem)
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

    // Camera - positioned exactly as /details for consistent view
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      100000
    );
    // Use exact camera position from ModernSolarSystem for matching orbital plane alignment
    camera.position.set(-162.4, 58.3, 170.2);

    // Look at 3I/ATLAS's approximate position (not Sun) to match /details viewing angle
    // 3I/ATLAS is approximately at (-118, 80, -11) in scaled coordinates
    const atlasViewTarget = new THREE.Vector3(-118, 11, 80);
    camera.lookAt(atlasViewTarget);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // CSS2D Label Renderer
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(atlasViewTarget); // Look at 3I/ATLAS, not Sun
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 1000;
    controls.update();

    // Enhanced lighting for realistic planet illumination (matching ModernSolarSystem)
    // Hemisphere light for ambient fill (sky vs ground) - increased for better planet visibility
    const hemiLight = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 1.2);
    scene.add(hemiLight);

    // Point light from the Sun - balanced intensity to show textures
    const sunLight = new THREE.PointLight(0xffffee, 4.5, 20000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = false; // Shadows are expensive, keep them off
    scene.add(sunLight);

    // Stars background (matching ModernSolarSystem)
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

    // Labels map to track all CSS2D labels
    const labels = new Map<string, CSS2DObject>();

    // Helper function to create CSS2D labels
    function createLabel(text: string, color: string): CSS2DObject {
      const div = document.createElement('div');
      div.textContent = text;
      div.style.color = color;
      div.style.fontSize = '12px';
      div.style.fontWeight = 'bold';
      div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      div.style.textShadow = '0 0 4px rgba(0,0,0,0.8)';
      div.style.backgroundColor = 'rgba(0,0,0,0.7)';
      div.style.padding = '2px 6px';
      div.style.borderRadius = '3px';
      div.style.whiteSpace = 'nowrap';
      div.style.pointerEvents = 'none';
      return new CSS2DObject(div);
    }

    // Sun - match ModernSolarSystem size (25 instead of 15)
    const sunGeometry = new THREE.SphereGeometry(25, 24, 24);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xFDB813
    });

    // Load sun texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      '/textures/planets/sun.jpg',
      (texture) => {
        sunMaterial.map = texture;
        sunMaterial.needsUpdate = true;
      },
      undefined,
      () => {
        console.log('Using color for Sun (texture not found)');
      }
    );

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Sun label
    const sunLabel = createLabel('Sol', '#FDB813');
    sunLabel.userData.mesh = sun;
    sunLabel.userData.offset = 25 + 3; // Sun radius + 3
    scene.add(sunLabel);
    labels.set('Sun', sunLabel);

    // Reference date for planet positions (October 10, 2025)
    const referenceDate = new Date('2025-10-10T00:00:00.000Z');

    // Helper function to create planet with orbit
    const createPlanet = (
      body: Astronomy.Body,
      name: string,
      size: number,
      color: number,
      emissiveColor: number,
      orbitColor: number,
      orbitDays: number,
      texturePath?: string
    ) => {
      // Calculate position
      const posEq = Astronomy.HelioVector(body, referenceDate);
      const pos = equatorialToEcliptic(posEq.x, posEq.y, posEq.z);

      // Create orbit path with smooth appearance
      // Use 120 points for all orbits to ensure smoothness (matching ModernSolarSystem)
      const numPoints = 120;
      const step = orbitDays / numPoints; // Calculate step to get exactly 120 points
      const orbitPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= numPoints; i++) {
        const day = i * step;
        const orbitDate = new Date(referenceDate.getTime() + (day * 24 * 60 * 60 * 1000));
        const oposEq = Astronomy.HelioVector(body, orbitDate);
        const opos = equatorialToEcliptic(oposEq.x, oposEq.y, oposEq.z);
        orbitPoints.push(new THREE.Vector3(
          opos.x * SCALE_FACTOR,
          opos.z * SCALE_FACTOR,
          -opos.y * SCALE_FACTOR
        ));
      }
      const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: orbitColor,
        opacity: 0.6, // Increased from 0.2 to match ModernSolarSystem
        transparent: true
      });
      const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
      scene.add(orbit);

      // Create planet with optimized geometry (16 segments = good detail, better performance)
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, // White base so texture shows true colors
        metalness: 0.0,
        roughness: 1.0,
        emissive: emissiveColor,
        emissiveIntensity: 0.15
      });
      const planet = new THREE.Mesh(geometry, material);
      planet.position.set(
        pos.x * SCALE_FACTOR,
        pos.z * SCALE_FACTOR,
        -pos.y * SCALE_FACTOR
      );
      planet.userData.isPlanet = true;
      planet.userData.name = name;
      planet.userData.isTimelineAnimated = true;
      planet.userData.astronomyBody = body; // Store for position updates
      scene.add(planet);

      // Load texture if provided
      if (texturePath) {
        textureLoader.load(
          texturePath,
          (texture) => {
            material.map = texture;
            // Keep subtle emissive glow when texture loads for better visibility
            material.emissive.setHex(emissiveColor);
            material.emissiveIntensity = 0.15; // Subtle glow to enhance visibility
            material.needsUpdate = true;
          },
          undefined,
          (error) => {
            console.warn(`Failed to load ${name} texture`);
            // If texture fails, use the planet's color
            material.color.setHex(color);
            material.emissive.setHex(emissiveColor);
            material.emissiveIntensity = 0.3; // Increased for better visibility
          }
        );
      }

      // Create label for planet
      const colorHex = '#' + orbitColor.toString(16).padStart(6, '0');
      const label = createLabel(name, colorHex);
      label.userData.mesh = planet;
      label.userData.offset = size + 3;
      scene.add(label);
      labels.set(name, label);
    };

    // Add all planets in order from the Sun (including Pluto!)
    createPlanet(Astronomy.Body.Mercury, 'Mercury', 3, 0x888888, 0x555555, 0x888888, 88, '/textures/planets/mercury.jpg');
    createPlanet(Astronomy.Body.Venus, 'Venus', 7, 0xffffff, 0xccaa66, 0xccaa66, 225, '/textures/planets/venus.jpg');
    createPlanet(Astronomy.Body.Earth, 'Earth', 6, 0xffffff, 0x1E90FF, 0x1E90FF, 365, '/textures/planets/earth.jpg');
    createPlanet(Astronomy.Body.Mars, 'Mars', 4, 0xffffff, 0xCD5C5C, 0xCD5C5C, 687, '/textures/planets/mars.jpg');
    createPlanet(Astronomy.Body.Jupiter, 'Jupiter', 20, 0xffffff, 0xcc8844, 0xcc8844, 4333, '/textures/planets/jupiter.jpg');
    createPlanet(Astronomy.Body.Saturn, 'Saturn', 18, 0xffffff, 0xccbb88, 0xccbb88, 10759, '/textures/planets/saturn.jpg');
    createPlanet(Astronomy.Body.Uranus, 'Uranus', 12, 0xffffff, 0x4488cc, 0x4488cc, 30687, '/textures/planets/uranus.jpg');
    createPlanet(Astronomy.Body.Neptune, 'Neptune', 12, 0xffffff, 0x4466cc, 0x4466cc, 60190, '/textures/planets/neptune.jpg');
    createPlanet(Astronomy.Body.Pluto, 'Pluto', 2, 0xffffff, 0x997755, 0x997755, 90560, '/textures/planets/pluto.jpg');

    // Create truly infinite grid using shader (matching ModernSolarSystem)
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
        side: THREE.DoubleSide
      });

      // Large plane for the grid
      const gridGeometry = new THREE.PlaneGeometry(10000, 10000);
      gridGeometry.rotateX(-Math.PI / 2);

      const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
      gridMesh.position.y = 0;

      return gridMesh;
    };

    const gridHelper = createInfiniteGrid();
    gridHelper.visible = showGrid;
    scene.add(gridHelper);

    sceneRef.current = { scene, camera, renderer, labelRenderer, controls, gridHelper };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Smoothly track camera to green 3I/ATLAS position
      const greenAtlas = scene.children.find(
        obj => obj.userData.isPredictionTrail &&
               obj.userData.isTimelineAnimated &&
               obj.userData.epochIndex === 2
      );

      // Keep controls target centered on the comet, but allow user to control camera angle/zoom
      if (greenAtlas) {
        controls.target.lerp(greenAtlas.position, 0.05);
      }

      // Update label positions to follow their meshes
      labels.forEach((label) => {
        if (label.userData.mesh) {
          const mesh = label.userData.mesh as THREE.Object3D;
          label.position.copy(mesh.position);
          label.position.y += label.userData.offset;
        }
      });

      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      labelRenderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Theme change handler
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
      if (scene.background) {
        (scene.background as THREE.Color).setHex(bgColor);
      }
    };

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

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      if (labelRenderer.domElement.parentNode === container) {
        container.removeChild(labelRenderer.domElement);
      }
    };
  }, [showGrid]);

  // Calculate planetary close approaches from epoch data
  useEffect(() => {
    if (!epochsData || epochsData.epochs.length === 0) return;

    // Use the most accurate epoch (last one = October prediction)
    const bestEpoch = epochsData.epochs[epochsData.epochs.length - 1];
    const trail = bestEpoch.trail;

    // Planets to check (excluding Earth and Sun since they have dedicated markers)
    const planets = [
      { name: 'Mercury', body: Astronomy.Body.Mercury, color: '#888888' },
      { name: 'Venus', body: Astronomy.Body.Venus, color: '#ccaa66' },
      { name: 'Mars', body: Astronomy.Body.Mars, color: '#ff6644' },
      { name: 'Jupiter', body: Astronomy.Body.Jupiter, color: '#cc8844' },
      { name: 'Saturn', body: Astronomy.Body.Saturn, color: '#ccbb88' },
      { name: 'Uranus', body: Astronomy.Body.Uranus, color: '#4488cc' },
      { name: 'Neptune', body: Astronomy.Body.Neptune, color: '#4466cc' },
    ];

    const approaches: { planet: string; date: Date; distance: number; color: string }[] = [];

    planets.forEach(({ name, body, color }) => {
      let minDistance = Infinity;
      let closestDate = new Date();

      trail.forEach(point => {
        const date = new Date(point.date);
        // Get planet position at this date
        const planetPosEq = Astronomy.HelioVector(body, date);
        const planetPos = equatorialToEcliptic(planetPosEq.x, planetPosEq.y, planetPosEq.z);

        // Calculate distance from 3I/ATLAS to planet
        const dx = point.x - planetPos.x;
        const dy = point.y - planetPos.y;
        const dz = point.z - planetPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < minDistance) {
          minDistance = distance;
          closestDate = date;
        }
      });

      approaches.push({
        planet: name,
        date: closestDate,
        distance: minDistance,
        color
      });
    });

    setPlanetaryCloseApproaches(approaches);
    console.log('Planetary close approaches:', approaches);
  }, [epochsData]);

  // Render prediction trails
  useEffect(() => {
    if (!sceneRef.current || !epochsData) return;

    const { scene } = sceneRef.current;

    // Remove old prediction trails
    const oldTrails = scene.children.filter(obj => obj.userData.isPredictionTrail);
    oldTrails.forEach(obj => scene.remove(obj));

    // Add each epoch's trail
    epochsData.epochs.forEach((epoch, idx) => {
      const colorConfig = EPOCH_COLORS[idx] || EPOCH_COLORS[0];

      // Create trail line
      const points = epoch.trail.map(point =>
        new THREE.Vector3(
          point.x * SCALE_FACTOR,
          point.z * SCALE_FACTOR,
          -point.y * SCALE_FACTOR
        )
      );

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: colorConfig.color,
        opacity: colorConfig.opacity,
        transparent: true,
        linewidth: 2
      });

      const line = new THREE.Line(geometry, material);
      line.userData.isPredictionTrail = true;
      line.userData.epoch = epoch.epoch_date;
      scene.add(line);

      // Add current position marker with optimized geometry
      const markerGeometry = new THREE.SphereGeometry(3, 12, 12);
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: colorConfig.color,
        opacity: colorConfig.opacity + 0.2,
        transparent: true
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(
        epoch.current.x * SCALE_FACTOR,
        epoch.current.z * SCALE_FACTOR,
        -epoch.current.y * SCALE_FACTOR
      );
      marker.userData.isPredictionTrail = true;
      marker.userData.isTimelineAnimated = true; // Mark for timeline animation
      marker.userData.epochIndex = idx; // Store which epoch this is
      marker.userData.trailData = epoch.trail; // Store trail data for timeline lookups
      scene.add(marker);

      // Find perihelion point (closest to Sun) in this epoch's trail
      const perihelionPoint = epoch.trail.reduce((closest, point) => {
        const closestDist = Math.sqrt(closest.x ** 2 + closest.y ** 2 + closest.z ** 2);
        const currentDist = Math.sqrt(point.x ** 2 + point.y ** 2 + point.z ** 2);
        return currentDist < closestDist ? point : closest;
      });

      // Create perihelion crosshair reticle
      const perihelionX = perihelionPoint.x * SCALE_FACTOR;
      const perihelionY = perihelionPoint.z * SCALE_FACTOR;
      const perihelionZ = -perihelionPoint.y * SCALE_FACTOR;

      const reticleLength = 8;
      const reticleMaterial = new THREE.LineBasicMaterial({
        color: colorConfig.color,
        opacity: colorConfig.opacity * 0.8,
        transparent: true,
        linewidth: 2
      });

      // Vertical line
      const verticalGeometry = new THREE.BufferGeometry();
      const verticalVertices = new Float32Array([
        perihelionX, perihelionY - reticleLength, perihelionZ,
        perihelionX, perihelionY + reticleLength, perihelionZ
      ]);
      verticalGeometry.setAttribute('position', new THREE.BufferAttribute(verticalVertices, 3));
      const verticalLine = new THREE.Line(verticalGeometry, reticleMaterial);
      verticalLine.userData.isPredictionTrail = true;
      scene.add(verticalLine);

      // Horizontal X line
      const horizontalXGeometry = new THREE.BufferGeometry();
      const horizontalXVertices = new Float32Array([
        perihelionX - reticleLength, perihelionY, perihelionZ,
        perihelionX + reticleLength, perihelionY, perihelionZ
      ]);
      horizontalXGeometry.setAttribute('position', new THREE.BufferAttribute(horizontalXVertices, 3));
      const horizontalXLine = new THREE.Line(horizontalXGeometry, reticleMaterial);
      horizontalXLine.userData.isPredictionTrail = true;
      scene.add(horizontalXLine);

      // Horizontal Z line
      const horizontalZGeometry = new THREE.BufferGeometry();
      const horizontalZVertices = new Float32Array([
        perihelionX, perihelionY, perihelionZ - reticleLength,
        perihelionX, perihelionY, perihelionZ + reticleLength
      ]);
      horizontalZGeometry.setAttribute('position', new THREE.BufferAttribute(horizontalZVertices, 3));
      const horizontalZLine = new THREE.Line(horizontalZGeometry, reticleMaterial);
      horizontalZLine.userData.isPredictionTrail = true;
      scene.add(horizontalZLine);

      console.log(`Added perihelion marker for ${epoch.epoch_date} at (${perihelionX.toFixed(1)}, ${perihelionY.toFixed(1)}, ${perihelionZ.toFixed(1)})`);
    });

    console.log(`Rendered ${epochsData.epochs.length} prediction epochs with perihelion markers`);
  }, [epochsData]);

  // Update grid visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.gridHelper.visible = showGrid;
  }, [showGrid]);

  // Update positions when timeline changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, camera, controls } = sceneRef.current;

    // Find all timeline-animated objects
    const animatedObjects = scene.children.filter(obj => obj.userData.isTimelineAnimated);

    let greenAtlasPosition: THREE.Vector3 | null = null;

    animatedObjects.forEach(obj => {
      if (obj.userData.astronomyBody) {
        // Generic planet position calculation using astronomy-engine
        const body = obj.userData.astronomyBody as Astronomy.Body;
        const posEq = Astronomy.HelioVector(body, timelineDate);
        const pos = equatorialToEcliptic(posEq.x, posEq.y, posEq.z);
        obj.position.set(
          pos.x * SCALE_FACTOR,
          pos.z * SCALE_FACTOR,
          -pos.y * SCALE_FACTOR
        );
      } else if (obj.userData.name === 'Earth') {
        // Earth position (kept for backwards compatibility)
        const earthPosEq = Astronomy.HelioVector(Astronomy.Body.Earth, timelineDate);
        const earthPos = equatorialToEcliptic(earthPosEq.x, earthPosEq.y, earthPosEq.z);
        obj.position.set(
          earthPos.x * SCALE_FACTOR,
          earthPos.z * SCALE_FACTOR,
          -earthPos.y * SCALE_FACTOR
        );
      } else if (obj.userData.name === 'Mars') {
        // Mars position (kept for backwards compatibility)
        const marsPosEq = Astronomy.HelioVector(Astronomy.Body.Mars, timelineDate);
        const marsPos = equatorialToEcliptic(marsPosEq.x, marsPosEq.y, marsPosEq.z);
        obj.position.set(
          marsPos.x * SCALE_FACTOR,
          marsPos.z * SCALE_FACTOR,
          -marsPos.y * SCALE_FACTOR
        );
      } else if (obj.userData.isPredictionTrail && obj.userData.trailData && obj.userData.isTimelineAnimated) {
        // Only update markers (spheres), not trail lines
        // Interpolate between trail points for smooth animation
        const trail = obj.userData.trailData;
        const targetTime = timelineDate.getTime();

        // Find the two points that bracket the current timeline date
        let beforePoint = trail[0];
        let afterPoint = trail[trail.length - 1];

        for (let i = 0; i < trail.length - 1; i++) {
          const currTime = new Date(trail[i].date).getTime();
          const nextTime = new Date(trail[i + 1].date).getTime();

          if (currTime <= targetTime && targetTime <= nextTime) {
            beforePoint = trail[i];
            afterPoint = trail[i + 1];
            break;
          }
        }

        // Calculate interpolation factor (0 to 1)
        const beforeTime = new Date(beforePoint.date).getTime();
        const afterTime = new Date(afterPoint.date).getTime();
        const timeDiff = afterTime - beforeTime;
        const t = timeDiff > 0 ? (targetTime - beforeTime) / timeDiff : 0;

        // Linearly interpolate position between the two points
        const x = beforePoint.x + (afterPoint.x - beforePoint.x) * t;
        const y = beforePoint.y + (afterPoint.y - beforePoint.y) * t;
        const z = beforePoint.z + (afterPoint.z - beforePoint.z) * t;

        const newPos = new THREE.Vector3(
          x * SCALE_FACTOR,
          z * SCALE_FACTOR,
          -y * SCALE_FACTOR
        );
        obj.position.copy(newPos);

        // Track only the green (most accurate) prediction (for potential future use)
        if (obj.userData.epochIndex === 2) {
          greenAtlasPosition = newPos.clone();
        }
      }
    });

    // Camera is now manually controlled - no automatic repositioning
  }, [timelineDate]);

  // Animation loop for playing timeline
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const deltaTime = now - lastTime;

      // Only update every ~100ms for slower, smoother animation (5x slower than before)
      if (deltaTime >= 100) {
        lastTime = now;

        setTimelineDate(prev => {
          const next = new Date(prev.getTime() + 0.4 * 24 * 60 * 60 * 1000); // 0.4 days per frame (5x slower than 2 days)
          if (next >= timelineEnd) {
            setIsPlaying(false); // Stop when reaching the end
            return prev; // Stay at current position, don't jump to end
          }
          return next;
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, timelineEnd]);

  return (
    <div className="max-w-5xl mx-auto bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden">
      {/* Compact Header */}
      <div className="bg-[var(--color-bg-primary)] p-3 border-b border-[var(--color-border-primary)]">
        <div className="flex flex-col gap-3 text-sm">
          {/* Title and Date */}
          <div className="flex items-center justify-center gap-3">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Multi-Epoch Trajectory Comparison</h3>
            <span className="text-[var(--color-text-tertiary)] text-xs">
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
              <span className="text-[var(--color-text-secondary)] text-xs">Grid</span>
            </label>

            {/* Timeline Controls Group */}
            <div className="flex items-center gap-2 border-l border-[var(--color-border-primary)] pl-3">
              {/* Timeline Date Display */}
              <span className="text-[var(--color-text-primary)] text-xs font-mono">
                {timelineDate.toISOString().split('T')[0]}
              </span>

              {/* Play/Pause */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>

              {/* Stop - just pauses, doesn't reset */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                }}
                className="px-3 py-1.5 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-primary)] border border-red-500/50 text-red-400 hover:text-red-300 rounded text-xs font-medium transition-colors"
              >
                ⏹ Stop
              </button>

              {/* Today (replaces Reset) */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setTimelineDate(new Date());
                }}
                className="px-3 py-1.5 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded text-xs font-medium transition-colors"
              >
                Today
              </button>
            </div>

            {/* Prediction Epochs Legend - Compact */}
            <div className="flex items-center gap-2 border-l border-[var(--color-border-primary)] pl-3">
              {epochsData.epochs.map((epoch, idx) => {
                const colorConfig = EPOCH_COLORS[idx] || EPOCH_COLORS[0];
                return (
                  <div key={epoch.epoch_date} className="flex items-center gap-1 text-xs">
                    <div
                      className="w-4 h-0.5"
                      style={{
                        backgroundColor: `#${colorConfig.color.toString(16).padStart(6, '0')}`,
                        opacity: colorConfig.opacity
                      }}
                    />
                    <span className="text-[var(--color-text-tertiary)]">
                      {epoch.epoch_date.split('-')[1]}/{epoch.epoch_date.split('-')[2]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div className="text-xs text-[var(--color-text-tertiary)] mt-1.5">
          3 prediction epochs showing orbital refinement • Drag to rotate • Scroll to zoom
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-[var(--color-bg-primary)] relative"
        style={{ height: `${containerHeight}px` }}
      >
        {/* Interactive Overlay - Shows hint on first visit */}
        <ThreeDInteractiveOverlay
          overlayId="prediction-accuracy-viz"
          desktopMessage="Click and drag to explore predictions!"
          mobileMessage="Touch and drag to explore predictions!"
        />

        {/* Timeline Slider - Overlay on 3D canvas */}
        <div className="absolute bottom-4 left-4 right-4 bg-[var(--color-bg-secondary)]/95 backdrop-blur-sm rounded-lg p-3 border border-[var(--color-border-primary)] z-10">

        {/* Timeline Slider */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="range"
              min={timelineStart.getTime()}
              max={timelineEnd.getTime()}
              value={timelineDate.getTime()}
              onChange={(e) => {
                setIsPlaying(false);
                let newDate = new Date(parseInt(e.target.value));

                // Snap to important dates when within 3 days
                const snapThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
                const milestones = [
                  discoveryDate,
                  perihelionDate,
                  closestApproachEarth,
                  ...planetaryCloseApproaches.map(a => a.date)
                ];

                for (const milestone of milestones) {
                  if (Math.abs(newDate.getTime() - milestone.getTime()) < snapThreshold) {
                    newDate = milestone;
                    break;
                  }
                }

                setTimelineDate(newDate);
              }}
              className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-accent-primary)] relative z-20"
              style={{
                position: 'relative',
                zIndex: 20
              }}
            />

            {/* Milestone Markers - Below slider */}
            {/* Discovery Date */}
            <div
              className="absolute top-0 w-1 h-3 bg-yellow-400 pointer-events-none z-10"
              style={{
                left: `${((discoveryDate.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100}%`,
              }}
              title="Discovery: June 14, 2025"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 text-xs">
                🔭
              </div>
            </div>

            {/* Perihelion (Sun) */}
            <div
              className="absolute top-0 w-1 h-3 bg-orange-400 pointer-events-none z-10"
              style={{
                left: `${((perihelionDate.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100}%`,
              }}
              title="Perihelion: Oct 29, 2025 (Closest to Sun)"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-orange-400 text-xs">
                ☀️
              </div>
            </div>

            {/* Earth Close Approach */}
            <div
              className="absolute top-0 w-1 h-3 bg-blue-400 pointer-events-none z-10"
              style={{
                left: `${((closestApproachEarth.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100}%`,
              }}
              title="Closest to Earth: Dec 19, 2025 (1.798 AU)"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-blue-400 text-xs">
                🌍
              </div>
            </div>

            {/* Planetary Close Approaches */}
            {planetaryCloseApproaches.map((approach, idx) => (
              <div
                key={approach.planet}
                className="absolute top-0 w-1 h-3 pointer-events-none z-10"
                style={{
                  left: `${((approach.date.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100}%`,
                  backgroundColor: '#4a5568', // Default gray color for approaches
                }}
                title={`Closest to ${approach.planet}: ${approach.date.toISOString().split('T')[0]} (${(approach.distance).toFixed(3)} AU)`}
              />
            ))}
          </div>

          {/* Centered Event Label */}
          <div className="text-center min-h-[20px]">
            {(() => {
              const threshold = 2 * 24 * 60 * 60 * 1000; // 2 days threshold
              const currentTime = timelineDate.getTime();

              if (Math.abs(currentTime - discoveryDate.getTime()) < threshold) {
                return (
                  <span className="text-xs font-semibold" style={{
                    color: '#facc15',
                    textShadow: '0 0 8px rgba(250, 204, 21, 0.6)'
                  }}>
                    Discovery (June 14, 2025)
                  </span>
                );
              }

              if (Math.abs(currentTime - perihelionDate.getTime()) < threshold) {
                return (
                  <span className="text-xs font-semibold" style={{
                    color: '#fb923c',
                    textShadow: '0 0 8px rgba(251, 146, 60, 0.6)'
                  }}>
                    Perihelion - Closest to Sun (Oct 29, 2025)
                  </span>
                );
              }

              if (Math.abs(currentTime - closestApproachEarth.getTime()) < threshold) {
                return (
                  <span className="text-xs font-semibold" style={{
                    color: '#60a5fa',
                    textShadow: '0 0 8px rgba(96, 165, 250, 0.6)'
                  }}>
                    Closest to Earth (Dec 19, 2025 • 1.798 AU)
                  </span>
                );
              }

              // Check planetary approaches
              for (const approach of planetaryCloseApproaches) {
                if (Math.abs(currentTime - approach.date.getTime()) < threshold) {
                  return (
                    <span className="text-xs font-semibold" style={{
                      color: '#4a5568',
                      textShadow: `0 0 8px #4a556899`
                    }}>
                      Closest to {approach.planet} ({approach.date.toISOString().split('T')[0]} • {approach.distance.toFixed(2)} AU)
                    </span>
                  );
                }
              }

              return <span className="text-xs text-[var(--color-text-tertiary)]">&nbsp;</span>;
            })()}
          </div>

          <div className="flex justify-between text-xs text-[var(--color-text-tertiary)]">
            <span>Jun 2025 (Discovery)</span>
            <span>May 2, 2026 (Post-Perihelion)</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
