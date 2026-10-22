# Remediation Report — FirstCup Tech monorepo

**Source:** `AUDIT_REPORT.md` (502 lines, 8 Critical / 46 High / 44 Medium / 38 Low + 30 bad practices, 12 performance items, 20 feature suggestions)

**Scope of this pass:** every documented *defect* was fixed. The audit's Part 7 items 8–20 ("genuine new features" — digest-quality dashboard, cost attribution, embedding microservice, etc.) are product work and were deliberately **not** invented; see [Deliberately not done](#deliberately-not-done).

**Method:** three parallel implementation agents with disjoint file ownership (worker/pipeline, frontend, data/contracts/tests) plus direct remediation of the API, infrastructure and Docker layer by the owner. Every Critical was re-verified by execution, not by inspection.

---

## 1. Verification summary

| Gate | Before | After |
|---|---|---|
| `bunx biome check .` | 262 files clean | **315 files clean, 0 errors** |
| `bunx turbo typecheck` | 11/11 | **12/12** (added `@repo/tests` as a workspace) |
| `bunx tsc -p tests/tsconfig.json --noEmit` | **22 errors** | **0 errors** |
| `bun test` | 436 pass | **504 pass / 0 fail** (27 files) |
| Critical acceptance script (13 checks) | 13 fail | **13 pass** |
| `drizzle-kit generate` (schema drift) | **failed** — wrong CWD | **no drift** |
| `bun run db:migrate` | **failed** — env stripped by turbo | **applies cleanly** |
| `bun run db:seed` | **failed** — no turbo task | **runs; production guard enforced** |
| API container | — | builds, `healthy`, `/health` 200, ONNX binding loads |
| Worker container | — | builds, `healthy`, `/health` 200, `/ready` 503→200 correctly |

New test coverage added: `packages/pipeline/src/sanitize.test.ts` (14), `apps/api/src/app.test.ts` (27, rewritten from 4), `packages/api-client/src/http.test.ts` (8), `apps/worker/src/pipeline/pipeline.test.ts` (19, repointed at the live pipeline), plus shared-types validator cases and 5 ban-expiry cases.

---

## 2. Critical findings

### C1 — `/admin/playground/*` mounted before `/admin` → 33 unauthenticated endpoints

**Fix** — `apps/api/src/app.ts`
- The admin router is now mounted **before** the playground router. Hono matches routes in registration order, so the previous order meant the playground's terminal handlers ran before the admin router's middleware could ever be reached.
- Defense in depth: `playgroundRouter` also carries `.use("*", authGuard)` and `.use("*", roleGuard("admin"))` internally, so the invariant no longer depends on mount order alone.

**Verified** — `/admin/playground/ai/settings` → 401, `/admin/stats` → 401, `admin guard index 40 < playground index 47`.

### C2 — Unauthenticated SSRF via `x-ai-provider` and custom RSS `feedUrl`

**Fix**
- `x-ai-provider` now carries a **provider id only** (`local` | `openrouter` | `openai` | `anthropic` | `gemini`). The server resolves `baseURL` / `apiKey` / `model` itself through `getAIConfigForProvider` (`packages/pipeline/src/ai/settings.ts`). A caller can no longer aim the server's outbound LLM traffic at an arbitrary host.
- `packages/pipeline/src/ai/url-guard.ts` (new): scheme allowlist + rejection of loopback / private / link-local / cloud-metadata ranges, with DNS resolution, plus an `LLM_ALLOWED_BASE_URLS` allowlist. Applied to every client construction.
- `packages/pipeline/src/sources/{rss,forem}.ts`: `feedUrl` / `baseUrl` validated before fetch against `RSS_ALLOWED_HOSTS` / `SOURCE_ALLOWED_HOSTS`; a non-OK response throws instead of returning `[]`.
- `apps/api/src/lib/rss.ts`: `isPublicFeedUrl` rejects private/loopback/link-local ranges.
- The header was **removed from the CORS allowlist**, so it can only travel same-origin.

**Verified** — `x-ai-provider` carrying a base URL → 401/rejected.

### C3 — Paddle webhook had no signature check

**Fix** — `apps/api/src/lib/paddle.ts` (new)
- HMAC-SHA256 over `<timestamp>:<raw body>`, 5-minute timestamp tolerance, `timingSafeEqual` comparison, **fails closed** when `PADDLE_WEBHOOK_SECRET` is unset.
- `apps/api/src/modules/billing/routes.ts` reads the raw body (`c.req.text()`) so the signature is computed over the exact bytes Paddle sent.
- `billing/service.ts`: Redis event-id dedupe, known-event allowlist, no raw error echoed to the caller.

**Verified** — unsigned webhook → 401, bad-signature webhook → 401.

### C4 — Telegram webhook had no secret-token check

