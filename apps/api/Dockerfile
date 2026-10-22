# syntax=docker/dockerfile:1

# The Bun version is pinned to the one in the root package.json
# (`packageManager: bun@1.3.13`) and the one used by CI.
#
# This is the Debian (glibc) image, NOT the `-alpine` one: the native ONNX
# Runtime binding that @huggingface/transformers loads is built against glibc
# and cannot be loaded on musl/Alpine — the container would die with
# "Error loading shared library ld-linux-aarch64.so.1: No such file or
# directory".
FROM oven/bun:1.3.13 AS base
WORKDIR /app

# ── Dependencies ───────────────────────────────────────────────────────────
# The WHOLE workspace has to be present for `bun install --frozen-lockfile` to
# succeed: bun compares the lockfile's workspace list against the workspaces on
# disk, and with only apps/api present it wants to prune the other workspaces
# out of the lockfile and refuses with "lockfile had changes, but lockfile is
# frozen".
#
# `--filter @repo/api` then installs only the API's dependency closure. The
# workspace still has to be *present* for the frozen-lockfile check, but the
# three Next.js apps, Biome and the UI package are not runtime dependencies of
# the API — installing them added ~700 MB of dead weight to the image.
FROM base AS deps
COPY package.json bun.lock* turbo.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY tests/ ./tests/
RUN bun install --frozen-lockfile --filter @repo/api

# ── Build (compile check) ──────────────────────────────────────────────────
# The bundled output is still produced so a broken build fails the image
# build, but the container does NOT run the bundle: `bun build` cannot inline
# the native ONNX Runtime binding that @huggingface/transformers loads, so a
# bundle-only image crashes on startup with
# "Cannot find module '../bin/napi-v3/<platform>/onnxruntime_binding.node'".
FROM deps AS builder
WORKDIR /app/apps/api
RUN bun run build

# ── Production runner ──────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

COPY package.json bun.lock* turbo.json ./
# The resolved dependency tree is copied from the deps stage rather than
# installed again: a second install would have to repeat the whole-workspace
# trick above just to satisfy the frozen lockfile.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/api ./apps/api

# The container runs as the unprivileged `bun` user, but files copied out of
# the build stage are owned by root and some are mode 700 — the unprivileged
# user could not read the application source without this.
RUN chown -R bun:bun /app

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "const r = await fetch('http://localhost:4000/health').catch(() => null); process.exit(r && r.ok ? 0 : 1)"

EXPOSE 4000
USER bun
CMD ["bun", "apps/api/src/index.ts"]
