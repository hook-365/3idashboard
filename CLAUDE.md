# 3I/ATLAS Comet Dashboard

Real-time tracking dashboard for interstellar comet 3I/ATLAS - reaching perihelion October 30, 2025.

## Quick Start

```bash
# Development server (port 3020)
PORT=3020 npm run dev

# Production build
npm run build && npm run start

# Docker development
npm run docker:dev
```

**Current Dev Server:** http://localhost:3020

## Tech Stack

- **Frontend**: Next.js 14+ App Router, TypeScript, Tailwind CSS
- **Charts**: Chart.js with real-time data visualization
- **3D Visualization**: Three.js for solar system positioning and orbital mechanics
- **Data**: Multi-source integration (COBS, NASA/JPL, TheSkyLive)
- **Performance**: Request deduplication, structured logging (Pino), input validation (Zod)
- **Security**: HSTS, CORS, input validation, security headers
- **Development**: Docker containerized

## Pages

- **`/`** - Overview dashboard with mission summary
- **`/analytics`** - Scientific visualizations with 3D solar system view
  - Interactive Three.js 3D orbital visualization
  - Infinite grid shader-based ecliptic plane
  - Real-time planet positions from astronomy-engine
  - Comet trajectory with past trail and future projection
  - Compact perihelion crosshair marker
- **`/observations`** - Real-time observation data table
- **`/observers`** - Observer network performance
- **`/gallery`** - Photo gallery

## API Endpoints

### Core Data
- **`/api/comet-data`** - Primary aggregated comet data
  - Parameters: `smooth=true`, `predict=true`, `limit=500`
  - Returns: Complete comet dataset with observations, stats, light curve
  - Cache: 5-minute TTL

- **`/api/observations`** - Raw COBS observation records
  - Returns: Individual observations with observer details

- **`/api/observers`** - Observer network information
  - Returns: Observer statistics, locations, contribution metrics

### Analytics
- **`/api/simple-activity`** - Physics-based activity levels
  - Returns: Daily activity analysis with confidence scoring

- **`/api/velocity`** - Multi-type velocity analysis
  - Parameters: `type=brightness|coma|distance|activity|observer`
  - Returns: Change rate calculations with uncertainty

- **`/api/trend-analysis`** - Advanced trend detection
  - Returns: Statistical trend modeling with predictions

### Specialized
- **`/api/solar-system-position`** - Orbital position data
- **`/api/gallery-images`** - Photo gallery management

## Data Sources

**COBS API** (Primary): Real observation data from global network
- Live brightness, coma, and observer data
- Rate limited: 500 observations per request
- License: CC BY-NC-SA 4.0

**NASA/JPL Horizons**: Orbital mechanics and ephemeris data
**TheSkyLive**: Real-time coordinates and observational data

## Key Features

### Data Integrity
- **Real Data Only**: No fabricated fallbacks - shows "N/A" when unavailable
- **Latest Magnitude**: Calculated from most recent COBS observations
- **Robust Statistics**: Median-based averaging with MAD uncertainty

### Analytics Features
- **Perihelion Lines**: Consistent Oct 30, 2025 markers across all charts
- **Velocity Analysis**: Complete suite tracking brightness, coma, orbital changes
- **Activity Levels**: Physics-based activity detection
- **Date Ranges**: Standardized July 1 - December 31, 2025

### Chart Components
- `VelocityChart.tsx` - Multi-purpose velocity analysis
- `ActivityLevelChart.tsx` - Combined activity index with real-time updates
- `OrbitalVelocityChart.tsx` - Heliocentric/geocentric velocity tracking
- All charts include perihelion markers and consistent scaling

## Configuration

**Analytics Config** (`/src/utils/analytics-config.ts`):
```typescript
ANALYTICS_DATE_CONFIG = {
  START_DATE: '2025-07-01T00:00:00.000Z',
  PERIHELION_DATE: '2025-10-30T00:00:00.000Z',
  END_DATE: '2025-12-31T23:59:59.999Z'
}
```

## Data Quality Standards

- **calculateLatestMagnitude()**: Uses real COBS observations, never hardcoded values
- **Daily Aggregation**: Median-based to reduce observer bias
- **Error Handling**: Returns 0/null for missing data (displays as "N/A")
- **HTML Entity Fixes**: Proper display of measurement units (", ')

## Development Notes

### Recent Updates (September 2025)

#### 3D Visualization (Latest)
- ✅ Interactive Three.js solar system visualization on `/analytics`
- ✅ Infinite grid using shader-based procedural generation
- ✅ Real-time planet positions using astronomy-engine (JPL ephemeris)
- ✅ Comet orbital trail (backward integration) and projection (forward integration)
- ✅ Compact perihelion crosshair marker (8 units, equal arms)
- ✅ Labels positioned close to celestial bodies (3 unit offset)
- ✅ Sun labeled as "Sol"

#### Performance & Infrastructure
- ✅ Request deduplication to prevent duplicate API calls
- ✅ Structured logging with Pino (production-ready)
- ✅ Input validation with Zod schemas
- ✅ Enhanced persistent cache with expiration and versioning
- ✅ Security headers (HSTS, X-Frame-Options, CSP, CORS)
- ✅ React error boundaries for graceful failure handling
- ✅ API handler wrapper with validation and logging
- ✅ See `OPTIMIZATION_IMPLEMENTATION.md` for full details

#### Data Quality
- ✅ Removed all hardcoded magnitude fallbacks
- ✅ Fixed HTML entity encoding in observations table
- ✅ Added perihelion lines to all analytics charts
- ✅ Implemented real data-only policy

### Critical Files
- `src/components/visualization/ModernSolarSystem.tsx` - 3D visualization with Three.js
- `src/lib/data-sources/source-manager.ts` - Multi-source data integration
- `src/lib/logger.ts` - Structured logging utilities
- `src/lib/api/api-handler.ts` - API route wrapper
- `src/app/observations/page.tsx` - Main observation data display
- `src/components/charts/` - All chart visualization components

## COBS Data Compliance

Data attribution: "Data courtesy of COBS (Comet Observation Database)"
License: CC BY-NC-SA 4.0 - Non-commercial use with proper attribution