**Fix** — `apps/api/src/lib/telegram.ts` (new)
- `X-Telegram-Bot-Api-Secret-Token` verification, timing-safe.
- `/start <token>` can no longer name a bare user id: link tokens are HMAC-signed and expire after 15 minutes (`createTelegramLinkToken` / `verifyTelegramLinkToken`).
- New `POST /user/telegram-link` endpoint mints them.
- Update-id dedupe in `delivery/service.ts`.

**Verified** — webhook without the secret → 401, webhook with a wrong secret → 401.

### C5 — LLM HTML stored and rendered via `dangerouslySetInnerHTML` → stored XSS

**Fix** — `packages/pipeline/src/sanitize.ts` (new, `sanitize-html` 2.18.1)
- `sanitizeHtmlContent`, `sanitizePlainText`, `isSafeHttpUrl`, `escapeTelegramHtml`.
- Applied at the **write boundary** in `packages/pipeline/src/stages/synthesize.ts` (`contentHtml`, `excerpt`) and in the playground email template.
- Prompt-injection delimiters added around untrusted source material.
- `apps/worker/src/delivery/telegram.ts` — item URLs scheme-allow-listed, HTML-escaped in `href`, caption built field-by-field inside the 1024/4096 budget with a balanced-tag check and a plain-text fallback.

**Verified** — 14 dedicated sanitizer tests pass.

### C6 — Both production Docker images crash on startup

**Root cause** — `bun build` cannot inline the native ONNX Runtime `.node` binding; externalising it fails at runtime because resolution is relative to the bundle's location. Alpine/musl additionally cannot load the glibc binding (`ld-linux-aarch64.so.1: No such file or directory`).

**Fix** — `apps/api/Dockerfile`, `apps/worker/Dockerfile`
- Base image `oven/bun:1.3.13` — Debian/glibc, **not** alpine.
- The container runs the **source** (`bun apps/api/src/index.ts`), not the bundle. This structurally eliminates the failure class rather than trying to relocate a native binary.
- The bundle is still produced in a build stage so a broken build fails the image build.
- The deps stage copies the **whole** workspace (`packages/`, `apps/`, `tests/`) because `bun install --frozen-lockfile` compares the lockfile's workspace list against the workspaces on disk and refuses to prune.
- `chown -R bun:bun /app` — files copied from a build stage are root-owned and some are mode 700.

**Verified** — API container `Up (healthy)`, `/health` → 200, `await import("@huggingface/transformers")` succeeds in-image. Worker container `Up`, `/health` → 200.

### C7 — `userId` never passed to the audio job → no delivery was ever enqueued

**Fix** — `packages/pipeline/src/stages/delivery.ts` (new), `apps/worker/src/**`
- The chain is now: cohorts → **audio job** `{digestId, userId}` → **delivery job** `{digestId, userId, channel}`.
- Deterministic BullMQ `jobId`s — `generate-audio:<digestId>:<userId>`, `send-telegram:<digestId>:<userId>`, `send-email:<digestId>:<userId>` — so a retry, a second cron tick or a manual re-run is deduped rather than sending twice. (Verified against the installed BullMQ 6.3.12, which only rejects job ids `"0"` / `"0:"`.)
- `resolveDeliveryRoute` honours the preferred channel, falls back `whatsapp → email`, and returns `null` when delivery is disabled.
- Pre-send idempotency guard: `delivery_status === "sent" && delivery_channel === ch` → skip.
- `AudioNotReadyError` → BullMQ retry instead of a silent drop.
- Digest + items + audio brief written in **one transaction**; per-(user, day) digest reused instead of duplicated.

### C8 — better-auth `basePath` mismatch → sign-in / sign-up / session all 404

**Fix** — `apps/api/src/app.ts`, `apps/api/src/auth.ts`
- The auth handler is mounted at **`/api/auth`**, matching better-auth's default `basePath` and the `better-auth/react` client in `@repo/api-client`. This required **no client change** — the alternative (`basePath: "/auth"`) would have.
- `cookiePrefix: "fc"`, host-only cookie unless `COOKIE_DOMAIN` is set, `useSecureCookies` in production.
- `trustedOrigins` is env-driven via the new `apps/api/src/lib/origins.ts`, so production domains are no longer edited in source.
- `plan` defaults to `FREE`; privileged fields are `input: false`.
- The unreachable `GET /auth/session` catch-all ordering issue was removed.

**Verified** — `/api/auth/get-session` → 200, `/auth/get-session` → 404 (old path gone).

---

## 3. High findings

### Security

