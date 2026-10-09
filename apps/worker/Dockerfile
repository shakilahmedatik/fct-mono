# syntax=docker/dockerfile:1
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Stage 1: Install dependencies & build
FROM base AS builder
COPY package.json bun.lock* ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

# Install dependencies across workspace
RUN bun install --frozen-lockfile

# Build optimized production bundle
WORKDIR /app/apps/worker
RUN bun run build

# Stage 2: Production runner
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled dist bundle
COPY --from=builder /app/apps/worker/dist ./dist

USER bun
CMD ["bun", "dist/index.js"]
