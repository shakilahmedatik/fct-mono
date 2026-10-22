# FirstCup Monorepo — Full Audit Report

**Scope:** `apps/api`, `apps/worker`, `apps/web`, `apps/console`, `apps/admin`, `packages/{ui,db,pipeline,api-client,shared-types,config-ts,config-biome}`, infra (`docker/`, `docker-compose.prod.yml`, `.github/workflows/ci.yml`, `.env*`), `tests/`.
**Method:** full source read + repo-wide grep + live HTTP probes against the real Hono app + Hono routing PoC + isolated `bun install --frozen-lockfile` + `bun build` + executing the built bundle standalone + `drizzle-kit generate` diff + computed WCAG contrast ratios.
**Baseline established:** `biome check .` → clean (262 files). `turbo typecheck` → 11/11 pass. `bun test` → 436 tests / 25 files, all pass.

> **The green toolchain is misleading.** Lint, types, and 436 passing tests coexist with a product that **cannot authenticate a user**, has **never delivered a digest to a single user**, an API where the **entire admin surface is unauthenticated**, and Docker images that **crash on startup**. The test suite in particular validates a **dead copy** of the pipeline that production never runs.

### The eight Critical findings at a glance

| # | Finding | One-line impact |
|---|---|---|
| **C1** | `/admin/playground/*` mounted before `/admin` → 33 endpoints unauthenticated | Anyone can trigger production pipelines and spend your API budget |
| **C2** | Unauthenticated SSRF via `x-ai-provider` `baseURL` and custom RSS `feedUrl` | The server becomes a proxy into its own network |
| **C3** | Paddle webhook has no signature check | Anyone can grant any account the paid plan |
| **C4** | Telegram webhook has no secret-token check | Anyone can divert any user's digests to their chat |
| **C5** | LLM HTML stored and rendered via `dangerouslySetInnerHTML` | Stored XSS on the public blog |
| **C6** | Native ONNX binding not bundled → both images crash-loop | The container never starts |
| **C7** | `userId` never passed to the audio job → no delivery enqueued | **No user has ever received a digest** |
| **C8** | better-auth `basePath` `/api/auth` vs mounted `/auth/*` | **Sign-in, sign-up and session all 404** |

---

## Verdict

**FAIL.** ~168 unique findings after cross-source deduplication: **8 Critical**, **~25 High**, **~54 Medium**, **~48 Low**, plus 30 bad-practice items and the feature/performance backlogs.

| Layer | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| API / security | 7 | 12 | 17 | 14 | 50 |
| Worker / pipeline / delivery | 1 | 9 | 16 | 11 | 37 |
| Data layer / contracts | 2 | 4 | 9 | 6 | 21 |
| Frontend / UI / a11y | 3 | 8 | 11 | 14 | 36 |
| Infra / CI / tests | 2 | 3 | 6 | 8 | 19 |

---

# PART 1 — CRITICAL

## C1. The entire `/admin/playground` API is unauthenticated (33 endpoints)

**Verified empirically.** `playgroundRouter` (`apps/api/src/modules/playground/routes.ts:141-157`) declares exactly one middleware — a header parser. It has **no `authGuard`, no `roleGuard`**. Meanwhile `adminRouter` (`apps/api/src/modules/admin/routes.ts:16-17`) has both. In `apps/api/src/app.ts` the playground is mounted **first**:

```
49:  .route("/admin/playground", playgroundRouter)   // ← matched first
50:  .route("/admin", adminRouter);                  // ← roleGuard never reached
```

Hono matches routes in registration order, so `/admin/playground/*` is handled before the admin router's `.use("*", roleGuard("admin"))` can run. **Proven with a standalone Hono reproduction** (Hono 4.13.13, identical structure):

```
GET /admin/playground/ai/settings  → 200 {"ok":true,"settings":"SECRET_AI_CONFIG"}
MIDDLEWARE HIT: playground-mw          ← authGuard/roleGuard never ran
GET /admin/stats                     → 401  MIDDLEWARE HIT: authGuard   ← correct
```

Unauthenticated capabilities include:

| Endpoint | Effect |
|---|---|
| `POST /admin/playground/tier4/enqueue-prod` | Enqueue a **production** digest pipeline run |
| `POST /admin/playground/tier3/email` | Send emails to arbitrary recipients (spam) |
| `POST /admin/playground/ai/settings` · `/audio/settings` | Rewrite **global** provider config |
| `POST /admin/playground/ai/test` · `/audio/test` | Trigger **paid** OpenAI/ElevenLabs/Deepgram calls |
| `POST /admin/playground/queues/:name/clean` · `/jobs/:jobId/retry` | Manipulate production queues |
| `GET /admin/playground/sessions` · `/export/:sessionId` · `/audio/:sessionId` | Exfiltrate pipeline sessions, scripts, audio |
| `DELETE /admin/playground/session/:sessionId` | Destroy sessions |

**Fix:** move `.route("/admin/playground", …)` **after** `.route("/admin", …)`, **and** add `.use("*", authGuard)` + `.use("*", roleGuard("admin"))` to `playgroundRouter` itself. Belt-and-braces: do both — route order alone is a fragile invariant.

---

## C2. Unauthenticated SSRF — the worker will POST to any URL you name

Two independent vectors, both unauthenticated.

**(a) Header-controlled LLM endpoint.** `playground/routes.ts:143-157` parses the `x-ai-provider` request header straight into an `AIProviderConfig` (`packages/pipeline/src/ai/index.ts:10-16` — includes `baseURL`, `apiKey`, `model`) and wraps the request in `aiConfigStorage.run(...)`. `packages/pipeline/src/ai/index.ts:23-38` then builds `new OpenAI({ baseURL: config.baseURL, apiKey: config.apiKey })` and POSTs to it. The worker executes the queued payload (`apps/worker/src/workers/digest-pipeline.worker.ts:30-32`), so the request originates **from inside the private network** — the ideal pivot for reaching cloud metadata (`169.254.169.254`), Postgres, Redis, or RustFS admin ports. The CORS config explicitly allows the `x-ai-provider` header (`apps/api/src/middleware/cors.ts:21`), so this is also reachable cross-origin from any allowed origin.

**(b) Arbitrary RSS feed URL.** `POST /admin/playground/tier1/ingest` accepts `sourceOverrides`; `packages/pipeline/src/sources/config.ts` `mergeSourceConfig` pushes brand-new source definitions, and `packages/pipeline/src/sources/rss.ts:99-104` fetches `feedUrl` server-side. The override schema is `.passthrough()` with `config: z.record(z.string(), z.unknown())` — `feedUrl` is unvalidated. A 5s timeout is set, but there is **no host allowlist or private-range denylist**.

**Fix:** (1) lock down C1 first; (2) validate `baseURL` against a scheme+host allowlist and reject private/link-local/loopback ranges; (3) validate `feedUrl` the same way; (4) drop the `x-ai-provider` header from `allowHeaders`.

---

## C3. Unauthenticated Paddle webhook grants the paid plan to anyone

