# Production Dockerfile for 3I/ATLAS Comet Dashboard
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Install production dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Production Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOST=0.0.0.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application and dependencies
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js

# Copy production environment file if it exists
COPY --from=builder /app/.env.production* ./

# Create necessary directories with correct permissions
RUN mkdir -p .next/cache && \
    chown -R nextjs:nodejs .

# Switch to non-root user
USER nextjs

# Expose production port
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/comet-data', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });" || exit 1

# Start the production server with compression
CMD ["node", "server.js"]