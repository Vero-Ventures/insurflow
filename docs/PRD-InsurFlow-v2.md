# InsurFlow v2.0 Product Direction (Current)

## Document Info

| Field        | Value                                        |
| ------------ | -------------------------------------------- |
| Product      | InsurFlow                                    |
| Version      | v2.0                                         |
| Status       | Active build                                 |
| Market       | US life insurance advisors and their clients |
| Last Updated | February 17, 2026                            |

---

## Executive Summary

InsurFlow is moving to a **client-first product path**.

The immediate goal is to give advisors a demo they can use in outreach and live calls, where a prospect can go from first click to clear insight in minutes. Advisor workflows remain important, but they now follow the demo handoff instead of being the starting point.

---

## Problem We Are Solving Right Now

Current outreach relies on advisors sharing a demo. The old flow starts too deep in advisor tooling and does not quickly show value to a prospect.

We need a flow that:

- Is easy to start.
- Feels clear and guided.
- Produces an understandable estimate snapshot.
- Ends with a strong advisor handoff CTA.

---

## Product Strategy

### Phase 1: MVP (Now)

**Goal:** make demo conversion and feedback loops work.

MVP includes:

- Demo client journey entry flow
- Guided intake wizard (about 5-7 minutes)
- Estimate snapshot and education screen
- Advisor handoff step
- Landing page changes that drive traffic to `/demo`
- Documentation and roadmap updates using MVP/Post-MVP language

### Phase 2: Post-MVP

**Goal:** deepen advisor workflows after the demo path proves traction.

Post-MVP focus areas:

- Richer analytics and dashboards
- Additional automation and integrations
- Advanced collaboration features
- More robust compliance and document lifecycle features

---

## Primary Users

### 1) Advisor (Buyer + Operator)

- Uses outbound outreach and live demos to qualify opportunities
- Needs a fast way to show value before asking for full client data

### 2) Client/Prospect (Participant)

- Needs plain-language guidance
- Wants transparent outputs, not black-box numbers

---

## MVP Success Criteria

- Demo can be completed without training.
- A first-time user can reach estimate snapshot in under 7 minutes.
- Handoff CTA is clear and actionable.
- Advisors can run the demo during outreach conversations without friction.

Operational verification:

- `bun run check`
- `bun run test:run`
- `bun run build`

---

## In Scope vs Out of Scope (MVP)

### In Scope

- Demo flow UX and related copy
- Client intake and snapshot presentation
- Advisor handoff flow
- Landing page-to-demo conversion path
- Documentation alignment

### Out of Scope

- Large collaboration systems
- Full workflow automation suites
- New billing model work
- Broad third-party integration layer

---

## Technical Context

Current foundation already in place:

- Next.js 16 App Router + React 19
- TypeScript strict mode
- Drizzle ORM + PostgreSQL
- Better Auth authentication
- Existing calculation and AI endpoints

MVP work should reuse existing APIs/components where possible and avoid broad rewrites.

---

## Delivery Notes

- Use simple language in all user-facing demo copy.
- Keep data entry minimal and progressive.
- Prefer explainability over model complexity in MVP screens.
- Keep docs short and current; avoid speculative roadmap bloat.

---

## Related Documents

- `README.md`
- `docs/insurflow-v2-design-guide.md`
- `docs/insurance-advisor-app-design-guide.md`
- `docs/V2_ERD_DESIGN.md`