`apps/api/src/modules/billing/routes.ts:8-17` accepts any JSON body and hands it to `billingService.handlePaddleWebhook`. **No signature verification.** `PADDLE_WEBHOOK_SECRET` is declared in `packages/shared-types/src/env/api.ts:14` and **referenced nowhere else in the codebase** (verified by repo-wide grep). `PADDLE_API_KEY` likewise.

`apps/api/src/modules/billing/service.ts:8-21` grants `plan: "PRO"` and `subscriptionStatus: "active"` for any `data.custom_data.userId` the caller chooses.

```
POST /billing/webhook
{"event_type":"subscription.created","data":{"custom_data":{"userId":"<any user>"},"id":"x","customer_id":"y"}}
→ that user is now PRO
```

**Fix:** verify the Paddle `Paddle-Signature` header with `PADDLE_WEBHOOK_SECRET` before parsing; reject unverified events; never trust `custom_data.userId` without cross-checking it against the Paddle API's transaction record.

---

## C4. Unauthenticated Telegram webhook hijacks any user's delivery channel

`apps/api/src/modules/delivery/routes.ts:4-8` — no auth, no `X-Telegram-Bot-Api-Secret-Token` check. `apps/api/src/modules/delivery/service.ts:20-33`:

```ts
if (text.startsWith("/start")) {
  const payload = text.split(" ")[1];
  await db.update(schema.users)
    .set({ telegramChatId: chatId, telegramUsername: username })
    .where(eq(schema.users.id, payload));   // ← caller-controlled user id
}
```

Anyone on the internet can POST `{"message":{"chat":{"id":"<attacker chat>"},"text":"/start <victim user id>"}}` and rebind the victim's Telegram delivery target to the attacker's chat. User IDs are exposed in the admin API and are predictable/seeded (`usr_admin_01` in `packages/db/src/seed.ts:38`).

**Fix:** verify `X-Telegram-Bot-Api-Secret-Token` against a configured secret; bind via a signed one-time token instead of a raw user id; never accept a bare id to bind a chat.

---

## C5. Stored XSS on the public site — LLM output rendered unsanitized

Full chain, every link verified:

1. `packages/pipeline/src/stages/synthesize.ts:147-157` embeds **raw ingested story titles, URLs and summaries** into the LLM prompt with no delimiting and no instruction to ignore embedded instructions → **prompt injection**.
2. The model is asked to "Return ONLY valid HTML content"; `synthesize.ts:164-168` embeds the result **raw** into `contentHtml`.
3. `packages/pipeline/src/stages/synthesize.ts` → `generateAndPersistBlogPost` persists it to `content.content_html`.
4. `apps/api/src/modules/blog/routes.ts` `GET /:slug` returns it, unauthenticated.
5. `apps/web/src/app/blog/[slug]/page.tsx:270` renders it via **`dangerouslySetInnerHTML`** with **no sanitizer at any layer**.

Exploitable end-to-end by an unauthenticated attacker, because C1 + C2(b) let them add their own RSS feed and publish the post.

**Fix:** sanitize with DOMPurify (or `sanitize-html`) at the **write** boundary — never store unsanitized model HTML; keep `dangerouslySetInnerHTML` only on pre-sanitized content; wrap ingested text in a delimiter and instruct the model to treat it as data, never instructions.

---

## C6. Both production Docker images crash on startup

Empirically reproduced. `packages/pipeline/src/ai/index.ts:4` has a **static top-level** `import { pipeline } from "@huggingface/transformers"` → `onnxruntime-node` → a native `.node` binding that `bun build` cannot bundle.

The Dockerfile runner stage copies **only** `dist/` (`apps/api/Dockerfile:27`), no `node_modules`. Running the built bundle exactly as the image does:

```
$ bun dist/index.js
error: Cannot find module '../bin/napi-v3/darwin/arm64/onnxruntime_binding.node'
   from '/private/tmp/fc-runner/dist/index.js'
$ grep -c "listening on" out.log   → 0        ← the server never started
```

Bundle inspection: `api/dist/index.js` → 12 × `onnxruntime-node`, 1 × `onnxruntime_binding`; `worker/dist/index.js` → identical. **Both** `api` and `worker` containers crash-loop in production. The root `package.json` `resolutions`/`overrides` pin `onnxruntime-common@1.21.0` — someone hit this and patched the version instead of the bundling.

**Fix:** make the heavy ML import dynamic (`await import(...)`) **inside** the function that needs it, mark `onnxruntime-node` as `external` for the server bundles, and copy `node_modules` (or the specific native package) into the runner stage — or run the ML worker from source rather than a bundle. Add a container smoke test to CI.

---

## C7. The product never delivers a digest to anyone

The single most consequential defect, and it is invisible.

`apps/worker/src/pipeline/orchestrator.ts:131` is the **only** production `audioQueue.add` call:

```ts
await audioQueue.add("generate-audio", { digestId: masterDigestId });   // ← no userId
```

`apps/worker/src/workers/audio-generation.worker.ts:50-53`:

```ts
if (userId) {                       // ← always false: no caller ever sets userId
  await deliveryQueue.add("send-telegram", { digestId, userId });
  await emailQueue.add("send-email", { digestId, userId });
}
```

`userId` is always `undefined`, so **no delivery job is ever enqueued**. The enqueue code that *would* work exists only in the dead copy (`apps/worker/src/pipeline/stages/cohorts.ts:96,99`), which production never imports.

The live `packages/pipeline/src/stages/cohorts.ts` imports **no queue module at all** (only `db`, `schema`, `rank`, `synthesize`) — it creates per-user digests and then quietly stops.

Meanwhile `orchestrator.ts:178` reports `audioJobsEnqueued: 1 + cohortsProcessed` — a **fabricated count** that over-reports by the number of Pro users. Logs and metrics say success; nothing is sent.

**Fix:** pass `userId` through the job payload, enqueue per-user delivery from the live cohorts processor, and derive `audioJobsEnqueued` from the real number of jobs added.

---

## C8. Authentication is entirely unreachable — no user can sign in or sign up

**Verified empirically.** Better Auth 1.7.7 defaults its routing base to `/api/auth` (`node_modules/.bun/better-auth@1.7.7/.../dist/auth/base.mjs:31`):

```js
const basePath = ctx.options.basePath || "/api/auth";
```

`apps/api/src/auth.ts` never sets `basePath`, and the handler is mounted at `/auth/*` (`apps/api/src/app.ts:41` → `apps/api/src/modules/auth/routes.ts:8`, `.all("/*", (c) => auth.handler(c.req.raw))`). Probing the real handler:

```
/api/auth/get-session      -> 200      ← better-auth's own path
/auth/get-session          -> 404 Not Found   ← the app's actual mount point
```

So **every** better-auth route 404s inside the mounted path. Meanwhile `packages/api-client/src/auth.ts:6` creates the client with `baseURL: "http://localhost:4000"` and no `basePath`, so the client calls `http://localhost:4000/api/auth/*` — a prefix the app **never mounts**.

