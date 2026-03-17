# Product Direction Alignment (2026)

This page is the shared picture of what InsurFlow is building now.

Use this document as the source of truth for active product scope and messaging direction.

## Current Positioning

InsurFlow is building a digital broker experience for Canadian consumers shopping for term life insurance.

The job is not just to collect an application. The job is to help someone understand what they may need, reduce confusion, and connect them with the best-fit insurance provider through one guided flow.

## Target Market

- Geography: Canada
- Product focus: term life insurance
- Audience: consumers, not advisors
- Primary customer: people who want a simple online way to understand, compare, and apply for term life insurance

In plain English: we are speaking to Canadian consumers who are looking for term life insurance and want a simpler way to choose a provider.

## What InsurFlow Is

InsurFlow is a direct-to-consumer (D2C) term life insurance broker flow.

It helps a person quickly:

- Complete a short Canada-first intake
- See a clear, non-binding estimate and recommendation context
- Get matched or routed toward a best-fit provider
- Create an account, submit an application, and track status updates

The app keeps the existing calculation engine for needs analysis and estimate support.

## What InsurFlow Is Not

InsurFlow is not:

- A licensed insurance carrier
- A generic life-planning or wealth-planning platform
- An advisor-led workspace product as the primary direction
- A policy purchase or issuance workflow in v1

We are building the digital front door and broker experience, not the carrier itself.

## Provider Strategy (Current)

- We are provider-agnostic until live partners are selected.
- We keep a minimal `CarrierProvider` interface and mock provider so the product can work end to end without early vendor lock-in.
- The matching layer should stay simple in v1: enough to support a recommendation or routing decision, not a fully built underwriting marketplace.
- We do not include provider-specific purchase or issuance behavior in v1.

## V1 User Journey

1. Landing page CTA with Canada-first, consumer-first messaging
2. Eligibility intake using plain-language questions
3. Non-binding estimate preview
4. Account creation/login when needed to continue
5. Provider matching or recommendation step
6. Application form with minimal generic fields
7. Review, consent, and disclosure placeholders
8. Submission and status tracking timeline

## V1 Stop Line (Scope Guardrail)

V1 ends at:

- Provider matching or recommendation
- Application submission
- Application status tracking

V1 explicitly excludes:

- Payments
- Policy purchase/binding
- Policy issuance
- Broad advisor workspace expansion
- Deep multi-carrier operational tooling

## Messaging Guardrails

When we write copy or product docs, anchor on these truths:

- Audience first: Canadian consumers shopping for term life insurance
- Tone: clear, reassuring, plain-language, modern
- Promise: help me understand my options and connect me with the right provider
- Avoid: advisor-first language, wealth-planning language, and jargon-heavy insurance copy

## Compliance and Data Handling Baseline (V1)

- Use conservative, non-binding estimate language.
- Use placeholder disclosure copy until legal review is complete.
- Capture explicit consent and authorization to collect and share relevant application information.
- Audit log key application lifecycle events.
- Do not log raw PII.

## Data Model Direction

We are continuing the shift away from advisor-first concepts and toward consumer broker flow concepts:

- From: advisor/client handoff workflows
- To: consumer user + application + provider matching + application events

Estimate artifacts remain inputs to the recommendation and application flow.

## What Waits for Provider Selection

- Provider-specific payload mapping details
- Provider-specific status expansion
- Any purchase or issuance workflow
- Deeper recommendation logic that depends on real partner constraints

## How We Decide What To Build

If a feature does not improve at least one of these, it likely does not belong in D2C broker v1:

- Faster path from interest to estimate
- Higher consumer completion rate
- Better consumer understanding of coverage and next steps
- Better provider-fit matching or routing
- Reliable submission and status tracking
- Lower compliance and security risk

## What Success Looks Like

When this direction is working:

- A first-time Canadian consumer reaches estimate preview quickly.
- The estimate feels understandable and clearly non-binding.
- The consumer feels guided toward the right provider instead of left to compare everything alone.
- The consumer can submit an application without offline broker mediation.
- Status updates are tracked reliably through provider events.
