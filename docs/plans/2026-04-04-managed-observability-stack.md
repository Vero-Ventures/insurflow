# Managed Observability Stack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a managed observability stack that covers product analytics and API reliability without leaking sensitive insurance/compliance data.

**Architecture:** Keep `Axiom` as the structured log sink, restore `PostHog` for client-side product analytics, and add `Grafana Cloud` as the managed metrics/traces backend. Use the shared API route wrapper as the primary server instrumentation point so endpoint telemetry stays consistent, and add explicit privacy guardrails so analytics capture behavior and operations metadata rather than raw form payloads.

**Tech Stack:** Bun, Next.js App Router, Vercel, Axiom, PostHog, Grafana Cloud, OpenTelemetry-compatible instrumentation, Terraform, Markdown docs.

---

## Task 1: Record the observability architecture and rollout constraints

**Files:**

- Create: `docs/plans/2026-04-04-managed-observability-stack.md`
- Modify: `README.md`
- Modify: `TEAM_SETUP.md`
- Read: `AGENTS.md`
- Read: `src/lib/d2c/compliance-config.ts`

**Step 1: Write the docs updates**

Add a short observability section to `README.md` describing the three-system split:

- `Axiom` for structured server logs
- `PostHog` for product analytics
- `Grafana Cloud` for managed metrics/traces/alerts

In `TEAM_SETUP.md`, add a privacy note that analytics events must not include application answers, health disclosures, DOB, income, coverage amounts, or freeform prompts unless explicitly sanitized and approved.

**Step 2: Verify docs formatting**

Run: `bun prettier --check README.md TEAM_SETUP.md docs/plans/2026-04-04-managed-observability-stack.md`
Expected: PASS / no formatting errors.

**Step 3: Commit**

```bash
git add README.md TEAM_SETUP.md docs/plans/2026-04-04-managed-observability-stack.md
git commit -m "docs: record managed observability architecture"
```

## Task 2: Restore environment schema and deployment wiring for observability vendors

**Files:**

- Modify: `src/env.js`
- Modify: `.env.example`
- Modify: `infra/variables.tf`
- Modify: `infra/main.tf`
- Modify: `infra/terraform.tfvars.example`
- Read: `.github/workflows/deploy-preview.yml`

**Step 1: Re-add runtime env declarations**

Update `src/env.js` to declare client-side PostHog variables and server-side Grafana/OpenTelemetry variables. Keep names explicit and scoped:

- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_UI_HOST` (optional deep links)
- `GRAFANA_OTLP_ENDPOINT`
- `GRAFANA_OTLP_HEADERS`
- `GRAFANA_INSTANCE_ID` (optional dashboard links)

Keep them optional so local dev still works without vendor accounts.

**Step 2: Sync examples and Terraform inputs**

Document the same variables in `.env.example` and `infra/terraform.tfvars.example`, then add Terraform variables/resources in `infra/variables.tf` and `infra/main.tf` so production and preview deployments receive PostHog and Grafana Cloud credentials when present.

**Step 3: Verify preview assumptions remain safe**

Inspect `.github/workflows/deploy-preview.yml` and confirm the observability env vars do not interfere with branch-scoped `DATABASE_URL` handling.

**Step 4: Verify formatting**

Run: `bun prettier --check src/env.js .env.example infra/main.tf infra/variables.tf infra/terraform.tfvars.example`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/env.js .env.example infra/main.tf infra/variables.tf infra/terraform.tfvars.example
git commit -m "build: wire observability vendor environment variables"
```

## Task 3: Harden shared API logging for endpoint reliability monitoring

**Files:**

- Modify: `src/lib/api/route-helpers.ts`
- Modify: `src/server/axiom/index.ts`
- Create: `src/server/observability/request-context.ts`
- Create: `src/server/observability/route-summary.ts`
- Test: `src/lib/api/__tests__/route-helpers.test.ts`

**Step 1: Write failing tests for log context**

Add tests covering these cases in `src/lib/api/__tests__/route-helpers.test.ts`:

- request logs include `requestId`
- completion logs include `statusCode`, `duration`, and route pattern
- unauthorized / validation / ownership failures still emit a final response log
- response summaries do not dump large JSON bodies by default

**Step 2: Run the targeted tests to watch them fail**

Run: `bun vitest run src/lib/api/__tests__/route-helpers.test.ts`
Expected: FAIL for missing request correlation / duration / final log assertions.

**Step 3: Implement minimal shared instrumentation**

Create `src/server/observability/request-context.ts` to extract or generate `x-request-id`, normalized path, user agent, and client IP. Create `src/server/observability/route-summary.ts` to convert `NextResponse` objects into safe summaries (`statusCode`, `contentType`, `contentLength`, `isStream`, `isDownload`) instead of raw bodies.

Update `src/lib/api/route-helpers.ts` to:

- add `requestId`, normalized route pattern, and `userAgent` to logger context
- capture per-request duration using `performance.now()`
- emit a single final completion event for all early exits and thrown errors
- log safe summaries instead of `responseBody`

Update `src/server/axiom/index.ts` only if needed to support the new common fields without breaking console fallback.