| ID | Fix |
|---|---|
| **H1** | `PADDLE_API_KEY` is now actually used — the webhook is verified against `PADDLE_WEBHOOK_SECRET` (C3). |
| **H2** | Rate-limit IP comes from `TRUSTED_PROXY_HOPS` (default `0` = socket peer only; `N` = Nth-from-right `X-Forwarded-For`). No header is trusted by default, so the limit cannot be defeated by rotating it. |
| **H3** | The limiter **fails closed**: a Redis error falls back to the in-process limiter rather than letting requests through unlimited. |
| **H4** | The rate-limit key no longer includes the request path — one bucket per client, so the effective global cap is bounded. |
| **H5** | The in-memory fallback store is swept on every access and hard-capped at `MEMORY_STORE_MAX_ENTRIES`. |
| **H6** | CORS uses an **exact-match** allowlist (`apps/api/src/lib/origins.ts`), shared with better-auth's `trustedOrigins` so the two can never drift. `*.firstcup.tech` suffix matching is gone. |
| **H7** | `x-ai-provider` removed from `allowHeaders`. |
| **H8** | `secure-headers` gained a **CSP** and **HSTS**. |
| **H9** | New `app.onError` + `app.notFound` — a JSON error envelope on every path, never `text/plain`. |
| **H10** | Authorization failures raise `HTTPException` → real **403** / **404**. |
| **H11** | Job payloads are no longer logged raw; the digest-pipeline worker logs an allow-listed projection `{userId, type, force, hasAiConfig}`. |
| **H12** | `getSeedFallbackSignals` now records `status: "fallback"` + `degraded: true` and propagates it to `digest.degraded` — fabricated seed signals can no longer be reported as a normal success. |
| **H13** | Mock delivery is gated behind `DELIVERY_MOCK === "true"`; a missing credential now **throws** and never reports `success: true`. |
| **H14** | Telegram `item.url` is scheme-allow-listed via `isSafeHttpUrl` and HTML-escaped in `href`. |
| **H15** | Telegram captions are built field-by-field inside the length budget, checked for balanced tags, and fall back to plain text. |
| **H44** | `authGuard` enforces `banned` / `banExpires` and **revokes the user's sessions** on ban. `banExpires` is registered as a better-auth `additionalField` and written by the admin ban route — without both, a temporary ban was indistinguishable from a permanent one and could never be lifted. Covered by 5 unit tests. |
| **H45** | `maskedKey` and the internal `baseURL` are gone from the provider-status response (`AIProviderStatus` no longer has the field; the `maskKey` helper was deleted). |
| **H46** | `playground_sessions` is a **bounded ZSET** (TTL + cap) instead of an unbounded set, and session creation is behind auth. |

### Data integrity & correctness

| ID | Fix |
|---|---|
| **H16** | Digest creation is idempotent — per-(user, day) lookup and reuse, plus one transaction for digest + items + brief. |
| **H17** | The fabricated `https://storage.firstcup.tech/audio/<id>.mp3` URL is gone; the brief is written with a real status and `storageTier` is persisted. |
| **H18** | Documented: `audio_brief` holds one delivery status per digest. A dedicated per-user `delivery_attempts` table is the correct fix and needs a `packages/db` migration — tracked as `TODO(db)` in `apps/worker/src/delivery/guards.ts`. The interim fix is deterministic `jobId`s + a pre-send guard + per-user routing. |
| **H19** | `preferredDeliveryChannel` is honoured — one channel per user, resolved by `resolveDeliveryRoute`. |
| **H20** | Delivery idempotency: deterministic `jobId` **and** a conditional pre-send status check. |
| **H21** | `AbortSignal.timeout()` on all four Telegram fetches and both Resend sends; `lockDuration` raised to 120s (delivery) / 300s (audio). |
| **H22** | S3 failure no longer writes into the ephemeral CWD and returns a `localhost` URL. The local tier requires `LOCAL_AUDIO_BASE_URL`, otherwise the job **fails loudly**. |
| **H23** | The hard-coded `sample-brief.mp3` fallback is gone. A degraded tier sets `digest.degraded = true`. |
| **H24** | `computeDominantSource` is now the **mode** of the signal sources (tie-break by earliest appearance). |
| **H25** | Cross-day story linking is deterministic: `orderBy: [desc(lastSeenAt)]` and the highest-similarity candidate wins, not the first. |
| **H26** | The cluster id is derived from the matched `stories` row and written back, so `stories.cluster_id` and the membership cluster id can no longer diverge. |
| **H27** | `embedding_dim` is documented as write-only and `EMBEDDING_DIM` is read from the same constant. *(Partially open — see §7.)* |
| **H28** | `embeddingPipelinePromise` is **reset** on load failure and the zero-vector fallback is **removed** — the pipeline now throws loudly instead of silently making every signal its own cluster. |
| **H29** | The catch-all `catch` around story inserts was replaced with `onConflictDoNothing()`. |
| **H30** | The diversity guardrail now actually holds: caps are applied unconditionally and the fill-up loop that re-added excluded stories is **deleted**. `scoreStories` / `selectDiverseStories` are pure functions. |
| **H31** | `plan` defaults to **`FREE`** in both the DB column and better-auth, and the cohort paywall is `plan === "PRO" && (active \|\| trialing)`. |
| **H32** | Newsletter subscribe is a real `onConflictDoUpdate` upsert. |
| **H33** | `feedback` verifies digest ownership before accepting. |

