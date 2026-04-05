## InsurFlow

InsurFlow is a direct-to-consumer (D2C) broker experience for Canadian term life insurance.

The current product direction is **consumer-first, Canada-first, provider-matching**:

- Lead with a fast, guided term life intake and estimate journey.
- Help Canadian consumers understand their coverage needs in plain language.
- Connect each consumer with the best-fit insurance provider through one guided flow.
- Keep submission and application status tracking inside the product experience.

## Product Direction (Plain English)

InsurFlow is the front door for term life discovery, comparison, and application for Canadian consumers:

- Fast guided intake
- Clear, explainable non-binding estimate range
- Provider matching in one flow
- Submission and status tracking in one flow

The existing calculation engine remains in place as an input to the estimate and recommendation experience.

## Current Direction (2026)

We are prioritizing one core phase and then follow-on improvements:

- **D2C broker v1**: Eligibility intake -> estimate preview -> account -> provider matching -> application submission -> status tracking.
- **Post-v1**: Deeper provider integrations, better recommendation quality, and additional lifecycle workflows.

This replaces older tier-based planning docs and sequencing language.

## MVP Scope

Core D2C broker v1 outcomes:

- Guided intake flow for Canadian consumer context capture.
- Canada-first terminology in product copy (province, not state).
- Estimate preview with conservative non-binding language.
- Clear best-fit provider recommendation or matching step.
- Account-gated application submission flow.
- Application status tracking powered by provider events.
- Updated roadmap/docs language for D2C scope.

What we are building now (tracked in GitHub issues):

- Minimal `CarrierProvider` boundary + mock provider while broker positioning is refined.
- Applications + application events persistence.
- Submission resilience (idempotency, retries, safe errors) and PII-safe audit logging.
- Documentation and messaging aligned around Canadian term life consumers.

## What Exists Today

The codebase already includes:

- Better Auth based auth flows.
- Client domain CRUD (clients, assets, debts, beneficiaries, businesses).
- Core calculation APIs (settling, income replacement, gap analysis).
- AI letter generation endpoint.
- Demo routes under `src/app/demo/*`.

It also still contains some legacy advisor-first surfaces that should now be treated as stale unless explicitly marked otherwise in the docs.

## Explicitly Out of Scope (D2C v1)

- Any workflow beyond application submission and status tracking
- Payments or billing
- Policy purchase/binding
- Policy issuance
- Broad advisor-workspace expansion as the primary go-to-market path

## Tech Stack

- Next.js 16 + React 19 + TypeScript strict mode
- Drizzle ORM + PostgreSQL
- Better Auth + Better Auth UI
- Tailwind CSS v4 + shadcn/ui + Recharts
- Bun runtime and scripts

## Observability

- `Axiom` handles structured server logs for API, webhook, auth, and AI flows.
- `PostHog` handles product analytics and funnel visibility.
- `Grafana Cloud` receives managed metrics and traces for API reliability dashboards and alerting.

Observability must stay privacy-safe: do not send insurance application answers, health disclosures, DOB, income, coverage amounts, or freeform prompts to analytics vendors.

## Local Development

1. Install dependencies: `bun install`
2. Start local services: `./scripts/dev-services.sh start`
3. Copy env file values into `.env` (see `.env.example`)
4. Start app: `bun run dev`

Useful commands:

- `bun run check` - lint + typecheck
- `bun run test:run` - unit tests
- `bun run test:e2e` - e2e tests
- `bun run build` - production build
- `bun run verify` - full verification suite
- `bun run db:debug` - inspect local users/clients

## Operational Notes

- API routes should use `withApiHandler(...)` and `parseJsonBody(...)` from `src/lib/api/route-helpers.ts` for consistent auth, validation, and error shape.
- Ownership checks are a security boundary. Reuse helpers in `src/lib/api/client-helpers.ts` and `src/lib/api/resource-helpers.ts`.
- Drizzle migration history may be intentionally re-baselined only during a coordinated empty-database window; when that happens, production and all preview Neon branches should be wiped and recreated together so `bun run db:migrate` starts from the same clean baseline everywhere.
- Pre-push may auto-sync your branch with `main`; to intentionally bypass in automation use `SKIP_SYNC_CHECK=1 git push`.
- `scripts/clean-clients.ts` is a destructive local utility that hard-deletes all clients. Do not run against shared or production databases.

## Documentation Index

- Active product direction and scope: `docs/product-direction-alignment.md`
- Observability runbook: `docs/observability.md`
- Marketing and audience context: `.agents/product-marketing-context.md`
- Archived PRD (previous direction): `docs/PRD-InsurFlow-v2.md`
- Archived design guide (previous direction): `docs/insurflow-v2-design-guide.md`
- Archived advisor research notes: `docs/insurance-advisor-app-design-guide.md`
- Archived advisor workflow spec: `docs/advisor-carrier-shopping-workflow.md`
- Data model status and source of truth: `docs/V2_ERD_DESIGN.md`