Two independent mismatches, one outcome: **sign-in, sign-up, session refresh and OAuth callbacks all 404. No session can ever exist.**

**Impact:** The product has no working authentication path. Every `authGuard`-protected route is unreachable for real users. This is also *why* C1 has gone unnoticed: with no session ever present, the missing admin guard never has anything to guard against — the platform currently runs wide open by default. It also invalidates the security model the rest of the code assumes; there is no "authenticated user" in the running system to escalate from.

**Fix:** set `basePath: "/auth"` in `betterAuth({...})` (keeping the `/auth` mount), **or** mount the handler at `/api/auth` and leave the client alone. Then add a regression test asserting `GET /auth/get-session` returns 200/401 — **never 404**. Fix this *together with* C1, or the app remains wide open.

Note: `GET /auth/session` (the type-safe endpoint at `apps/api/src/modules/auth/routes.ts:9`) is *also* unreachable independently — the `.all("/*")` catch-all is registered first and is a terminal handler, so it answers before the specific route is ever considered.

---

# PART 2 — HIGH

### Security

| ID | Finding | Location |
|---|---|---|
| H1 | `PADDLE_API_KEY` declared but never used — Paddle integration is unimplemented; the plan is a DB column only | `packages/shared-types/src/env/api.ts:13` |
| H2 | Rate-limit IP is taken from `x-forwarded-for` with no validation → **trivially spoofable**, limit defeated by rotating the header | `apps/api/src/middleware/rate-limiter.ts:8-11` |
| H3 | Rate limiter **fails open**: Redis errors are swallowed, requests proceed unlimited | `rate-limiter.ts:35-37` |
| H4 | Rate-limit key includes `c.req.path` → per-path buckets, so the effective global cap is unbounded | `rate-limiter.ts:12` |
| H5 | In-memory fallback store is an **unbounded Map** — never swept, grows with distinct paths | `rate-limiter.ts:4, 27` |
| H6 | CORS allows **any** `*.firstcup.tech` subdomain with `credentials: true` — one taken-over subdomain = credentialed data access | `apps/api/src/middleware/cors.ts:16` |
| H7 | `x-ai-provider` header exposed in `allowHeaders` → enables browser-driven SSRF from any allowed origin | `cors.ts:21` |
| H8 | **No CSP and no HSTS** — `secureHeaders` sets only `xFrameOptions`, `xContentTypeOptions`, `referrerPolicy` | `apps/api/src/middleware/secure-headers.ts` |
| H9 | **No global `app.onError`** → every thrown error returns `text/plain "Internal Server Error"` (500), while handled errors return JSON. A JSON client **crashes parsing** it. Verified: `content-type: text/plain`, body `"Internal Server Error"` | `apps/api/src/app.ts` (absence) |
| H10 | Authorization failures return **500 instead of 403/404** — `throw new Error("Unauthorized to view this digest")` | `apps/api/src/modules/digest/service.ts:20-22` |
| H11 | LLM provider **API keys logged in plaintext**: the job payload (which carries `aiConfig.apiKey`) is logged at `info` level | `apps/worker/src/workers/digest-pipeline.worker.ts:19-22` |
| H12 | `getSeedFallbackSignals()` injects **fabricated news stories** when live sources yield < 6 items, recorded as `status: "success"` | `packages/pipeline/src/sources/index.ts:117-134` |
| H13 | Missing credentials → delivery adapters return **`success: true`** with a mock message id; the worker persists `deliveryStatus: "sent"`. A typo'd env var converts the whole delivery system into a no-op that reports 100% success | `apps/worker/src/delivery/telegram.ts:318-329`, `email.ts:334-345` |
| H14 | Unescaped `item.url` in Telegram HTML `href` → attacker-controlled RSS feed injects arbitrary markup into every subscriber's message (email escapes correctly, Telegram does not) | `apps/worker/src/delivery/telegram.ts:155, 174` |
| H15 | Telegram caption >1024 chars is sliced at a fixed offset → **unbalanced HTML** Telegram rejects; the 400 is classified non-permanent and silently dropped | `apps/worker/src/delivery/telegram.ts:168-175, 72-82` |
| H44 | The admin **ban** button is a no-op: `users.banned` is written but **never read anywhere**. A banned user's session keeps full API access, including admin endpoints. `banExpires` is never set either. | `apps/api/src/modules/admin/routes.ts:56-64`; `middleware/auth-guard.ts:9-14` |
| H45 | The unauthenticated playground returns **masked provider API keys** (`key.slice(0,4) + "..." + key.slice(-4)` — 8 real characters each) and internal endpoints such as `http://localhost:20128/v1` | `apps/api/src/modules/playground/routes.ts:183-187`; `packages/pipeline/src/ai/settings.ts:31-35` |
| H46 | Unauthenticated **Redis memory exhaustion**: `POST /admin/playground/session/create` writes 2 keys (2h TTL) plus adds a caller-chosen id to the `playground_sessions` set, which has **no TTL and no size bound**. `listAllSessions` then pipelines one `GET` per member — an N-command amplifier. | `apps/api/src/modules/playground/cache.ts:22-28, 67-107` |

### Data integrity & correctness

