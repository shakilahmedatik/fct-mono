# syntax=docker/dockerfile:1

# The Bun version is pinned to the one in the root package.json
# (`packageManager: bun@1.3.13`) and the one used by CI.
#
# This is the Debian (glibc) image, NOT the `-alpine` one: the native ONNX
# Runtime binding that @huggingface/transformers loads is built against glibc
# and cannot be loaded on musl/Alpine. See apps/api/Dockerfile.
FROM oven/bun:1.3.13 AS base
WORKDIR /app

# ── Dependencies ───────────────────────────────────────────────────────────
# The whole workspace must be present for `bun install --frozen-lockfile` to
# succeed — see the note in apps/api/Dockerfile. `--filter @repo/worker` then
# installs only the worker's dependency closure, which excludes the three
# Next.js apps, Biome and the UI package.
FROM base AS deps
COPY package.json bun.lock* turbo.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY tests/ ./tests/
RUN bun install --frozen-lockfile --filter @repo/worker

# ── Build (compile check) ──────────────────────────────────────────────────
# See apps/api/Dockerfile for why the container runs the source rather than
# this bundle: the native ONNX Runtime binding cannot be inlined by
# `bun build`.
FROM deps AS builder
WORKDIR /app/apps/worker
RUN bun run build

# ── Production runner ──────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY package.json bun.lock* turbo.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/worker ./apps/worker

# The container runs as the unprivileged `bun` user; see apps/api/Dockerfile.
RUN chown -R bun:bun /app

# The worker previously had no healthcheck, so an orchestrator could not
# distinguish a healthy worker from one that was wedged.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "const r = await fetch('http://localhost:4001/health').catch(() => null); process.exit(r && r.ok ? 0 : 1)"

USER bun
CMD ["bun", "apps/worker/src/index.ts"]
