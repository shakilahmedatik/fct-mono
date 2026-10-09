# syntax=docker/dockerfile:1
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Stage 1: Install dependencies & build
FROM base AS builder
COPY package.json bun.lock* ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies across workspace
RUN bun install --frozen-lockfile

# Build optimized production bundle
WORKDIR /app/apps/api
RUN bun run build

# Stage 2: Production runner
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy only the compiled dist bundle
COPY --from=builder /app/apps/api/dist ./dist

# Healthcheck probe
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

EXPOSE 4000

USER bun
CMD ["bun", "dist/index.js"]