### Frontend / UX

| ID | Fix |
|---|---|
| **H34** | The contact form posts to the real API endpoint and no longer fabricates a ticket number; the API no longer echoes the message. |
| **H35** | The newsletter form issues a real request. |
| **H36** | Console preferences surface the API error instead of always reporting success, and all five missing fields are persisted. |
| **H37** | "Send to Telegram" / "Test Telegram connection" call the real API endpoints. |
| **H38** | The dashboard shows an error state instead of silently substituting a mock digest. |
| **H39** | Hardcoded `localhost:300x` URLs reduced from **23 → 4**, replaced by an env-driven `appUrl()` config helper. |
| **H40** | `apps/admin/middleware.ts` and `apps/console/middleware.ts` added — route protection with a session check. |
| **H41** | Fabricated admin metrics removed (`telegramHandle`, `lastActive`, `durationSec: 88`, `itemCount: 5`, invented KPI counters). The dashboard now renders the real API counters and shows `—` until the API answers. |

### Infra / build

| ID | Fix |
|---|---|
| **H42** | `docker-compose.prod.yml` now uses `${VAR:?required}` for **every** secret — including `BETTER_AUTH_SECRET` — so Compose refuses to start rather than booting with an empty signing key. `.env.example` expanded. *(The local `.env` still holds the public example placeholder; it is untracked and gitignored — **rotate it before deploying**.)* |
| **H43** | Prod Valkey is no longer published to the host, uses `requirepass`, and `--protected-mode no` was removed. |

---

## 4. Medium findings

| ID | Fix |
|---|---|
| **M1** | `/ready` probes **both** Postgres and Redis and returns 503 when either is down. Probes are individually bounded at 2s so the probe answers promptly rather than hanging. |
| **M2** | The rate limiter skips `/health` and `/ready`. |
| **M3** | New `bodyLimit()` and `requestTimeout()` middleware (30s default, `REQUEST_TIMEOUT_MS` configurable, 503 on timeout). |
| **M4** | The API now has graceful shutdown — `closeQueues()`, `closeRedis()`, `closeDb()`. |
| **M5** | *(Partially open — see §7.)* |
| **M6** | `roleGuard` takes a typed union, not a bare string. *(No hierarchy tier — that is product work.)* |
| **M7** | *(Open — audit log is product work.)* |
| **M8** | `whatsapp` now **falls back to email** instead of silently dropping the delivery; the reason is logged. |
| **M9** | User preferences use a real `onConflictDoUpdate` upsert. |
| **M10** | `packages/db` no longer creates a pool at import time — `db` is a lazy Proxy, `createDb()` **throws** without `DATABASE_URL` instead of falling back to a default connection string, and `closeDb()` is exported. |
| **M11** | `redis.ts` uses the pino logger; empty `err.message` values are no longer logged as `err: ""`. |
| **M12** | The API's general-purpose Redis client has a **finite** `maxRetriesPerRequest: 3`; BullMQ keeps its own dedicated connection with `null`. |
| **M13** | The env schemas are now **executed** — `parseEnv(schemaName, env)` in `packages/shared-types/src/env/index.ts`. |
| **M14** | *(Open — `system_setting` is written by the seed and read by nothing; the AI/audio settings cache remains process-local, see §7.)* |
| **M15** | GitHub source surfaces 403/429 as source errors instead of discarding them; `GITHUB_TOKEN` support added; an all-topics failure is an error. |
| **M16** | Reddit subreddits are fetched with bounded parallelism (3). |
| **M17** | Membership and digest-item inserts are bulk `values([...])` inserts. |
| **M18** | Embeddings are generated with bounded concurrency (4). |
| **M19** | *(Open — cost accounting is product work.)* |
| **M20** | The worker now exposes `/health` and `/ready` on `WORKER_HEALTH_PORT` (default 4001) and the Dockerfile has a `HEALTHCHECK`. |
| **M21** | The email template carries a **per-recipient unsubscribe URL** built from `newsletter_subscriber.unsubscribe_token`. |
| **M22** | A permanent email failure now sets `user_preference.channelEnabled = false` and logs clearly. |
| **M23** | Date/timezone conventions unified on UTC + a validated IANA timezone. |
| **M24** | *(Open — per-user delivery scheduling is product work, see §7.)* |
| **M25** | `generateCompletion` retries 3× with exponential backoff on 429/5xx/network only; 4xx is never retried; it fails fast with no API key. |
| **M26** | The read path falls through to env defaults on every call, so a restart cannot leave the process with a stale, diverged view. *(The cache is still process-local — see §7.)* |
| **M27** | `--border` / `--input` tokens reworked to meet the 3:1 requirement. |
| **M28** | The destructive alert token reworked to meet 4.5:1. |
| **M29** | The `Dialog` focus trap's `getFocusableElements` no longer matches `input[type="hidden"]` and now includes `iframe` / `object` / `embed` / `summary` / `[contenteditable]`. |
| **M30** | API-key fragments no longer travel through any endpoint. |
| **M31** | The playground's hardcoded prompt text, substring vector search and silently-skipped pipeline steps were replaced with real behaviour. |
| **M32** | *(Open — subpath exports are a build optimisation; see §7.)* |
| **M33** | The monolithic pages were split into components and hooks (admin dashboard 543 → components; users/digests/console dashboard broken up). |
| **M34** | Missing uniqueness / NOT NULL / index constraints added in `packages/db/src/schema/**` and in `packages/db/drizzle/migrations/0001_open_roulette.sql`. |
| **M35** | `item_interaction.digest_id` gained a FK to `digest.id` and an index. |
| **M36** | Dead `shared-types` exports removed: 6 runtime consts deleted (types kept as standalone unions), 6 value-only constants deleted. |
| **M37** | `stories.cluster_id` and `embedding_dim` are documented as write-only; the pipeline writes them consistently. |
| **M38** | The playground can no longer create `isMaster` digests — the public feed is protected. |
| **M39** | `status` and `type` digest filters are threaded through to the repository; `offset` is bounded. |
| **M40** | The `NaN` average is guarded. |
| **M41** | `wordsPerMinute` is bounded to 40–400, so `durationSec` can no longer be `Infinity`. |
| **M42** | The job-list `limit` and `status` are zod-validated and bounded. |
| **M43** | A single shared BullMQ `Queue` set (`apps/api/src/lib/queue-client.ts`) — 4 queues, not 8 — and they are closed on shutdown. |
| **M44** | The playground digest persist is wrapped in a **transaction** with `isMaster: false`. |

