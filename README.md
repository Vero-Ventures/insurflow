## InsurFlow

InsurFlow is a direct-to-consumer (D2C) term life application platform.

The product direction is now **D2C, carrier-agnostic**:

- Lead with a fast, guided eligibility and estimate journey.
- Let consumers create an account and submit an application directly.
- Track application status through provider events.

## Product Direction (Plain English)

InsurFlow is the front door for term life discovery and application:

- Fast guided intake
- Clear, explainable non-binding estimate range
- Submission and status tracking in one flow

The existing calculation engine remains in place as a black-box input to the estimate experience.

## Current Direction (2026)

We are prioritizing one core phase and then follow-on improvements:

- **D2C v1**: Eligibility intake -> estimate preview -> account -> application submission -> status tracking (mock carrier).
- **Post-v1**: Deeper provider integrations and additional lifecycle workflows.

This replaces older tier-based planning docs and sequencing language.

## MVP Scope

Core D2C v1 outcomes:

- Guided intake flow for consumer context capture.
- Estimate preview with conservative non-binding language.
- Account-gated application submission flow.
- Application status tracking powered by mock provider events.
- Updated roadmap/docs language for D2C scope.

What we are building now (tracked in GitHub issues):

- Minimal `CarrierProvider` boundary + mock provider.
- Applications + application events persistence.
- Submission resilience (idempotency, retries, safe errors) and PII-safe audit logging.

## What Exists Today

The codebase already includes:

- Better Auth based auth flows.
- Client domain CRUD (clients, assets, debts, beneficiaries, businesses).
- Core calculation APIs (settling, income replacement, gap analysis).
- AI letter generation endpoint.
- Demo routes under `src/app/demo/*`.

## Explicitly Out of Scope (D2C v1)

- Payments or billing
- Policy purchase/binding
- Policy issuance

## Tech Stack

- Next.js 16 + React 19 + TypeScript strict mode
- Drizzle ORM + PostgreSQL
- Better Auth + Better Auth UI
- Tailwind CSS v4 + shadcn/ui + Recharts
- Bun runtime and scripts

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
- Pre-push may auto-sync your branch with `main`; to intentionally bypass in automation use `SKIP_SYNC_CHECK=1 git push`.
- `scripts/clean-clients.ts` is a destructive local utility that hard-deletes all clients. Do not run against shared or production databases.

## Documentation Index

- Active product direction and scope: `docs/product-direction-alignment.md`
- Archived PRD (previous direction): `docs/PRD-InsurFlow-v2.md`
- Archived design guide (previous direction): `docs/insurflow-v2-design-guide.md`
- Archived advisor research notes: `docs/insurance-advisor-app-design-guide.md`
- Data model status and source of truth: `docs/V2_ERD_DESIGN.md`
