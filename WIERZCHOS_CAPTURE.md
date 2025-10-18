# C/2024 E1 (Wierzchos) - Orbital Capture Phenomenon

## Summary

Comet C/2024 E1 (Wierzchos) is experiencing a **rare orbital capture** event where planetary gravitational perturbations are converting its initially hyperbolic trajectory into an elliptical orbit bound to the solar system.

## Eccentricity Evolution (JPL Horizons Data)

| Date | Eccentricity | Orbit Type | Status |
|------|--------------|------------|--------|
| 2026-Jan-20 (perihelion) | 1.000056 | Hyperbolic | Initially unbound |
| 2027-Jan-20 | 1.000153 | Hyperbolic | Still escaping |
| **2028-Jan-20** | **0.999969** | **Elliptical** | **Captured!** |
| 2029-Jan-20 | 0.999892 | Elliptical | Remains bound |

**Source**: [JPL Horizons](https://ssd.jpl.nasa.gov/horizons_batch.cgi?batch=1&COMMAND=%272024+E1%27&TABLE_TYPE=%27ELEMENTS%27&START_TIME=%272026-01-20%27&STOP_TIME=%272030-01-01%27&STEP_SIZE=%271%20year%27&CENTER=%27@Sun%27&OUT_UNITS=%27AU-D%27)

## Physical Mechanism

### Planetary Perturbations
- Jupiter and Saturn's gravitational influence during perihelion passage (0.57 AU)
- Gradual energy loss converts hyperbolic (escape) trajectory to elliptical (bound)
- **Transition point**: ~2 years after perihelion (by Jan 2028)

### Orbital Elements at Perihelion (2026-01-20)
- **Eccentricity (e)**: 1.00004883 (barely hyperbolic)
- **Perihelion distance (q)**: 0.57 AU
- **Inclination (i)**: 75.24°
- **Semi-major axis (a)**: -11,588 AU (negative = hyperbolic)

### Post-Capture Orbit (~2028)
- **Eccentricity (e)**: 0.999969 (near-parabolic ellipse)
- **Orbital period**: ~697 years (estimated from a ≈ 85 AU)
- **Aphelion**: ~170 AU (far beyond Neptune's orbit)
- **Status**: New member of long-period comet family

## Significance

### Scientific Interest
1. **Rare observation**: Few comets have been tracked through capture transition
2. **Natural laboratory**: Study planetary perturbation effects in real-time
3. **Solar system formation**: Demonstrates how Oort Cloud may have formed from captured objects

### Comparison to Other Comets

| Comet | Initial e | Final State | Mechanism |
|-------|----------|-------------|-----------|
| **Wierzchos (2024 E1)** | 1.00005 | **Captured → elliptical** | **Planetary perturbations** |
| K1 ATLAS (2025 K1) | 1.00153 | Escapes (e>1) | Too fast to capture |
| 3I/ATLAS (2025 N1) | 6.14 | Escapes (interstellar) | Far too fast |
| SWAN (2025 R2) | 0.99937 | Remains elliptical | Already bound |
| Lemmon (2025 A6) | 0.99576 | Remains elliptical | Already bound |

## Dashboard Implementation

### Updated Descriptions
- **Status**: "Will be captured by planetary perturbations (e drops <1 by 2028)"
- **Orbital type**: "Initially hyperbolic, transitions to elliptical"
- **Page header**: "Features two escaping comets, two near-parabolic visitors, and one being captured!"

### Trajectory Visualization
The expanded date range (±2 years around perihelion) will show:
1. **Pre-perihelion approach** (hyperbolic phase)
2. **Perihelion passage** (Jan 20, 2026 at 0.57 AU)
3. **Post-perihelion departure** (transition to elliptical by 2028)

### Educational Value
- Demonstrates that eccentricity is not constant
- Shows real-time effects of N-body gravitational dynamics
- Highlights difference between osculating elements (instantaneous) and long-term evolution

## References

1. **JPL Small-Body Database Browser** - C/2024 E1 (Wierzchos)
   - [Orbital Elements](https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2024%20E1)

2. **JPL Horizons System** - Time-variable orbital elements
   - [2026-2030 Evolution](https://ssd.jpl.nasa.gov/horizons_batch.cgi?batch=1&COMMAND=%272024+E1%27)

3. **TheSkyLive** - Current position and finder charts
   - [Live tracking](https://theskylive.com/c2024e1-info)

## Technical Notes

### Osculating vs Mean Elements
- **Osculating elements**: Instantaneous orbital parameters (what JPL Horizons provides)
- **Mean elements**: Long-term averaged orbit (removes short-term perturbations)
- Wierzchos's eccentricity fluctuates due to Jupiter/Saturn encounters
- The e < 1.0 transition represents a **permanent change** in orbital energy

### Visualization Challenges
- Near-parabolic orbits have aphelia far beyond visualization range (50 AU cutoff)
- The extended dayRange (730 days) shows the **visible portion** near perihelion
- Full orbit period (~700 years) makes complete orbit impractical to display

---

*Last Updated: Based on JPL Horizons data through 2030*
*Status: ✅ Dashboard updated with capture information - October 2025*