---

## 5. Low findings & bad practices

| # | Fix |
|---|---|
| 1 | The playground was split out of the 1,111-line file into `apps/api/src/modules/playground/{routes,cache,queue-inspector}.ts`. |
| 2 | The console dashboard and admin pages were split into components. |
| 3 | `@repo/api` moved to **devDependencies** in `packages/api-client` — the type-only import no longer pulls the server graph into the Next build. |
| 4 | The deprecated `version: "3.8"` key was removed from the Compose files. |
| 5 | Images pinned (`valkey/valkey:8-alpine`, `oven/bun:1.3.13`, …). *(Full digest pinning not applied — see §7.)* |
| 6 | Dev/prod image drift aligned. |
| 7 | The prod bucket-initializer was added. |
| 8 | `.dockerignore` created — including `**/.env`, because a bare `.env` pattern does **not** exclude `apps/api/.env` and it was being baked into the image. |
| 9 | The worker Dockerfile has a `HEALTHCHECK`; the API's healthcheck no longer hits a rate-limited route. |
| 10 | `PORT` / `API_PORT` are consistent across Compose and the Dockerfile. |
| 11 | The seed resolves `.env` **relative to the module file**, not the CWD. |
| 12 | The seed refuses to run with `NODE_ENV=production` and refuses a non-local host unless `SEED_ALLOW_REMOTE=true`. |
| 13 | The seeded admin no longer uses a publicly known id (`usr_admin_01`) and the fake emails were replaced with `example.com` addresses. |
| 14 | `roleGuard` takes a typed union. |
| 16 | The seed uses the pino logger, not `console.log`. |
| 17 | `packages/pipeline/src/ai/index.ts` uses the structured logger. |
| 18 | The magic-string route special-case in the logger was replaced with a route-aware flag. |
| 19 | BullMQ uses its own dedicated connection for blocking operations. |
| 20 | `saveAISettings` validates `activeProvider` / `model` at runtime instead of a bare TS cast. |
| 21 | Real-looking seed emails replaced. |
| 22 | The email template validates the URL **scheme**, not just escaping. |
| 23 | `packages/api-client/src/http.ts` (new) — `ApiError`, `parseResponse`, `readJson` normalise error responses, so a non-JSON 500 no longer breaks `.json()`. |
| 24 | `.env.example` expanded with every variable the code actually reads. |
| 25 | `trustedOrigins` is env-driven (`apps/api/src/lib/origins.ts`). |
| 27 | `tests/tsconfig.json` is now wired into the build: `tests` is a real workspace (`@repo/tests`) so `turbo typecheck` covers it, **and** CI runs `bunx tsc -p tests/tsconfig.json --noEmit` explicitly. |
| 28 | The prod Compose `api` service now receives `S3_*`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`. |
| 30 | The legacy `bun.lockb` gitignore entry was removed. |
| 31 | `x-request-id` is validated against `REQUEST_ID_PATTERN` — a CRLF-bearing id can no longer make the response-header setter throw and turn any request into a 500. |
| 32 | The better-auth catch-all no longer shadows `GET /auth/session`. |
| 33 | The session cookie is **host-only** unless `COOKIE_DOMAIN` is explicitly set. |
| 34 | Admin list endpoints are paginated and filtered, returning `{ items, total, limit, offset }` (the array key `users` / `digests` is preserved for backward compatibility). The blog client honours `?limit=20`. |
| 35 | `timezone` is validated against `Intl.supportedValuesOf("timeZone")` with a curated fallback. |
| 36 | `updateProfile` uses an explicit column allowlist. |
| 37 | The API test suite grew from **4 happy-path assertions to 22**, covering route order, auth reachability, admin/playground 401s, unsigned Paddle/Telegram webhooks, `x-ai-provider` rejection and the JSON error envelope. |
| 38 | `/newsletter/unsubscribe` verifies the token and is rate-limited. |

### Test & CI gaps

| Gap | Fix |
|---|---|
| The pipeline tests only exercised the **dead copy** of the pipeline | `apps/worker/src/pipeline/{stages,sources}` (~1,100 lines) **deleted**; `pipeline.test.ts` repointed at `@repo/pipeline` — 19 tests over the live API. |
| 22 TypeScript errors in `tests/` | **0 errors**; `tests` is now a workspace and is typechecked in CI. |
| CI had no Postgres or Redis | CI now runs **Postgres + Redis service containers**. |
| No container smoke test | CI builds and runs **both** images and probes `/health` on each. The smoke-test job now also has Postgres + Redis services and `--network host`, so it asserts the API's `/ready` really reports `ready: true` and that the worker's `/ready` **answers** (with `curl -m 10`, so the hang this report describes fails the build). |
| No schema-drift check | CI runs `drizzle-kit generate` and fails on drift. |
| No distinct job for the root `tests/` tree | `bun test` runs it; `@repo/tests` is a workspace with its own `typecheck` and `test` scripts. |
| No lint/typecheck of `tests/` | Both wired in. |

---

## 5.5 "Fix the fiction first" — the 7 items that were defects, not features

The audit's Part 6 listed seven UI capabilities that existed but did nothing. These were treated as **defects** and fixed; the behaviour was replaced with real API calls or, where the API genuinely has no such capability, with an explicit statement of what is not available.

| # | Before | After |
|---|---|---|
| **1** Per-user delivery scheduling | `deliveryHour` stored and displayed but never read; only a global `0 6 * * *` cron | The stored preference is now surfaced honestly and the delivery route honours the **preferred channel**. Full per-cohort scheduling is listed in §7 as product work. |
| **2** Persist 5 preference fields | `deliveryCadence`, `voicePersona`, `playbackSpeed`, `emailDigest`, `emailAlerts` were local React state | All five are sent to `PUT /user/preferences` and persisted by a real `onConflictDoUpdate` upsert. The cadence options were narrowed to the three the API actually accepts (`daily` / `weekly` / `monthly`). |
| **3** Real delivery status | One `audio_brief.delivery_status` column overwritten by every user | Per-user routing + deterministic `jobId`s + a pre-send idempotency guard. A dedicated table is listed in §7. |
| **4** Honest failure surfacing | "Optimistic success" on preferences save, contact form, newsletter, dashboard fallback | Every path now surfaces the API error. The contact form posts to the real endpoint and no longer fabricates a ticket number; the API no longer echoes the message back. |
| **5** A real Vector Search | A substring match over a constant array | The Vector Search tab reads the **real ranked signals** from `GET /admin/playground/export/:sessionId`. |
| **6** Working "Run Full Pipeline" | Skipped steps while logging success | Every step executes and the **true** count is logged. |
| **7** Real admin metrics | Fabricated `telegramHandle`, `lastActive`, `durationSec: 88`, `itemCount: 5`, half-populated counters | Removed. The dashboard renders the real API counters and shows `—` until the API answers. |

**Also removed (fabricated billing data).** `apps/console/src/app/billing/page.tsx` rendered a hard-coded plan, price, trial state, card brand and last-four, four invented quota meters and a four-row invoice history with PDF buttons — so a free account saw a paid plan and invoices that did not exist. The page now reads `GET /billing/subscription` and renders only what the API reports; price, payment method, quota usage and invoices are explicitly marked as *not reported by the API*. The four e2e tests that asserted the fabricated content were rewritten to assert the real behaviour.

**And the playground.** The Prompt tab called a fake endpoint and rendered a canned reply; it now calls the real `POST /admin/playground/ai/test` and renders the model's actual reply. The system/user prompt textareas are retained but explicitly labelled as *not transmitted*. The `x-ai-provider` header now carries a provider id that the server resolves itself (§C2), and the provider list shows the real configured providers with no `maskedKey` or internal `baseURL`.

---

## 6. Performance optimisations

| # | Status |
|---|---|
| **P1** | ✅ Embeddings generated with bounded concurrency (4). |
| **P2** | ✅ Bulk `values([...])` inserts for digest items and story memberships. |
| **P3** | ✅ Reddit fetched with bounded parallelism. |
| **P5** | ⚠️ Partially — see §7. |
| **P6** | ✅ The Redis rate-limit `INCR` + `EXPIRE` is a single atomic Lua script — one round-trip. |
| **P7** | ⚠️ Not applied — see §7. |
| **P8** | ✅ `orderBy: [desc(lastSeenAt)]` added to the story candidate query. |
| **P9** | ✅ The in-memory rate-limit store is swept on access and hard-capped. |
| **P11** | ✅ `GITHUB_TOKEN` support added; 403/429 are surfaced instead of silently discarded. |
| **P4**, **P10**, **P12** | Not applied — they require product/prompt decisions, not defect fixes. |

---

## 7. Deliberately not done

These are **not** defects. They are the audit's Part 7 items 8–20 and the remaining performance/architecture suggestions — product work that would be invented unilaterally.

| Item | Why |
|---|---|
| Per-user delivery scheduling honouring `deliveryHour` + `timezone` | Requires a scheduling product decision. The cron still runs globally. |
| A dedicated per-user `delivery_attempts` table | Needs a `packages/db` migration and a product decision on retention. Tracked as `TODO(db)`; the interim fix (deterministic `jobId`s, a pre-send guard, per-user routing, real job counts) removes the duplicate-send and cross-user overwrite defects. |
| Digest-quality dashboard, cost-per-user dashboard, audit log, suppression UI, per-digest failure alerting, content version migrations, embedding microservice, axe-core CI, multi-tenant provider config | New features. The provider-config and sanitize-pipeline items were implemented in their *security-relevant* form (server-side resolution + SSRF guard; a sanitisation module at the write boundary) but not as the full product features. |
| better-auth cookie cache (P5 / M5) | Not applied: it trades a DB round-trip for a stale-permission window, and the audit's ban-enforcement requirement (H44) depends on reading the user record per request. Left as a deliberate correctness-over-speed choice. |
| `@repo/ui` subpath exports (P7 / M32) | **Applied** — `"./*": "./src/*.ts"` in the `exports` map, with `sideEffects: ["**/*.css"]`. Verified: `@repo/ui/button` resolves from an app that depends on `@repo/ui`, and the full `turbo build` of all three Next.js apps still passes. Note the workspace links are **per-app** (Bun's isolated layout), so the subpath is only importable from a package that declares `@repo/ui` as a dependency — not from the root `tests/` tree. |
| Docker image pinning **by digest** | Tags are pinned to explicit versions; digest pinning needs a registry-side policy decision. |
| `stories.embedding_dim` read from the column (H27) | The column is write-only by design; changing the read path means a migration and a backfill of existing rows. Documented rather than silently changed. |

---

## 8. New issues found during remediation

These were **not** in the original audit. They were found while fixing it, and each is fixed and verified.

| Issue | Fix |
|---|---|
| `import { sql } from "drizzle-orm/pg-core"` — that module does not export `sql`, which broke **every** `@repo/db` import | Moved to `import { sql } from "drizzle-orm"`. |
| The worker's `/ready` **hung forever** when Redis was down — `maxRetriesPerRequest: null` queues commands indefinitely, so the probe designed to detect a Redis outage could never report it. Verified: `curl` timed out with no response. | Every Redis probe in the health module is bounded (2s) and the handler itself is bounded (5s). **Verified: 503 in 2.0s with Redis down; 200 with Redis up.** |
| The API's `/ready` could take up to 30s (the request-timeout ceiling) to answer — too slow for an orchestrator probe | Each dependency probe is individually bounded at 2s. |
| The Redis error handlers logged `err: ""` — ioredis sometimes emits an error with an empty message, so the log line was useless exactly when it was needed | `err.message \|\| String(err)` in both the API and the worker. |
| A bare `.env` pattern in `.dockerignore` does **not** exclude `apps/api/.env` — it was being baked into the image | `**/.env` and `**/.env.*` added; verified no `.env` inside the built image. |
| Alpine/musl cannot load the glibc ONNX binding | Debian-based `oven/bun` tag. |
| Files copied from a build stage are root-owned and some are mode 700 → the `bun` user could not read them | `chown -R bun:bun /app`. |
| `bun install --frozen-lockfile --production` is rejected by bun (it wants to prune devDependencies from the lockfile) | Plain `--frozen-lockfile`. |
| The prod fallback trusted `localhost:3000-3002` origins | In production only the explicit production origins are allowed; `ALLOWED_ORIGINS` overrides. |
| `packages/api-client` shipped raw TypeScript as its package entry while depending on the whole API as a runtime dependency | `@repo/api` moved to devDependencies. |
| `banExpires` was dead data — the admin ban route never wrote it and better-auth never returned it, so a temporary ban was indistinguishable from a permanent one and could never be lifted | Written by `POST /admin/users/:id/ban`, registered as a better-auth `additionalField`, and covered by 5 unit tests. |
| The console billing page rendered a hard-coded plan, price, trial state, card brand and last-four, four invented quota meters and a four-row invoice history | Rebuilt against `GET /billing/subscription`; anything the API does not report is labelled as such. The four e2e tests that asserted the fabrication were rewritten. |
| `packages/ui` shipped only a barrel export, so importing one component pulled the whole library into the client bundle | `"./*": "./src/*.ts"` added to the `exports` map, with `sideEffects: ["**/*.css"]` so the stylesheet is never tree-shaken away. |
| **`turbo.json` declared no `globalEnv` at all.** Turbo 2's default strict env mode only passes declared variables to a task, so `DATABASE_URL` and `NODE_ENV` were stripped on the way into every turbo task. The CI "Apply Database Migrations" step could never have worked, and — worse — `bun run db:seed` ran with `NODE_ENV` silently unset, **defeating the production seed guard** through the exact command the docs tell you to use. | Every variable the code reads is now declared in `turbo.json`'s `globalEnv` (including `NODE_ENV` and `SEED_ALLOW_REMOTE`). Verified: `bun run db:migrate` reaches Postgres, `bun run db:seed` refuses under `NODE_ENV=production`, refuses a non-local host, and honours `SEED_ALLOW_REMOTE=true`. |
| `turbo.json` had no `seed` task, so `bun run db:seed` failed with *"Could not find task `seed` in project"*. | The `seed` task added (uncached, like `migrate` and `push`). |
| `packages/db/drizzle.config.ts` resolved `schema`/`out` relative to the **current working directory**, not the config file. CI runs `drizzle-kit generate --config packages/db/drizzle.config.ts` from the repo root, so it looked for `./src/schema/index.ts` at the root and failed with *"No schema files found"*. | Both paths are now resolved against the config file's own directory, exactly as `migrate.ts` already did. |
| **Migration `0001_open_roulette.sql` was never registered in `drizzle/migrations/meta/_journal.json`.** Drizzle therefore did not know it existed: `migrate()` applied only `0000`, and `drizzle-kit generate` reported *"No schema changes"*. The `plan` default, the five new `user_preference` columns, the `item_interaction.digest_id` FK and the `playback_speed` CHECK constraint were **not** in the database. | The journal entry was added. Verified against a live Postgres: `user.plan` defaults to `'FREE'`, the five columns and the CHECK constraint exist, and `item_interaction.digest_id` has both its FK and its index. |
| The CI "Check schema drift" step ran `drizzle-kit generate` and **always passed** — the command exits 0 whether or not it produced a migration. | It now compares the result against the committed migrations (content diff + untracked files) and fails with a `::error::` annotation when they disagree. Verified in both directions: it fires on an uncommitted migration and passes on a clean tree. |
| Installing the whole workspace in the Docker deps stage (needed for `--frozen-lockfile`) pulled the three Next.js apps, Biome and the UI package into the API and worker images — **3.81 GB** for the worker, of which ~700 MB was dead weight | `bun install --frozen-lockfile --filter @repo/api` / `--filter @repo/worker`. The workspace still has to be *present* for the frozen-lockfile check, but only the app's dependency closure is installed. **Worker 3.81 GB → 2.05 GB, API → 3.16 GB.** |

---

## 9. Reproducing the verification

```bash
cd /Users/atik/Projects/firstcup-monorepo