**Step 4: Re-run targeted tests**

Run: `bun vitest run src/lib/api/__tests__/route-helpers.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/api/route-helpers.ts src/server/axiom/index.ts src/server/observability/request-context.ts src/server/observability/route-summary.ts src/lib/api/__tests__/route-helpers.test.ts
git commit -m "feat: standardize endpoint observability logs"
```

## Task 4: Instrument API routes that bypass shared logging

**Files:**

- Modify: `src/app/api/auth/[...all]/route.ts`
- Modify: `src/app/api/carriers/webhook/route.ts`
- Modify: `src/app/api/demo/report-pdf/route.ts`
- Test: `src/app/api/carriers/webhook/__tests__/route.test.ts`
- Test: `src/app/api/d2c/applications/[clientId]/status/__tests__/route.test.ts`

**Step 1: Add targeted tests where coverage is missing**

Add or extend tests to verify that auth/webhook/demo PDF routes log `requestId`, final status, and duration with the same field names used by `withApiHandler(...)`.

**Step 2: Implement consistent logging in bypass routes**

Wrap manual routes with the same request-context helpers created in Task 3. Keep Better Auth request handling intact, but surround it with request-start, request-complete, and error logging that uses the shared field names.

**Step 3: Re-run targeted tests**

Run: `bun vitest run src/app/api/carriers/webhook/__tests__/route.test.ts src/app/api/d2c/applications/[clientId]/status/__tests__/route.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/app/api/auth/[...all]/route.ts src/app/api/carriers/webhook/route.ts src/app/api/demo/report-pdf/route.ts src/app/api/carriers/webhook/__tests__/route.test.ts src/app/api/d2c/applications/[clientId]/status/__tests__/route.test.ts
git commit -m "feat: cover nonstandard routes with endpoint telemetry"
```

## Task 5: Restore PostHog client analytics with privacy guardrails

**Files:**

- Modify: `package.json`
- Create: `src/components/posthog-provider.tsx`
- Create: `src/lib/posthog.ts`
- Modify: `src/app/providers.tsx`
- Create: `src/lib/analytics/event-schema.ts`
- Test: `src/app/providers.test.tsx`

**Step 1: Add the failing integration test**

Create or extend `src/app/providers.test.tsx` to assert that the root provider tree can render with analytics disabled and with PostHog env vars present.

**Step 2: Install the analytics dependency**

Add `posthog-js` to `package.json` using the repo package manager.

Run: `bun install`
Expected: lockfile updates cleanly.

**Step 3: Restore the provider and helper**

Recreate `src/components/posthog-provider.tsx` and `src/lib/posthog.ts` based on the prior integration, but tighten the API:

- expose only typed event capture helpers
- no raw arbitrary payload passthrough from UI code
- skip initialization when keys are absent
- avoid capturing sensitive route params or form state

Update `src/app/providers.tsx` to mount the PostHog provider alongside existing providers.

**Step 4: Define the allowed analytics schema**

Create `src/lib/analytics/event-schema.ts` with a typed allowlist of safe events and properties, for example:

- `auth_signed_in`
- `client_created`
- `client_updated`
- `calculation_run`
- `report_pdf_generated`
- `letter_generation_started`
- `letter_generation_completed`
- `chat_message_sent`
- `d2c_application_started`
- `d2c_application_submitted`

Keep properties to identifiers, counts, booleans, coarse status, and feature flags only.

**Step 5: Run targeted tests**

Run: `bun vitest run src/app/providers.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add package.json bun.lock src/components/posthog-provider.tsx src/lib/posthog.ts src/lib/analytics/event-schema.ts src/app/providers.tsx src/app/providers.test.tsx
git commit -m "feat: restore privacy-safe posthog analytics"
```

## Task 6: Add product-usage events for key user journeys

**Files:**

- Modify: `src/components/clients/create/clients-create-client.tsx`
- Modify: `src/app/clients/[id]/page.tsx`
- Modify: `src/app/api/clients/[id]/calculate/route.ts`
- Modify: `src/app/api/clients/[id]/generate-letter/route.ts`
- Modify: `src/app/api/clients/[id]/chat/route.ts`
- Modify: `src/app/apply/submit/page.tsx`
- Create: `src/lib/analytics/capture.ts`
- Test: relevant existing unit tests for touched modules

**Step 1: Add failing tests for event emission where practical**

Extend existing tests around client creation, calculation, letter generation, chat, and D2C submission to assert that safe analytics hooks are called with the typed schema only.

**Step 2: Implement a shared analytics capture layer**

Create `src/lib/analytics/capture.ts` to centralize event names and property shaping for both client-side PostHog capture and server-side operational events where needed.

**Step 3: Instrument the highest-value journeys first**

Add event capture to these flows only:

- auth/session success
- client creation/update
- insurance calculation run
- report/PDF generation
- AI letter generation start/success/failure
- client chat start/message/error
- D2C application start/submit/failure

Do not add analytics to every click. Keep the first slice focused on funnel and feature adoption.

**Step 4: Run targeted tests**

