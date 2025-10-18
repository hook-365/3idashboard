# 3I/ATLAS Comet Dashboard

Real-time tracking dashboard for interstellar comet 3I/ATLAS - perihelion October 30, 2025.

## Quick Start

```bash
# Development (port 3020)
PORT=3020 npm run dev

# Production
npm run build && npm run start

# Docker
docker-compose up -d --build
```

## Working with Claude

**IMPORTANT - Context Window Management:**
- **DO NOT** automatically start/restart the dev server using Bash commands
- **ALWAYS** prompt the user to manually start/restart the server instead
- This saves significant context window usage (dev server output is verbose)
- User will manage the server and confirm when it's running
- Only check server status if explicitly requested by user

## Tech Stack

- **Frontend**: Next.js 15.5 App Router, TypeScript, Tailwind CSS
- **3D**: Three.js with astronomy-engine for orbital mechanics
- **Charts**: Chart.js with real-time data visualization
- **Data**: Multi-source (COBS, NASA/JPL Horizons, TheSkyLive)
- **Infrastructure**: Pino logging, Zod validation, Docker

## Pages

- `/` - Overview dashboard with mission summary
- `/details` - Scientific analysis with 3D orbital visualization
- `/observations` - Real-time observation data table
- `/observers` - Observer network statistics
- `/gallery` - Photo gallery
- `/about` - Data disclaimer and limitations

## API Endpoints

### Core Data
- `/api/comet-data` - Aggregated comet data (cache: 5 min)
  - Parameters: `smooth`, `predict`, `limit`, `refresh`
- `/api/observations` - Raw COBS observations
- `/api/observers` - Observer network info

### Analytics
- `/api/simple-activity` - Physics-based activity levels
- `/api/velocity` - Multi-type velocity analysis
  - Types: `brightness`, `coma`, `distance`, `activity`, `observer`
- `/api/trend-analysis` - Statistical trend modeling
- `/api/solar-system-position` - 3D orbital positions

## Data Sources

- **COBS** (Primary): Global observation network, 5-min refresh
  - License: CC BY-NC-SA 4.0
  - Attribution: "Data courtesy of COBS (Comet Observation Database)"
- **NASA/JPL Horizons**: Orbital mechanics, ephemeris data
- **TheSkyLive**: Real-time coordinates

## Configuration

**Analytics Date Range** (`src/utils/analytics-config.ts`):
```typescript
ANALYTICS_DATE_CONFIG = {
  START_DATE: '2025-07-01T00:00:00.000Z',
  PERIHELION_DATE: '2025-10-30T00:00:00.000Z',
  END_DATE: '2025-12-31T23:59:59.999Z'
}
```

## Data Quality

- **Real data only** - No hardcoded fallbacks (shows "N/A" when unavailable)
- **Latest magnitude** - Calculated from most recent COBS observations
- **Median-based aggregation** - Reduces observer bias
- **UTC timestamps** - All dates display in UTC per astronomical convention

## Key Files

- `src/components/visualization/ModernSolarSystem.tsx` - 3D visualization
- `src/lib/data-sources/source-manager.ts` - Multi-source integration
- `src/lib/orbital-calculations.ts` - Orbital mechanics utilities
- `src/lib/planet-positions.ts` - Astronomy-engine wrappers
- `src/components/charts/` - Chart components
- `src/utils/analytics-config.ts` - Date range configuration