| ID | Finding | Location |
|---|---|---|
| H16 | Digest creation is **not idempotent** — no unique constraint on `(userId, digestDate)`; rows are committed before a step that can throw → BullMQ retry creates duplicate digests, orphaning the first | `apps/worker/src/pipeline/orchestrator.ts:80-116`, `packages/db/src/schema/digests.ts:25-31` |
| H17 | `audio_brief` row inserted with `status: "ready"` and a **fabricated** `audioUrl` (`https://storage.firstcup.tech/audio/${digestId}.mp3`) before any audio exists; `provider: "elevenlabs"` hardcoded | `packages/pipeline/src/stages/cohorts.ts:76-84` |
| H18 | `audio_brief.digestId` is **unique** (1 per digest) but one job is enqueued per user → `delivery_status`/`delivery_message_id` are overwritten by whichever worker finishes last; per-user delivery state cannot be tracked | `packages/db/src/schema/digests.ts:62-79` |
| H19 | `preferredDeliveryChannel` is ignored — **every** user gets both Telegram *and* email; the two workers race on the same row | `apps/worker/src/workers/audio-generation.worker.ts:50-53` |
| H20 | No delivery idempotency — jobs enqueued without `jobId`, and neither worker checks `deliveryStatus` before sending → **duplicate sends** on any retry | `telegram-delivery.worker.ts:84-107`, `email.worker.ts:70-94` |
| H21 | **No outbound HTTP timeouts** on Telegram/Resend calls → a hung endpoint holds the BullMQ lock past `lockDuration` (30s), BullMQ declares the job **stalled** and re-runs it → duplicate sends | `telegram.ts:248, 348, 466`, `email.ts:282, 362` |
| H22 | S3 failure → Tier-2 fallback writes into the worker's ephemeral CWD and returns `http://localhost:3000/audio/...` — a link pointing at the **recipient's** own machine | `apps/worker/src/audio/storage/s3.ts:116-132` |
| H23 | S3 + local failure → Tier-3 returns a **hard-coded sample URL** for every user while the job logs "synthesized and stored successfully"; `storageTier` is never persisted | `s3.ts:139-144`, `synthesizer.ts:94-109` |
| H24 | `dominantSource` is `clusterSignals[0].source` — the **first** signal's source, not the most frequent — and it is the ranking weight key, so `SOURCE_WEIGHTS` is applied to the wrong source ~half the time | `packages/pipeline/src/stages/cluster.ts:206`, `rank.ts:76` |
| H25 | Cross-day story linking picks the **first** of up to 100 candidates with **no `orderBy`** → arbitrary rows, non-reproducible linking, story-graph fragmentation | `cluster.ts:171-174, 211-222` |
| H26 | `stories.cluster_id` is never updated when a story is re-linked, but memberships get a fresh UUID → the two columns **permanently diverge** | `cluster.ts:180, 227-237, 258` |
| H27 | `stories.embedding` is `bytea` with a separate `embeddingDim` column, but the code hardcodes `EMBEDDING_DIM = 384` and never reads `embedding_dim` → a model change silently mixes incompatible vectors | `packages/db/src/schema/stories.ts:31-32`, `cluster.ts:10` |
| H28 | **`generateEmbedding` caches a rejected promise.** If the model fails to load once, `embeddingPipelinePromise` stays rejected and every later call re-throws → permanent, unrecoverable failure. The catch returns `new Array(384).fill(0)` — zero vectors never exceed the 0.75 threshold, so **every signal becomes its own cluster** and the pipeline still reports success | `packages/pipeline/src/ai/index.ts:77-102` |
| H29 | `catch` around story inserts swallows **all** errors, not just unique-constraint violations → silent data loss | `cluster.ts:274-276` |
| H30 | **Diversity guardrail is entirely ineffective.** The caps are applied, but the fill-up loop at the end re-adds the excluded stories with no reference to `sourceCount`/`topicCount` → the final selection is always plain top-N-by-score. Proven: a 6-story same-source set violates `maxPerSource=3` in the output | `packages/pipeline/src/stages/rank.ts:113-114, 123-131` |
| H31 | `new users` default to **`plan: "PRO"`** in *both* the DB column and better-auth, and `subscriptionStatus` defaults to `trialing` → the cohort paywall (`plan === "PRO" \|\| active \|\| trialing`) **never engages** | `apps/api/src/auth.ts:43-46`, `packages/db/src/schema/users.ts:28`, `packages/pipeline/src/stages/cohorts.ts:22-27` |
| H32 | Newsletter subscribe does `findFirst` then `insert` with no `ON CONFLICT` → concurrent identical signups produce a unique-violation 500 | `apps/api/src/modules/newsletter/routes.ts:10-29` |
| H33 | `feedback` is accepted for any `digestId` without verifying ownership | `apps/api/src/modules/digest/service.ts:26-38` |

### Frontend / UX

