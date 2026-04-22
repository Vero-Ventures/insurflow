# Grafana Logs and Prometheus Metrics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Export structured server logs to Grafana OTLP and add a Prometheus scrape endpoint for the current worker without breaking the existing OTLP metrics/traces flow.

**Architecture:** Keep the existing `NodeSDK` bootstrap in `src/server/observability/otel.ts` as the single observability initialization point. Add OTLP log export there, mirror existing structured log events into the OpenTelemetry logs API from `src/server/axiom/index.ts`, and expose Prometheus text format through a Node runtime route that serializes the in-process metrics registry. Keep OTLP push metrics as the primary production signal and treat Prometheus scraping as a compatibility endpoint with explicit serverless caveats and token protection.

**Tech Stack:** Bun, Next.js App Router, OpenTelemetry SDK Node, OpenTelemetry logs API, OpenTelemetry Prometheus exporter, Grafana Cloud, Terraform, Vitest.

---

### Task 1: Add failing tests for OTLP log support and Prometheus helpers

**Files:**

- Modify: `src/server/observability/otel.test.ts`
- Create: `src/server/observability/prometheus.test.ts`
- Create: `src/server/observability/logs.test.ts`

**Step 1: Write failing OTLP tests**

Add tests in `src/server/observability/otel.test.ts` for:

- `buildOtlpSignalUrl(..., "logs")`
- replacing `/v1/logs` suffix when switching to another signal

**Step 2: Write failing Prometheus helper tests**

Add `src/server/observability/prometheus.test.ts` covering:

- auth helper rejects wrong bearer token
- auth helper allows requests when token matches
- text serialization helper returns Prometheus content type metadata

**Step 3: Write failing structured log mapping tests**

Add `src/server/observability/logs.test.ts` covering:

- log level maps to expected OTLP severity
- message becomes record body
- structured fields move into attributes without nesting errors

**Step 4: Run targeted tests and watch them fail**

Run: `bun vitest run src/server/observability/otel.test.ts src/server/observability/prometheus.test.ts src/server/observability/logs.test.ts`

Expected: FAIL for missing `logs` support and missing Prometheus/log mapping helpers.

### Task 2: Implement OTLP log export and structured log mirroring

**Files:**

- Modify: `package.json`
- Modify: `src/server/observability/otel.ts`
- Modify: `src/server/axiom/index.ts`
- Create: `src/server/observability/logs.ts`

**Step 1: Add direct dependencies**

Add direct runtime dependencies for imports used in app code:

- `@opentelemetry/api-logs`
- `@opentelemetry/exporter-logs-otlp-http`
- `@opentelemetry/exporter-prometheus`
- `@opentelemetry/sdk-logs`

**Step 2: Extend the OTLP bootstrap**

Update `src/server/observability/otel.ts` to:

- support `buildOtlpSignalUrl(..., "logs")`
- register OTLP metric reader and Prometheus metric reader together
- register a log record processor that exports to `.../v1/logs`

**Step 3: Mirror structured logs into OTel logs API**

Create `src/server/observability/logs.ts` with:

- a shared server logger from `@opentelemetry/api-logs`
- severity mapping helper
- `emitStructuredLog(event)` helper that converts the existing `LogEvent` shape to OTLP log records

Update `src/server/axiom/index.ts` so every emitted structured log also calls `emitStructuredLog(event)` before Axiom/console delivery.

**Step 4: Re-run targeted tests**

Run: `bun vitest run src/server/observability/otel.test.ts src/server/observability/logs.test.ts`

Expected: PASS.

### Task 3: Expose a protected Prometheus scrape route

**Files:**

- Create: `src/server/observability/prometheus.ts`
- Create: `src/app/api/metrics/route.ts`
- Create: `src/app/api/metrics/route.test.ts`
- Modify: `src/env.js`

**Step 1: Add failing route tests**

Create `src/app/api/metrics/route.test.ts` covering:

- returns `401` when the token is configured but missing
- returns `200` with Prometheus text content type when authorized
- returns `503` if Prometheus exporter is unavailable

**Step 2: Implement minimal Prometheus helpers**

Create `src/server/observability/prometheus.ts` with:

- singleton Prometheus exporter instance configured with `preventServerStart: true`
- `isPrometheusAuthorized(request, token)` helper
- `renderPrometheusMetrics()` helper that collects and serializes resource metrics

Update `src/server/observability/otel.ts` to register the Prometheus reader alongside the OTLP metric reader.

**Step 3: Add the scrape route**

Create `src/app/api/metrics/route.ts` with:

- `runtime = "nodejs"`
- `dynamic = "force-dynamic"`
- bearer-token auth using `PROMETHEUS_METRICS_TOKEN`
- `text/plain; version=0.0.4; charset=utf-8` response
- `cache-control: no-store`

**Step 4: Re-run targeted tests**

Run: `bun vitest run src/server/observability/prometheus.test.ts src/app/api/metrics/route.test.ts`

Expected: PASS.

### Task 4: Document and wire deployment configuration

**Files:**

- Modify: `README.md`
- Modify: `TEAM_SETUP.md`
- Modify: `docs/observability.md`
- Modify: `infra/variables.tf`
- Modify: `infra/main.tf`
- Modify: `infra/terraform.tfvars.example`

**Step 1: Add Prometheus token config**

Document and wire `PROMETHEUS_METRICS_TOKEN` for production and preview Vercel envs.

**Step 2: Update observability docs**

Document:

- Grafana OTLP now receives logs, metrics, and traces
- Axiom remains enabled as the existing structured log sink/fallback path
- `/api/metrics` is worker-local on serverless and should not be treated as fleet-wide truth
- Prometheus scrape must send `Authorization: Bearer <token>`

**Step 3: Verify formatting**

Run: `bun prettier --check README.md TEAM_SETUP.md docs/observability.md infra/main.tf infra/variables.tf infra/terraform.tfvars.example`

Expected: PASS.

### Task 5: Verify implementation and prepare PR

**Files:**

- No new files

**Step 1: Run focused verification**

Run: `bun vitest run src/server/observability/otel.test.ts src/server/observability/logs.test.ts src/server/observability/prometheus.test.ts src/app/api/metrics/route.test.ts src/lib/api/__tests__/route-helpers.test.ts`

Expected: PASS.

**Step 2: Run repo quality gates for touched surface**

Run: `bun run check`

Expected: PASS.

**Step 3: Commit and open PR**

Use conventional commits describing observability changes, push branch, and open a PR summarizing:

- OTLP logs added for Grafana Cloud
- protected Prometheus scrape endpoint added
- docs and Terraform env wiring updated
