# 3I/ATLAS Comet Dashboard

Real-time tracking dashboard for interstellar comet 3I/ATLAS, approaching perihelion on October 30, 2025.

## Quick Start

```bash
# Development server
PORT=3020 npm run dev

# Production build
npm run build && npm run start

# Docker development
npm run docker:dev
```

Open [http://localhost:3020](http://localhost:3020) to view the dashboard.

## Features

- **3D Solar System Visualization**: Interactive Three.js orbital mechanics with infinite grid
- **Real-time Data**: Live observations from COBS global network
- **Scientific Analysis**: Velocity tracking, activity levels, orbital dynamics
- **Interactive Charts**: Perihelion markers and comprehensive visualizations
- **Observer Network**: Global contributor tracking and performance metrics
- **Data Integrity**: Real observations only - no fabricated fallbacks
- **Production-Ready**: Request deduplication, structured logging, security headers

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript and Tailwind CSS
- **3D Graphics**: Three.js with custom shaders and astronomy-engine
- **Data**: Multi-source integration (COBS, NASA/JPL, TheSkyLive)
- **Charts**: Chart.js with custom scientific visualizations
- **Infrastructure**: Pino logging, Zod validation, request deduplication
- **Development**: Docker containerized environment

## Project Structure

- `/src/app/` - Next.js App Router pages
- `/src/components/charts/` - Scientific visualization components
- `/src/lib/data-sources/` - Multi-source data integration
- `/src/utils/` - Configuration and utilities

## Documentation

See [CLAUDE.md](./CLAUDE.md) for complete development documentation including:
- API endpoints and parameters
- Data sources and integration
- Chart components and configuration
- Development guidelines and recent updates