| ID | Finding | Location |
|---|---|---|
| H34 | **Contact form never delivers and always fabricates success** — posts to `http://localhost:3002/contact` (the admin app's port, which has no such route) and always shows a fake ticket number | `apps/web/src/app/contact/page.tsx:77` |
| H35 | **Newsletter form never issues a request** yet reports "subscribed" | `apps/web/src/app/newsletter/page.tsx` |
| H36 | Console preferences save swallows the API error and **still reports "Preferences saved successfully"**; `deliveryCadence`, `voicePersona`, `playbackSpeed`, `emailDigest`, `emailAlerts` are never persisted at all | `apps/console/src/app/preferences/page.tsx:193-195, 180-192` |
| H37 | Console "Send to Telegram" and "Test Telegram connection" are **`setTimeout` fakes** that always report success | `apps/console/src/app/dashboard/page.tsx:339-342`, `preferences/page.tsx:153-159` |
| H38 | Dashboard silently substitutes a **mock digest** when the API fails — no error shown, so users read fabricated content as real | `apps/console/src/app/dashboard/page.tsx:252-255` |
| H39 | **23 hardcoded `localhost:300x` URLs** in production app source — every CTA on the public marketing site points at the visitor's own machine | `apps/*/src/**` (23 sites) |
| H40 | **No `middleware.ts` in any app** and no session check in the admin/console layouts → the entire admin + console UI renders to anonymous visitors | `apps/{admin,console}` |
| H41 | Admin panels **fabricate** metrics: `telegramHandle`, `lastActive`, `audioBrief` script, `durationSec: 88`, `itemCount: 5`, half the dashboard counters | `apps/admin/src/app/{users,digests,dashboard}/page.tsx` |

### Infra / build

| ID | Finding | Location |
|---|---|---|
| H42 | `BETTER_AUTH_SECRET` in `.env` is still the **publicly committed example placeholder**; `docker-compose.prod.yml` passes it as plain `${BETTER_AUTH_SECRET}` with no `:?` guard → an unset secret yields an empty/known signing key → session forgery | `.env:10`, `docker-compose.prod.yml:67` |
| H43 | Prod Compose exposes **unauthenticated Redis** to the host: `valkey` published on `6379` with `--protected-mode no` and no password | `docker-compose.prod.yml` (valkey service) |

---

# PART 3 — MEDIUM

### API
- **M1** `/ready` returns `ready: true` **statically** — it never checks Postgres or Redis, so a broken instance still passes the readiness probe. `apps/api/src/app.ts:26-39`
- **M2** The global rate limiter applies to `/health` and `/ready` → orchestrator health checks can be throttled. `app.ts`
- **M3** No request timeout middleware; no body-size limit. `app.ts`
- **M4** The API has **no graceful shutdown** (the worker does) — SIGTERM drops in-flight requests and leaks the Redis/postgres pools. `apps/api/src/index.ts`
- **M5** `authGuard` hits the DB on every request (no better-auth cookie cache) → a DB round-trip per request on every authenticated route. `middleware/auth-guard.ts:5-7`
- **M6** `roleGuard` uses strict string equality with no role hierarchy or enum; `users.role` is free-text `text` with no DB constraint. `middleware/role-guard.ts:11`, `packages/db/src/schema/users.ts:22`
- **M7** No audit trail for admin actions (who banned whom, when) — `banned`/`banReason` only. `apps/api/src/modules/admin/routes.ts:55-67`
- **M8** `preferredDeliveryChannel` accepts `"whatsapp"`, but no WhatsApp adapter exists → silent non-delivery. `packages/shared-types/src/validators/user.ts:9`, `apps/worker/src/delivery/index.ts`
- **M9** `userPreferences` upsert is read-then-write without a transaction → concurrent PUTs can 500 on the unique violation. `apps/api/src/modules/user/repository.ts`
- **M10** `packages/db/src/index.ts` creates a postgres client at **module import** and falls back to `postgresql://postgres:postgres@localhost:5432/...` instead of failing fast. `packages/db/src/index.ts:8-17`
- **M11** `redis.ts` logs with `console.error` instead of the pino logger → no request-id correlation, and heavy reconnect log spam. `apps/api/src/lib/redis.ts:10-12`
- **M12** `maxRetriesPerRequest: null` (required by BullMQ) also means **non-BullMQ** Redis calls hang forever when Redis is down instead of failing fast. `apps/api/src/lib/redis.ts:6`
- **M13** All 5 declared env schemas are **never executed** — `packages/shared-types/src/env/*` is dead code; no runtime validation of configuration.
- **M14** The `system_setting` table is written only by the seed and read by nothing. `packages/db/src/schema/content.ts`
- **M38** The unauthenticated `POST /admin/playground/tier3/digest` with `persist: true` inserts a digest with `userId: null, isMaster: true` — and `GET /digests/public/latest` serves exactly that master row. An anonymous caller can therefore **inject arbitrary content into the public feed** and flood the `digest` table. `apps/api/src/modules/playground/routes.ts:582-593`; `apps/api/src/modules/digest/repository.ts:29-38`
- **M39** `digestQuerySchema` accepts `status` and `type`, but the service forwards only `limit`/`offset` — the filters are **silently dropped** while the API reports success. `offset` is also unbounded. `apps/api/src/modules/digest/routes.ts:14-19`; `modules/digest/service.ts:6-8`
- **M40** `/tier2/normalize` divides by `normalized.length` with no zero guard → `NaN` → `JSON.stringify` emits `null`, and the endpoint reports `success: true` with `"avgFreshness": null`. `apps/api/src/modules/playground/routes.ts:424-425`
- **M41** `wordsPerMinute` has no lower bound → `wpm: 0` makes `durationSec = Infinity`, serialised as `null` and cached as an invalid metric. Three sibling options (`targetMinDuration`, `targetMaxDuration`, `introTemplate`, `outroTemplate`) are accepted and **never used**. `apps/api/src/modules/playground/routes.ts:110-117`; `packages/pipeline/src/stages/synthesize.ts:64`
- **M42** `GET /admin/playground/queues/:name/jobs` takes an unbounded, unvalidated `limit` and an unvalidated `status` — one call can request up to a million jobs with full payloads in a single JSON response. `apps/api/src/modules/playground/routes.ts:977-985`; `playground/queue-inspector.ts:82-106`
- **M43** The same four BullMQ `Queue` objects are instantiated **twice** (8 objects for 4 names) — `lib/queue-client.ts` and `playground/queue-inspector.ts` each create their own set — so there are two sources of truth for queue names, and nothing is ever closed. `apps/api/src/lib/queue-client.ts:11-25`; `playground/queue-inspector.ts:16-21`
- **M44** Persisting a digest writes the digest row and then inserts each item with a separate awaited `INSERT` and **no transaction** → a failure on item *k* leaves an orphan digest with *k-1* items, and the client gets a 500 with no way to know a digest was partially created. `apps/api/src/modules/playground/routes.ts:582-612`

### Worker / pipeline
- **M15** The GitHub source runs **unauthenticated**; the search API allows ~10 req/min but the config issues 9 searches per run, and `if (!res.ok) continue` silently discards 403s. `packages/pipeline/src/sources/github.ts:19-38`
- **M16** Reddit subreddits are fetched **sequentially**, 5 × 5s timeout = up to 25s serial latency. `packages/pipeline/src/sources/reddit.ts:10-33`
- **M17** Membership and digest-item inserts are one round-trip each, serially. `cluster.ts:257-277`, `orchestrator.ts:96-112`
- **M18** Embedding generation is **strictly serial** over all signals, while the heavier LLM topic call is batched. `cluster.ts:133-138`
- **M19** No cost/usage accounting for either the LLM or the TTS providers — `usage` is discarded. `packages/pipeline/src/ai/index.ts:115-125`
- **M20** The worker exposes **no health/readiness endpoint** and has no `healthcheck:` in Compose. `apps/worker/src/index.ts`
- **M21** The email template has **no unsubscribe link**, though `newsletter_subscribers.unsubscribe_token` exists and is never queried. `apps/worker/src/delivery/email.ts:228-235`
- **M22** Hard-bounce / suppression is correctly *classified* but **never acted on** — the address stays on the list and is mailed daily, risking domain-wide blacklisting. `apps/worker/src/workers/email.worker.ts:97-118`
- **M23** Three conflicting date/timezone conventions: the blog slug uses UTC, titles use server-local, the cron has no `tz`. `packages/pipeline/src/stages/synthesize.ts:117-121`, `apps/worker/src/cron/schedulers.ts:10`
- **M24** The `deliveryHour` preference is stored and rendered in the UI but **never read** — the only scheduler is a global `0 6 * * *` cron. `packages/db/src/schema/users.ts:122`, `apps/worker/src/cron/schedulers.ts:8`
- **M25** `generateCompletion` has **no retry** and `max_tokens: 2000` can truncate HTML mid-tag → malformed markup persisted and rendered. `packages/pipeline/src/ai/index.ts:117-131`
- **M26** The AI/audio provider settings are stored in a **process-local memory cache** — lost on restart, invisible to the worker process, and divergent across replicas. `packages/pipeline/src/ai/settings.ts:36,74`, `audio/settings.ts:36,81`

### Frontend
- **M27** `--border` / `--input` tokens are **1.33:1** (light) and **1.43:1** (dark) against the 3:1 required for UI components → WCAG AA fail on every form border. `packages/ui/src/styles.css`
- **M28** The destructive Alert is **4.12:1** (light) / **3.93:1** (dark) against 4.5:1 required → WCAG AA fail on the error-surfacing path. `packages/ui/src/styles.css`
- **M29** The `Dialog` focus trap's `getFocusableElements` matches `input[type="hidden"]` and omits `iframe`/`object`/`embed`/`summary`/`[contenteditable]` — latent focus-escape risk. `packages/ui/src/components/dialog.tsx:80-97`
- **M30** The `aiConfigStorage` / `ai-provider` round-trip leaks API-key **fragments** through unauthenticated endpoints (H13/C1 combined).
- **M31** The AI Playground's Prompt tab renders **hardcoded text**; the Vector Search tab is a substring match over a constant array; "Run Full Pipeline" silently skips steps while logging success. `apps/admin/src/app/playground/`
- **M32** `@repo/ui` has a single barrel export with no subpath exports and no `"sideEffects": false` → the whole library is pulled into every client bundle.
- **M33** Monolithic page components: console dashboard 893 lines, admin users 721, admin digests 713.

### Data / contracts
- **M34** `stories`, `story_membership`, `digest_item`, `feedback` lack uniqueness and NOT NULL constraints the code assumes (the code uses `findFirst` where `findUnique` is meant). `packages/db/src/schema/*.ts`
- **M35** `item_interaction.digest_id` is written with no FK and no index. `packages/db/src/schema/`
- **M36** 12 `shared-types` exports have zero external references (`SkillLevel`, `DigestStatus`, `UserRole`, `DEFAULT_TOPICS`, `AVAILABLE_TOPICS`, `PERSONA_OPTIONS`, …).
- **M37** `stories.cluster_id` and `stories.embedding_dim` are written but never read for filtering.

---

# PART 4 — LOW / BAD PRACTICE

1. `apps/api/src/modules/playground/routes.ts` is **1,111 lines** with 33 endpoints — split it.
2. `apps/console/src/app/dashboard/page.tsx` (893), `apps/admin/src/app/users/page.tsx` (721), `apps/admin/src/app/digests/page.tsx` (713) — split into components and hooks.
3. `packages/api-client` ships **raw TypeScript** as its package entry (`"main": "./src/index.ts"`) and depends on `@repo/api` as a runtime dependency for a type-only import — a dependency-cycle risk that pulls the whole server graph into the Next build.
4. `docker-compose.prod.yml` uses the deprecated `version: "3.8"` key.
5. Unpinned image tags: `minio/minio:latest`, `rustfs/rustfs:latest`, `chainguard/minio:latest`, `oven/bun:1-alpine` — non-reproducible builds and supply-chain exposure. Pin by digest.
6. Dev uses `pgvector/pgvector:pg17`, prod uses `pg16`; dev uses `rustfs/rustfs`, prod uses `minio/minio` — environment drift.
7. The **prod** Compose file is missing the `rustfs-init` bucket-initializer that the dev file has → the audio bucket may never be created in production.
8. **No `.dockerignore`** — the full build context (including `node_modules`) is sent to the daemon on every build.
9. The worker Dockerfile has **no `HEALTHCHECK`**; the API's healthcheck hits `/health`, which is rate-limited.
10. `apps/api/src/index.ts` hardcodes the listen port but `docker-compose.prod.yml` does not expose `API_PORT`/`PORT` consistently.
11. `packages/db/src/seed.ts` uses `config({ path: "../../.env" })` — resolved against **CWD**, not the file, so it breaks when run from the repo root.
12. `packages/db/src/seed.ts` **deletes all 16 tables' contents with no production guard** — `bun run db:seed` against a production `DATABASE_URL` wipes every account. There is no `if (NODE_ENV === "production") throw`.
13. `packages/db/src/seed.ts` creates an admin at a hardcoded id (`usr_admin_01`) with `emailVerified: true` and **no credential row** — and that id is publicly known, making it a target for the C4 webhook.
14. `roleGuard(requiredRole: string)` takes a bare string instead of a typed union — a typo silently locks admins out.
15. `roleGuard` uses strict equality with no hierarchy — no support for a superadmin tier.
16. `packages/db/src/seed.ts` uses `console.log` instead of the structured logger.
17. `packages/pipeline/src/ai/index.ts` uses `console.error` instead of the structured logger → no request-id correlation in the pipeline's most failure-prone path.
18. `apps/api/src/middleware/logger.ts` special-cases `/admin/playground/queues/status` with a magic string comparison rather than a route-aware flag.
19. `apps/api/src/lib/queue-client.ts` passes the **same** Redis instance to four BullMQ queues; BullMQ recommends a dedicated connection for blocking operations.
20. `packages/pipeline/src/ai/settings.ts` `saveAISettings` accepts `activeProvider`/`model` with **no runtime validation** (only a TS cast) → an arbitrary string can be persisted.
21. `packages/db/src/seed.ts` hardcodes real-looking emails (`shakil@firstcup.tech`, `admin@firstcup.tech`).
22. `apps/worker/src/delivery/email.ts` escapes HTML but does not validate the URL **scheme** (`javascript:` survives).
23. `packages/api-client/src/index.ts` has no error normalisation — a `text/plain` 500 from H9 breaks `.json()`.
24. `.env.example` omits `GITHUB_TOKEN`, `DEEPGRAM_API_KEY`, `SENTRY_DSN`, `KOKORO_*`, `LLM_BASE_URL`, `OPENROUTER_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY` — all of which the code reads.
25. `apps/api/src/auth.ts` `trustedOrigins` is a hardcoded list rather than env-driven — production domains must be edited in source.
26. `apps/api/src/app.ts` mounts `/health` and `/ready` **before** the rate limiter but they still get rate-limited (see M2).
27. `tests/tsconfig.json` exists but **nothing references it** — the root `tests/` tree is never typechecked.
28. `docker-compose.prod.yml` `api` service does not receive `S3_*`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, or `OPENAI_API_KEY`, yet the playground (in the API process) calls all of them.
29. `apps/worker` has no `build` output hygiene — `dist/` is gitignored but the worker bundles 6.17 MB with a broken native dependency.
30. `.gitignore` ignores `bun.lockb` but the repo uses the text `bun.lock` — the legacy entry is noise.
31. **`x-request-id` is reflected back verbatim with no validation** — a value containing CRLF makes the response header setter throw → an unhandled exception → **500 on any request**; a 5,000-char id is accepted and echoed into both the header and the log line. `apps/api/src/middleware/request-id.ts:4-7`
32. `GET /auth/session` is unreachable: the `.all("/*")` better-auth catch-all is registered **first** and is a terminal handler, so it answers before the specific route is considered — making the `authGuard` on it dead code. `apps/api/src/modules/auth/routes.ts:6-13`
33. In production the session cookie is scoped to `.firstcup.tech`, so it is sent to and readable by **every** subdomain — one XSS on the marketing site yields the API session cookie for the whole estate. Use host-only or `__Host-` cookies. `apps/api/src/auth.ts:5-6, 19-24`
34. Admin list endpoints hard-limit to 50 with no pagination, search or filter, while the admin UI keeps `roleFilter`/`statusFilter`/`searchQuery` state; the blog client sends `?limit=20`, which the API ignores. `apps/api/src/modules/admin/routes.ts:35-51`; `modules/blog/routes.ts:6-12`
35. `timezone` is accepted as an arbitrary string and persisted — `"Not/AZone"` yields `Invalid Date`/NaN downstream in date formatting and cron selection. Validate against `Intl.supportedValuesOf('timeZone')`. `packages/shared-types/src/validators/user.ts:16`
36. `updateProfile` spreads the validated body wholesale into `.set()`. **Not currently exploitable** — zod v4 strips unknown keys, so `role`/`plan` cannot be smuggled in — but it is one validator relaxation (`.passthrough()`, or a new `users` column) away from self-service admin escalation. Use an explicit column allowlist. `apps/api/src/modules/user/repository.ts:14-21`
37. The API's entire test suite is **4 happy-path assertions** (health, ready, security headers, 404) — no authentication, authorisation or input-validation test at all. C1, C3, C4 and C8 are all invisible to CI; a single assertion that an unauthenticated admin request returns 401 would have caught them. `apps/api/src/app.test.ts:1-37`
38. `/newsletter/unsubscribe` never verifies the token was previously valid or unused, and there is no rate limit on token guessing. `apps/api/src/modules/newsletter/routes.ts:33-42`

---

# PART 5 — TEST & CI GAPS

### The test suite validates code that never runs
`apps/worker/src/pipeline/pipeline.test.ts` imports **only** `./stages/cluster`, `./stages/normalize`, `./stages/rank` — the **dead copy**. The live `@repo/pipeline` stages have **zero** test coverage (repo-wide grep for `@repo/pipeline` in any `.test.ts` → no hits). The two copies already disagree: `EMBEDDING_DIM` **384** (live) vs **256** (dead), real model embeddings vs deterministic hashes, and the dead copy has a `TOPIC_KEYWORD_MAP` the live one lacks.

> The 24 passing pipeline tests would **fail** if rewritten against the production code. That is the whole problem.

### Concrete gaps
- **22 TypeScript errors in `tests/`** (`tests/tsconfig.json` → 9× TS2339, 5× TS2769, 4× TS7016, 2× TS2345, 1× TS7006, 1× TS2367) that CI never sees, because `turbo typecheck` only covers workspace packages and the root `tests/` tree belongs to none.
- **CI has no Postgres or Redis service**, yet sets `DATABASE_URL`/`REDIS_URL`. Every test therefore runs against nothing — no integration test can pass.
- **No container smoke test.** C6 (both images crash on startup) would have been caught by `docker build` + `docker run` + a health probe.
- **No schema-drift check.** `drizzle-kit generate` currently reports "No schema changes" (verified), but nothing enforces it in CI.
- **No coverage thresholds**, no coverage reporting.
- **No dependency audit**, no secret scanning, no lockfile-integrity beyond `--frozen-lockfile`.
- **No `bun test` for the root `tests/` tree as a distinct job** — it runs incidentally under `bun test`, and its 17 e2e files are excluded from `turbo test`.
- **No lint/typecheck of `tests/`** → the e2e suite can rot silently.

---

# PART 6 — PERFORMANCE OPTIMIZATIONS

| # | Optimization | Location | Expected effect |
|---|---|---|---|
| P1 | Batch embeddings with bounded concurrency (4–8) instead of serial `await` per signal | `packages/pipeline/src/stages/cluster.ts:133-138` | Largest single latency win — removes ~153 serial inferences |
| P2 | Bulk-insert digest items and story memberships via `db.insert().values([...])` | `cluster.ts:257-277`, `orchestrator.ts:96-112` | Removes O(n) round-trips; cuts lock-hold time below the 30s stall threshold |
| P3 | Fetch Reddit subreddits in parallel with `Promise.all` | `packages/pipeline/src/sources/reddit.ts:10-33` | Up to 25s → ~5s |
| P4 | Cache `extractTopics` by a normalised-title key so a story isn't reclassified daily | `packages/pipeline/src/stages/normalize.ts:115` | Removes most of ~153 LLM calls per run |
| P5 | Enable better-auth's **cookie cache** so `authGuard` stops hitting the DB per request | `apps/api/src/middleware/auth-guard.ts:5-7` | Removes a DB round-trip from every authenticated request |
| P6 | Batch/pipeline the Redis rate-limit `INCR`+`EXPIRE` into one round-trip; use a Lua script for the fallback path too | `apps/api/src/middleware/rate-limiter.ts:16-18` | Halves Redis ops per request |
| P7 | Serve `packages/ui` via subpath exports (`@repo/ui/button`) instead of one barrel | `packages/ui/package.json` | Cuts client bundle size across all three apps |
| P8 | Add `orderBy: desc(lastSeenAt)` to the story candidate query and index `stories(status, last_seen_at)` | `cluster.ts:171-174` | Deterministic linking + index-assisted lookup |
| P9 | Sweep expired rate-limit entries from the in-memory store (or use a TTL map) | `rate-limiter.ts:4` | Fixes an unbounded-memory leak |
| P10 | Record per-digest LLM/TTS usage and cost; add a daily budget alert | `packages/pipeline/src/ai/index.ts`, `audio/types.ts` | Makes the failover spend visible; enables budget caps |
| P11 | Add `GITHUB_TOKEN` and switch GitHub sources to cached/non-search endpoints | `packages/pipeline/src/sources/github.ts` | Stops silent zero-signal runs and rate-limit drops |
| P12 | Server components for static marketing pages; `next/dynamic` for the admin playground | `apps/web`, `apps/admin` | Cuts marketing TTFB and admin JS payload |

---

# PART 7 — FEATURE SUGGESTIONS

### Fix the fiction first (features that exist in the UI but do nothing)
1. **Per-user delivery scheduling** — `deliveryHour` is stored and displayed but never read; only a global `0 6 * * *` cron exists. Add per-cohort scheduling honouring `deliveryHour` + `timezone`.
2. **Persist `deliveryCadence`, `voicePersona`, `playbackSpeed`, `emailDigest`, `emailAlerts`** — all five are local React state today; only `topics`, `deliveryHour`, `timezone`, `skillLevel`, `audioEnabled`, `channelEnabled` are sent.
3. **Real delivery status** — a per-user, per-channel delivery table instead of one `audio_brief.delivery_status` column overwritten by every user.
4. **Honest failure surfacing** — remove every "optimistic success" path that reports success on a failed request (preferences save, contact form, newsletter, dashboard fallback).
5. **A real Vector Search** — the current tab is a substring match over a constant array; implement pgvector or an embedding search over `stories.embedding`.
6. **Working "Run Full Pipeline"** — the playground currently skips steps while logging success.
7. **Real admin metrics** — remove fabricated `telegramHandle`, `lastActive`, `durationSec`, `itemCount`, and the half-populated dashboard counters.

### Genuine new features
8. **Digest quality dashboard** — cluster sizes, topic/source distribution, and the diversity-violation rate (which H30 currently makes meaningless).
9. **Per-user story feedback loop** — `feedback` and `item_interaction` tables exist and are written but nothing reads them back into ranking. Wire them into `rankAndSelectStories` as a personalization signal.
10. **A real embedding model service** — move ONNX inference into a separate, resource-limited service so the API/worker images stay pure-JS and the crash in C6 is structurally impossible.
11. **Cost-per-user dashboard** — attribute LLM + TTS spend per user/cohort (P10).
12. **Audit log for admin actions** — who banned/unbanned/role-changed whom, when.
13. **Suppression management UI** — M22 classifies bounces but nothing acts on them; expose a suppression list.
14. **Per-digest failure alerting** — today a crash-looping worker or a failing source is invisible.
15. **Schema/version migrations for content** — add a `contentVersion` column so blog posts rendered by an old prompt/template can be regenerated.
16. **A11y regression CI** — the WCAG AA claim is currently unenforced; add an axe-core pass plus a computed-contrast check over `packages/ui/src/styles.css`.
17. **Webhook signature verification for Telegram + Paddle**, with a local replay test.
18. **Multi-tenant-safe provider config** — move AI/audio settings from a process-local memory cache to a DB table so the admin console and the worker agree and settings survive a restart.
19. **Content sanitization pipeline** — a dedicated sanitize step with an allowlist, applied at the write boundary and unit-tested against known XSS payloads.
20. **Graceful shutdown + readiness for both services**, with Compose `healthcheck:` on the worker.

---

# PART 8 — REMEDIATION ROADMAP

### Phase 0 — Ship-blocking (this week)
1. **Fix the auth mount path** — set `basePath: "/auth"` in `betterAuth({...})` (or mount at `/api/auth` and align the client). Add a test asserting `GET /auth/get-session` is 200/401, never 404. Fix together with #2 or the app stays wide open. **(C8)**
2. Add `authGuard` + `roleGuard("admin")` to `playgroundRouter`; move its mount **after** `/admin`. **(C1)**
3. Verify the Paddle webhook signature; add the Telegram `secret_token`. **(C3, C4)**
4. Set `BETTER_AUTH_SECRET` to a real value; use `${VAR:?required}` in Compose. **(H42)**
5. Fix the delivery chain: pass `userId` through the audio job and enqueue per-user deliveries. **(C7)**
6. Fix the image crash: dynamic-import the ML runtime, mark it external, copy the native package into the runner stage. **(C6)**

### Phase 1 — Security hardening (1–2 weeks)
7. Validate `baseURL` and `feedUrl` against a scheme/host allowlist; reject private ranges. **(C2)**
8. Sanitize LLM HTML at the write boundary. **(C5)**
9. Add `app.onError` with a JSON error envelope + structured logging; return 403/404 where appropriate. **(H9, H10)**
10. Fix the rate limiter: trusted-proxy-aware IP, fail-closed on Redis errors, sweep the memory store, drop the path from the key. **(H2–H5)**
11. Tighten CORS to an explicit origin list; remove `x-ai-provider` from `allowHeaders`; add CSP + HSTS. **(H6–H8)**
12. Stop logging job payloads; redact API keys; stop returning `maskedKey`/`baseURL` to clients. **(H11, H45)**
13. Enforce `banned`/`banExpires` in `authGuard` and revoke sessions on ban. **(H44)**
14. Bound the `playground_sessions` Redis set (TTL + cap + pagination) and authenticate session creation. **(H46)**
15. Add a request-timeout middleware and a finite `maxRetriesPerRequest` on the API's Redis client; validate `x-request-id`; add a body-size limit. **(M3, M12, L31, L34)**

### Phase 2 — Correctness (2–4 weeks)
16. Make digest creation idempotent (unique constraint + `ON CONFLICT`); wrap multi-table writes in transactions. **(H16, M44)**
17. Add delivery idempotency (`jobId` + a conditional status update). **(H20)**
18. Add outbound HTTP timeouts; raise `lockDuration`. **(H21)**
19. Make audio storage fail loudly instead of returning `localhost`/sample URLs; persist `storageTier`. **(H22, H23)**
20. Fix the diversity guardrail's fill-up loop. **(H30)**
21. Default `plan` to `FREE`; make the paywall gate real. **(H31)**
22. Fix `dominantSource` to the mode; order the story-candidate query; update `cluster_id` on re-link. **(H24–H26)**
23. Reset the rejected `embeddingPipelinePromise` on failure; alert instead of returning zero vectors. **(H28)**
24. Deduplicate the pipeline: delete `apps/worker/src/pipeline/stages` + `sources` and point the tests at `@repo/pipeline`. **(dead-code, H30)**
25. Thread the dropped `status`/`type` digest filters into the repository; bound `offset`; make `/ready` actually probe Postgres + Redis; stop the playground creating `isMaster` digests; guard the NaN/Infinity arithmetic; validate `wordsPerMinute`, `limit` and `status`; persist AI/audio settings to `system_setting`; de-duplicate the BullMQ `Queue` objects. **(M38–M43, M1)**

### Phase 3 — Frontend, data, infra (4–8 weeks)
26. Fix the contact and newsletter forms; remove every optimistic-success path. **(H34–H38)**
27. Replace the 23 hardcoded `localhost` URLs with env-driven config. **(H39)**
28. Add `middleware.ts` route protection to admin and console. **(H40)**
29. Fix the WCAG AA token failures; add axe-core to CI. **(M27, M28)**
30. Add the missing uniqueness/NOT NULL/index constraints; add a drift check. **(M34, M35)**
31. Delete the dead `tests/` type errors and wire `tests/tsconfig.json` into CI; add Postgres + Redis services to CI. **(test gaps)**
32. Add a container smoke test to CI. **(C6 regression guard)**
33. Pin Docker images by digest; add `.dockerignore`; add the prod bucket-initializer; add a worker healthcheck. **(Low 5, 7, 8, 9)**
34. Guard the seed script against production. **(Low 12)**
35. Add the missing API regression tests: every `/admin*` route → 401 without a session, 403 for a non-admin; webhook-signature tests; the auth mount-path test; a `banned`-user test. **(Low 37, L32)**
36. Scope the session cookie per host (`__Host-`), validate `timezone` and `digestItemId` ownership, and use an explicit column allowlist in `updateProfile`. **(Low 33, 35, 36)**

---

## Verification notes & limitations

**Confirmed by execution:** the Hono route-ordering proof (C1); the better-auth `basePath` mismatch — `auth.handler` returns **200** for `/api/auth/get-session` and **404** for `/auth/get-session`, the path the app actually mounts (C8); the `bun install --frozen-lockfile` + `bun build` + standalone-bundle execution that reproduced the ONNX crash (C6); `drizzle-kit generate` reporting "No schema changes" (schema ↔ migration in sync); the 22 `tsc` errors in `tests/`; the Hono default 500 being `text/plain` (H9); the diversity-guardrail violation reproduced with a 6-story same-source set (H30); the computed WCAG contrast ratios (M27, M28).

**Verified by source tracing + repo-wide grep:** all remaining findings. Every claim of the form "X is used nowhere" or "X is dead code" was confirmed by a repo-wide grep, not inference.

**Not verified (environment limits):** no live Postgres or Redis was available, so query plans for the missing-index findings (M34, M35) are inferred from the schema rather than from `EXPLAIN`; the Docker daemon was not running, so C6 was reproduced by replicating the image's exact filesystem layout and executing the bundle standalone rather than by `docker run`; no browser session was available, so focus order and screen-reader announcements are traced rather than observed; no secret values were read or transmitted — `.env` is correctly gitignored and untracked, and no hardcoded credential exists in source.

**Stated as needing runtime confirmation rather than asserted:** the exact BullMQ behaviour for `limit=-1` / `limit=0` on the job-list endpoint (the unbounded-`limit` finding does not depend on it); whether `GET /digests/public/latest` currently renders attacker-injected master digests in production (the *write* path is proven from code); and whether `banned` enforcement or plan gating lives in `apps/worker` rather than `apps/api` — the API-side gaps are confirmed by exhaustive grep of `apps/api/src`, but if gating exists in the worker, the financial impact is realised there instead.
