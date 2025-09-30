# 3I/ATLAS Comet Dashboard

> Real-time tracking dashboard for interstellar comet 3I/ATLAS, approaching perihelion on **October 30, 2025**.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-3iatlas.hook.technology-blue)](https://3iatlas.hook.technology)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Track the third confirmed interstellar object passing through our solar system with real-time observational data, 3D orbital visualization, and scientific analysis tools.

## Features

### 🌌 3D Solar System Visualization
- Interactive Three.js orbital mechanics simulation
- Real-time planet positions using astronomy-engine (JPL ephemeris)
- Comet trajectory with historical trail and future projection
- Shader-based infinite ecliptic plane grid

### 📊 Scientific Analysis
- **Velocity Tracking** - Multi-type velocity analysis (brightness, coma, orbital)
- **Activity Levels** - Physics-based activity detection
- **Trend Analysis** - Statistical trend modeling with predictions
- **Light Curves** - Multi-filter photometric observations
- **Orbital Mechanics** - Heliocentric and geocentric velocity tracking

### 🔭 Observer Network
- Global observation data from COBS (Comet Observation Database)
- Real-time observer contribution metrics
- Geographic distribution and quality ratings

### 🛡️ Production-Ready
- Request deduplication and caching
- Structured logging with Pino
- Input validation with Zod
- Security headers (HSTS, CSP, CORS)
- Docker containerized

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (optional)

### Development

```bash
# Clone repository
git clone https://github.com/hook-365/3idashboard.git
cd 3idashboard

# Install dependencies
npm install

# Start development server
PORT=3020 npm run dev
```

Open http://localhost:3020

### Production

```bash
# Build
npm run build

# Start
npm run start
```

### Docker

```bash
# Build and start
docker-compose up -d --build

# View logs
docker logs 3idashboard_web_1

# Stop
docker-compose down
```

## Tech Stack

**Frontend**
- Next.js 15.5 with App Router
- TypeScript
- Tailwind CSS
- Three.js (3D visualization)
- Chart.js (data visualization)

**Data Sources**
- COBS API (observations)
- NASA/JPL Horizons (orbital mechanics)
- TheSkyLive (real-time coordinates)

**Infrastructure**
- Pino (structured logging)
- Zod (validation)
- Docker

## Project Structure

```
3idashboard/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── api/          # API routes
│   │   └── ...           # Dashboard pages
│   ├── components/
│   │   ├── charts/       # Data visualizations
│   │   └── visualization/ # 3D solar system
│   ├── lib/              # Core utilities
│   └── utils/            # Configuration
├── public/textures/      # Planet textures
└── docker-compose.yml
```

## API Endpoints

- `GET /api/comet-data` - Aggregated comet data
- `GET /api/observations` - Raw observations
- `GET /api/velocity` - Velocity analysis
- `GET /api/simple-activity` - Activity levels
- `GET /api/solar-system-position` - 3D positions

See [CLAUDE.md](./CLAUDE.md) for detailed API documentation.

## Configuration

Edit `src/utils/analytics-config.ts` to adjust date ranges:

```typescript
ANALYTICS_DATE_CONFIG = {
  START_DATE: '2025-07-01T00:00:00.000Z',
  PERIHELION_DATE: '2025-10-30T00:00:00.000Z',
  END_DATE: '2025-12-31T23:59:59.999Z'
}
```

## Data Attribution

**COBS (Comet Observation Database)**
- License: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- Attribution: "Data courtesy of COBS (Comet Observation Database)"
- Non-commercial use with proper attribution

**NASA/JPL Data**: Public domain

## Disclaimer

This is an **educational dashboard** for astronomy enthusiasts. Not for spacecraft navigation or mission-critical use. See [/about](https://3iatlas.hook.technology/about) for full disclaimer and data limitations.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

- COBS network and global observer community
- NASA/JPL for orbital mechanics
- TheSkyLive for real-time data

---

**Live Dashboard**: [https://3iatlas.hook.technology](https://3iatlas.hook.technology)

**Status**: Active development tracking approach to perihelion (Oct 30, 2025)
