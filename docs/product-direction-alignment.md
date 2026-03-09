# Product Direction Alignment (2026)

This page is the shared picture of what InsurFlow is building now.

Use this document as the source of truth for active product scope.

## What InsurFlow Is

InsurFlow is a direct-to-consumer (D2C) term life application funnel.

It helps a person quickly:

- Complete a short eligibility intake
- See a clear, non-binding estimate range
- Create an account and submit an application
- Track application status updates

The app keeps the existing calculation engine for needs analysis and recommendation support.

## What InsurFlow Is Not

InsurFlow is not:

- A licensed insurance carrier
- A full wealth-planning platform
- A policy purchase/issuance workflow in v1

We submit applications to a carrier integration boundary and track status responses.

## Carrier Strategy (Current)

- We are carrier-agnostic until a partner is selected.
- We implement a `CarrierProvider` interface + mock provider now.
- We use the mock provider to ship end-to-end product flow without vendor lock-in.
- We keep the interface minimal for v1 and easy to refactor when a real API is chosen.
- We do not include provider-specific purchase or issuance behavior in v1.

## V1 User Journey (D2C)

1. Landing page CTA (Canada-first messaging)
2. Eligibility intake (including province, not state)
3. Non-binding estimate preview
4. Account creation/login (required to submit)
5. Application form (minimal generic fields)
6. Review + consent/disclosure placeholders
7. Submission + status tracking timeline

## V1 Stop Line (Scope Guardrail)

V1 ends at:

- Application submission
- Application status tracking

Stop line rule:

- Any feature beyond submission and status tracking is post-v1.

V1 explicitly excludes:

- Payments
- Policy purchase/binding
- Policy issuance

## Compliance and Data Handling Baseline (V1)

- Use conservative, non-binding estimate language.
- Use generic placeholder disclosure copy pending legal review.
- Capture explicit consent and authorization to collect/share health information.
- Audit log key application lifecycle events.
- Do not log raw PII.

## Data Model Direction

We are shifting from advisor-first concepts to consumer application concepts:

- From: advisor/client handoff workflows
- To: consumer user + application + application events

The estimate artifacts remain inputs to the application flow.

## What Waits for Carrier Selection

- Provider-specific payload mapping details
- Provider-specific status expansion
- Any purchase/issuance workflow

## How We Decide What To Build

If a feature does not improve at least one of these, it likely does not belong in D2C v1:

- Faster intake-to-submit flow
- Higher completion rate
- Clearer consumer comprehension
- Reliable submission + status tracking
- Lower compliance and security risk

## What Success Looks Like

When this direction is working:

- A first-time consumer reaches estimate preview quickly.
- The estimate is understandable and clearly non-binding.
- The consumer can submit an application without advisor mediation.
- Status updates are tracked reliably through provider events.
