#!/bin/bash

# Production Start Script for 3I/ATLAS Comet Dashboard
# Usage: ./start-production.sh

echo "🚀 Starting 3I/ATLAS Comet Dashboard in Production Mode"
echo "=================================================="

# Load production environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
    echo "✅ Production environment loaded"
else
    echo "⚠️  Warning: .env.production not found, using defaults"
fi

# Set production defaults if not defined
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export HOST=${HOST:-0.0.0.0}

# Build check
if [ ! -d ".next" ]; then
    echo "⚠️  Production build not found. Building now..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed! Please fix errors and try again."
        exit 1
    fi
fi

# Log startup info
echo ""
echo "📊 Production Configuration:"
echo "  - Environment: $NODE_ENV"
echo "  - Port: $PORT"
echo "  - Host: $HOST"
echo "  - Process ID: $$"
echo ""
echo "🔧 Features Enabled:"
echo "  - Compression: ${COMPRESSION_ENABLED:-true}"
echo "  - Multi-Source Data: ${ENABLE_MULTI_SOURCE:-true}"
echo "  - 3D Visualization: ${ENABLE_3D_VISUALIZATION:-true}"
echo ""

# Start the production server
echo "🌐 Starting production server..."
echo "=================================================="
echo ""

# Use the custom server.js with compression
exec node server.js