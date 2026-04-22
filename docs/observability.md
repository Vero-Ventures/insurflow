# Observability

## Stack

- `Axiom` for the existing structured server log sink and console fallback path
- `PostHog` for product analytics and funnels
- `Grafana Cloud` for OTLP logs, metrics, traces, dashboards, and alerts
- `Prometheus` compatibility via `GET /api/metrics` on the current Node worker

## Privacy Rules

- Never send application answers, health disclosures, DOB, income, coverage amounts, or freeform prompts to analytics vendors.
- Keep PostHog payloads to route, feature, status, counts, and coarse workflow metadata.
- Keep metrics labels low-cardinality. Do not label by `userId`, `clientId`, prompt text, or provider payload fragments.

## Key Signals

- `Axiom`: request logs with `requestId`, route pattern, status, duration, user agent, and safe response summary
- `Grafana Cloud`: OTLP logs plus request counters, latency histograms, 5xx counters, webhook counters, and AI workflow counters
- `Prometheus`: scrape-compatible text view of the current worker's registered OpenTelemetry metrics
- `PostHog`: page views, client creation, D2C submission confirmation, and future funnel events

## First Dashboards

- API overview: request volume, p50/p95 latency, 4xx/5xx rates
- Auth/API edge routes: auth callbacks, webhook volume, PDF generation paths
- AI operations: letter generation outcomes and chat outcomes
- Product funnel: page views, client creation, D2C submission confirmation

## First Alerts

- 5xx rate above 2% for 10 minutes on critical routes
- p95 latency above 1500ms for 15 minutes on core API routes
- carrier webhook failures or rejections spiking above baseline
- AI letter/chat failures spiking above baseline

## Manual Smoke Check

1. Load the app with `NEXT_PUBLIC_POSTHOG_*` configured and confirm page views arrive in PostHog.
2. Hit representative API routes and confirm Axiom logs include `requestId`, `routePattern`, `statusCode`, and `duration`.
3. Confirm Grafana Cloud receives OTLP logs, `http.server.requests_total`, and `http.server.request.duration`.
4. Hit `/api/metrics` with `Authorization: Bearer <PROMETHEUS_METRICS_TOKEN>` and confirm Prometheus text output includes the same low-cardinality HTTP metrics.
5. Trigger a webhook or AI failure path and confirm logs plus metrics line up.

## Prometheus Caveats

- `GET /api/metrics` is worker-local on serverless platforms. Treat it as a compatibility endpoint, not fleet-wide truth.
- Prefer Grafana OTLP push data for production dashboards and alerts.
- Keep `PROMETHEUS_METRICS_TOKEN` set anywhere the scrape route is enabled so the endpoint stays protected.
