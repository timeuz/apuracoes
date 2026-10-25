# ==========================================
# Multi-Stage Production Dockerfile
# ==========================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies including devDependencies for build
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build client production bundle (Vite -> dist/)
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend bundle from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Copy backend server files and configs with non-root ownership
COPY --chown=node:node server.ts tsconfig.json ./
COPY --chown=node:node src ./src

# Create/use non-root user for container security
USER node

# Expose HTTP port
EXPOSE 3000

# Container Healthcheck (bypasses rate-limiting automatically via /api/health exemption)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Launch Express server directly for proper SIGTERM/SIGINT signal handling
CMD ["npx", "tsx", "server.ts"]
