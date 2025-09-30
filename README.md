# 3I/ATLAS Comet Dashboard

> Real-time tracking dashboard for interstellar comet 3I/ATLAS, approaching perihelion on **October 30, 2025**.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-3iatlas.hook.technology-blue)](https://3iatlas.hook.technology)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A comprehensive, production-ready dashboard for tracking the interstellar comet 3I/ATLAS with real-time observational data, 3D orbital visualization, and scientific analysis tools.

## Features

### 🌌 3D Solar System Visualization
- Interactive Three.js orbital mechanics simulation
- Real-time planet positions using astronomy-engine (JPL ephemeris)
- Infinite shader-based ecliptic plane grid
- Comet trajectory with historical trail and future projection
- Compact perihelion crosshair markers

### 📊 Scientific Analysis
- **Velocity Tracking**: Multi-type velocity analysis (brightness, coma, orbital, distance)
- **Activity Levels**: Physics-based activity detection with confidence scoring
- **Trend Analysis**: Statistical trend modeling with predictions
- **Light Curves**: Multi-filter photometric observations
- **Orbital Mechanics**: Heliocentric and geocentric velocity tracking

### 🔭 Observer Network
- Global observation data from COBS (Comet Observation Database)
- Real-time observer contribution metrics
- Geographic distribution tracking
- Quality ratings and filtering

### 📱 Modern UX
- Responsive design with mobile-optimized navigation
- Real-time data updates with error boundaries
- Extension-safe chart rendering
- Dark theme optimized for astronomy

### 🛡️ Production-Ready
- Request deduplication to prevent duplicate API calls
- Structured logging with Pino
- Input validation with Zod schemas
- Security headers (HSTS, CSP, CORS)
- Persistent caching with expiration
- Docker containerized deployment

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (optional, for containerized deployment)

### Development

```bash
# Clone the repository
git clone https://github.com/hook-365/3idashboard.git
cd 3idashboard

# Install dependencies
npm install

# Start development server on port 3020
PORT=3020 npm run dev

# Open http://localhost:3020
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Docker Deployment

```bash
# Build and start container on port 3000
docker-compose up -d --build

# View logs
docker logs 3idashboard_web_1

# Stop container
docker-compose down
```

## Tech Stack

### Frontend
- **Next.js 15.5.4** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Three.js** - 3D orbital visualization
- **Chart.js** - Scientific data visualization
- **Lucide React** - Icon system

### Data Sources
- **COBS API** - Primary observation data (CC BY-NC-SA 4.0)
- **NASA/JPL Horizons** - Orbital mechanics and ephemeris
- **TheSkyLive** - Real-time coordinates
- **astronomy-engine** - JPL ephemeris calculations

### Infrastructure
- **Pino** - Structured JSON logging
- **Zod** - Schema validation
- **Docker** - Containerization
- **nginx** - Reverse proxy

## Project Structure

```
3idashboard/
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── page.tsx            # Overview dashboard
│   │   ├── details/            # Scientific analysis page
│   │   ├── observations/       # Observation data table
│   │   ├── observers/          # Observer network
│   │   ├── gallery/            # Photo gallery
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── charts/             # Visualization components
│   │   ├── visualization/      # 3D solar system
│   │   └── common/             # Shared UI components
│   ├── lib/
│   │   ├── data-sources/       # Multi-source integration
│   │   ├── orbital-calculations.ts
│   │   ├── planet-positions.ts
│   │   └── logger.ts
│   ├── utils/                  # Configuration and helpers
│   └── types/                  # TypeScript definitions
├── public/
│   └── textures/               # Planet textures
├── Dockerfile
├── docker-compose.yml
└── CLAUDE.md                   # Development documentation
```

## API Endpoints

### Core Data
- `GET /api/comet-data` - Aggregated comet data
- `GET /api/observations` - Raw COBS observations
- `GET /api/observers` - Observer network info

### Analytics
- `GET /api/simple-activity` - Activity level analysis
- `GET /api/velocity` - Multi-type velocity tracking
- `GET /api/trend-analysis` - Statistical trends
- `GET /api/solar-system-position` - Orbital positions

See [CLAUDE.md](./CLAUDE.md) for complete API documentation.

## Configuration

### Analytics Date Range
Edit `src/utils/analytics-config.ts`:
```typescript
ANALYTICS_DATE_CONFIG = {
  START_DATE: '2025-07-01T00:00:00.000Z',
  PERIHELION_DATE: '2025-10-30T00:00:00.000Z',
  END_DATE: '2025-12-31T23:59:59.999Z'
}
```

### Data Sources
The dashboard uses real observational data:
- Latest magnitude calculated from recent COBS observations
- No hardcoded fallbacks - shows "N/A" when data unavailable
- Median-based daily aggregation to reduce observer bias

## Development

### Code Quality
```bash
# Run linter
npm run lint

# Type checking
npm run build  # TypeScript compilation included
```

### Recent Optimizations
- ✅ Reduced ESLint warnings from 97 to 47 (51% reduction)
- ✅ Extracted 575 lines from oversized files
- ✅ Created shared chart utilities (eliminated ~45 lines duplication)
- ✅ Refactored orbital calculations to dedicated modules
- ✅ Mobile-optimized navigation
- ✅ Fixed Docker cache permissions

See commit history for detailed changes.

## Data Attribution

Observational data provided by the **COBS (Comet Observation Database)**.

**License**: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
**Attribution**: "Data courtesy of COBS (Comet Observation Database)"
**Usage**: Non-commercial use with proper attribution

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Follow existing code style
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- COBS network for observational data
- NASA/JPL for orbital mechanics data
- TheSkyLive for real-time coordinates
- Global observer community for contributions

## Live Demo

Visit the live dashboard: [https://3iatlas.hook.technology](https://3iatlas.hook.technology)

---

**Current Status**: Active development tracking 3I/ATLAS approach to perihelion (Oct 30, 2025)