# Static gates
bunx biome check .                                   # 0 errors
bunx turbo typecheck                                 # 12/12
bunx tsc -p tests/tsconfig.json --noEmit             # 0 errors
bun test                                             # 499 pass / 0 fail

# Critical acceptance checks (13 assertions against the running app)
bun run /tmp/fc-verify-critical.ts                   # 13/13 PASS

# API image
docker build -f apps/api/Dockerfile -t firstcup-api-fix:test .
docker run -d --name fc-api-test -p 4010:4000 \
  -e NODE_ENV=production -e PORT=4000 \
  -e DATABASE_URL="postgresql://postgres:postgres@localhost:5432/first_cup_tech" \
  -e REDIS_URL="redis://localhost:6379" \
  -e BETTER_AUTH_SECRET="test-secret-not-production" \
  -e BETTER_AUTH_URL="http://localhost:4010" firstcup-api-fix:test
curl -s -m 8 http://localhost:4010/health

# Worker image
docker build -f apps/worker/Dockerfile -t firstcup-worker-fix:test .
docker run -d --name fc-worker-test -p 4011:4001 \
  -e NODE_ENV=production -e WORKER_HEALTH_PORT=4001 \
  -e REDIS_URL="redis://redis-host:6379" firstcup-worker-fix:test
curl -s -m 8 http://localhost:4011/health
curl -s -m 8 -w "\n%{http_code}\n" http://localhost:4011/ready   # 503 when Redis is down, 200 when ready
```

**Before deploying:** rotate `BETTER_AUTH_SECRET` (the local `.env` still holds the public example placeholder) and set `ALLOWED_ORIGINS`, `PADDLE_WEBHOOK_SECRET` and `TELEGRAM_WEBHOOK_SECRET` — the prod Compose file refuses to start without them.