Run: `bun vitest run src/app/api/clients/[id]/generate-letter/route.test.ts src/app/api/clients/[id]/chat/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/clients/create/clients-create-client.tsx src/app/clients/[id]/page.tsx src/app/api/clients/[id]/calculate/route.ts src/app/api/clients/[id]/generate-letter/route.ts src/app/api/clients/[id]/chat/route.ts src/app/apply/submit/page.tsx src/lib/analytics/capture.ts
git commit -m "feat: track key product journeys"
```

## Task 7: Add managed metrics and traces for API reliability

**Files:**

- Modify: `package.json`
- Modify: `src/instrumentation.ts`
- Modify: `src/instrumentation-client.ts`
- Create: `src/server/observability/otel.ts`
- Create: `src/server/observability/metrics.ts`
- Create: `src/server/observability/business-metrics.ts`
- Modify: `src/lib/api/route-helpers.ts`
- Test: `src/lib/api/__tests__/route-helpers.test.ts`

**Step 1: Add failing tests for reliability counters**

Add tests around `withApiHandler(...)` to assert that request counters and latency histograms are emitted for success, auth failures, validation failures, and thrown errors.

**Step 2: Add observability dependencies**

Add the minimum required managed-observability packages for OpenTelemetry/Grafana Cloud export. Keep the dependency set small and compatible with Next.js server runtime.

Run: `bun install`
Expected: dependency install succeeds without bundle regressions in client code.

**Step 3: Implement the OTEL/metrics bootstrap**

Use `src/instrumentation.ts` as the server bootstrap point to initialize metrics/traces export only on the server. Create:

- `src/server/observability/otel.ts` for provider/exporter setup
- `src/server/observability/metrics.ts` for request counters, error counters, latency histograms
- `src/server/observability/business-metrics.ts` for webhook, AI job, and PDF generation counters

Prefer vendor-neutral metric names and labels such as:

- `http.server.requests_total`
- `http.server.request.duration`
- `http.server.errors_total`
- `carrier.webhook.events_total`
- `ai.letter.jobs_total`
- `ai.chat.errors_total`

**Step 4: Hook metrics into request paths**

Update `src/lib/api/route-helpers.ts` and high-value manual routes to increment counters/histograms with route pattern, method, status class, and feature area labels. Avoid high-cardinality labels such as user IDs, client IDs, or freeform error messages.

**Step 5: Re-run targeted tests**

Run: `bun vitest run src/lib/api/__tests__/route-helpers.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add package.json bun.lock src/instrumentation.ts src/instrumentation-client.ts src/server/observability/otel.ts src/server/observability/metrics.ts src/server/observability/business-metrics.ts src/lib/api/route-helpers.ts src/lib/api/__tests__/route-helpers.test.ts
git commit -m "feat: add managed reliability metrics and traces"
```

## Task 8: Document dashboards, alert thresholds, and operator runbooks

**Files:**

- Create: `docs/observability.md`
- Modify: `TEAM_SETUP.md`
- Read: `src/app/api/carriers/webhook/route.ts`
- Read: `src/app/api/clients/[id]/generate-letter/route.ts`
- Read: `src/app/api/clients/[id]/chat/route.ts`

**Step 1: Write the observability runbook**

Create `docs/observability.md` with:

- vendor accounts and env vars
- what each signal type is used for
- dashboard list
- alert list
- privacy redaction rules
- troubleshooting flow for webhook, AI, auth, and DB issues

**Step 2: Define the first dashboard set**

Document these dashboards:

- API overview: request rate, p50/p95 latency, 4xx/5xx rate
- auth overview: sign-in attempts, failures, callback failures
- AI overview: letter/chat starts, completions, failures, latency
- webhook overview: event volume, failed validations, downstream failures
- product funnel: signup -> onboarding -> client create -> calculation -> report/apply

**Step 3: Define the first alert set**

Document initial thresholds such as:

- 5xx rate > 2% for 10 minutes
- p95 latency > 1500ms for 15 minutes on critical routes
- webhook failure count > 5 in 15 minutes
- AI letter/chat failure spike above baseline
- zero successful D2C submissions during business hours after nonzero starts

**Step 4: Verify docs formatting**

Run: `bun prettier --check docs/observability.md TEAM_SETUP.md`
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/observability.md TEAM_SETUP.md
git commit -m "docs: add observability dashboards and alerts runbook"
```

## Task 9: Run task-scoped verification and a full build check

**Files:**

- Modify: touched files above
- Read: `package.json`

**Step 1: Run unit tests for touched observability surfaces**

Run: `bun run test:run`
Expected: PASS.

**Step 2: Run lint and types**

Run: `bun run check`
Expected: PASS.

**Step 3: Run a production build**

Run: `bun run build`
Expected: PASS.

**Step 4: Smoke-check the managed integrations**

Verify manually in a preview deployment:

1. visit a few authenticated pages and confirm PostHog page/session events appear
2. hit representative API routes and confirm Axiom logs now include `requestId`, `duration`, route pattern, and status
3. confirm Grafana Cloud receives request counters/histograms for the same traffic
4. trigger one safe error path and confirm logs, metrics, and alert conditions line up

**Step 5: Commit**

```bash
git add .
git commit -m "chore: verify managed observability rollout"
```
