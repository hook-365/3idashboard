# Solar System Visualization Components

## ModernSolarSystem.tsx

Modern 3D WebGL solar system visualization using Three.js (0.87.1), built specifically for Next.js 14+ with React.

### Features

- **Real Orbital Mechanics**: Uses actual orbital elements from NASA/JPL
- **All Major Bodies**: Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- **3I/ATLAS Comet**: Hyperbolic interstellar trajectory visualization
- **Interactive Controls**: Mouse drag to rotate, scroll to zoom
- **Time Controls**: Animate orbits at various speeds (0.1x to 30x)
- **Jump to Perihelion**: Instantly view Oct 30, 2025 configuration

### Usage

```tsx
import ModernSolarSystem from '@/components/visualization/ModernSolarSystem';

export default function Page() {
  return <ModernSolarSystem />;
}
```

### Technical Details

**Orbital Calculations**: `/src/lib/orbital-mechanics.ts`
- Kepler's equation solver for elliptical orbits
- Hyperbolic orbit solver for interstellar comets
- Julian date conversions
- 3D position calculations from orbital elements

**Celestial Body Data**: `/src/lib/celestial-bodies.ts`
- Orbital elements (semi-major axis, eccentricity, inclination, etc.)
- Physical properties (mass, radius, color)
- Time-varying elements (daily/century variations)

**Three.js Version**: 0.87.1 (compatible with legacy codebase)
- No react-three-fiber dependency needed
- Direct Three.js API usage
- Efficient geometry updates

### Orbital Element Sources

- **Planets**: NASA/JPL DE431 ephemeris (meeus algorithm)
- **3I/ATLAS**: JPL Horizons SBDB (hyperbolic elements at perihelion epoch)

### Performance

- 60 FPS animation loop
- 5000-star background
- Efficient orbit path generation
- Responsive canvas resizing

### Controls

| Action | Input |
|--------|-------|
| Rotate View | Click + Drag |
| Zoom | Mouse Wheel |
| Pause/Resume | Pause Button |
| Speed Control | Speed buttons (0.1x - 30x) |
| Jump to Perihelion | "Go to Perihelion" button |
| Reset | "Reset to Today" button |

### Component Structure

```
ModernSolarSystem/
├── Scene Setup (Three.js WebGL)
├── Camera (Perspective, top-down angled view)
├── Lighting (Ambient + Point light at Sun)
├── Star Field (5000 random points)
├── Celestial Bodies
│   ├── Mesh creation (SphereGeometry)
│   ├── Materials (Phong with color/emissive)
│   └── Orbit paths (Line geometry)
├── Time System
│   ├── Current date state
│   ├── Animation loop
│   └── Speed multiplier
└── Controls
    ├── Mouse interaction
    └── UI buttons
```

### Integration with 3I Dashboard

Used in `/src/app/analytics/page.tsx` to display real-time solar system configuration during comet tracking.

### Future Enhancements

- [ ] Upgrade to modern Three.js (r150+)
- [ ] Add react-three-fiber for better React integration
- [ ] VSOP87 high-precision planet positions
- [ ] Orbital trail fade animation
- [ ] Label rendering for planet names
- [ ] Camera focus modes (follow comet, heliocentric, geocentric)
- [ ] Date picker for specific date viewing
- [ ] Screenshot/export functionality

---

## Legacy Components

### JSOrreryVisualization.tsx

**Status**: ⚠️ Deprecated - Build errors with modern webpack

Original jsOrrery integration attempt. Not compatible with Next.js 15 due to:
- Deprecated three.js modules (three.Projector, three.OrbitControls)
- webpack 2 browser field aliases
- jQuery dependencies

Use `ModernSolarSystem.tsx` instead.