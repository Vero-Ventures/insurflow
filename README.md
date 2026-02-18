## InsurFlow

InsurFlow is an AI-assisted life insurance planning platform.

The product direction is now **client-first**:

- Lead with a fast, guided client demo experience.
- Turn advisor outreach traffic into a clear value moment in under 7 minutes.
- Hand off cleanly to advisor workflows after the client-facing estimate snapshot.

## Product Direction (Plain English)

InsurFlow is the front door for life insurance planning:

- Fast guided intake
- Clear, explainable estimate (not a black box)
- Strong advisor handoff and next steps

Then we deepen the advisor workflow with saved sessions, recalculation, and compliance-ready outputs.

## Current Direction (2026)

We are prioritizing two delivery phases:

- **MVP**: Demo-first client journey that is easy to test in advisor calls and outbound outreach.
- **Post-MVP**: Deeper advisor operations, richer collaboration, and expanded automation.

This replaces older tier-based planning docs and sequencing language.

## MVP Scope

Core MVP outcomes:

- Guided demo intake flow for client context capture.
- Estimate snapshot with plain-language explanation.
- Advisor handoff step with clear next action.
- Landing page path that drives traffic directly into the demo.
- Updated roadmap/docs language using MVP and Post-MVP.

What we are building next (tracked in GitHub issues):

- Core journey upgrades (intake realism, confidence bands, meeting mode, shareable intake links)
- Workflow bridge (save/resume, life-event recalculation, exports/webhooks)
- Trust layer (assumption versioning, calculation traces, compliance-ready packet)

## What Exists Today

The codebase already includes:

- Better Auth based auth flows.
- Client domain CRUD (clients, assets, debts, beneficiaries, businesses).
- Core calculation APIs (settling, income replacement, gap analysis).
- AI letter generation endpoint.
- Demo routes under `src/app/demo/*`.

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

## Documentation Index

- Product direction and scope: `docs/PRD-InsurFlow-v2.md`
- Team alignment (plain English): `docs/product-direction-alignment.md`
- Client journey UX guide: `docs/insurflow-v2-design-guide.md`
- Advisor research notes (trimmed): `docs/insurance-advisor-app-design-guide.md`
- Data model status and source of truth: `docs/V2_ERD_DESIGN.md`
