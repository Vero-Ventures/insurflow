# Advisor Carrier-Shopping Workflow (Archived)

> Status note (2026-03-16): This document reflects the previous advisor-assisted pivot and is now archived.
>
> Do not use this file for active product direction or roadmap decisions. InsurFlow is now focused on a consumer-first Canadian term life broker experience. Use `docs/product-direction-alignment.md` for current scope.

## Objective

Define one implementation-ready advisor-assisted workflow for partner-carrier shopping that:

- Keeps the current D2C submission + status flow intact.
- Adds a licensed-advisor recommendation step where it creates near-term GTM value.
- Clearly separates MVP scope from post-MVP expansion.

## Decision Summary

Recommended MVP posture: advisor-assisted lane is additive, not a replacement for self-serve D2C.

- Client still owns account creation, consent, and final application submission.
- Advisor owns comparison, recommendation rationale, and handoff guidance.
- Submission and status tracking reuse existing provider and application pipelines.

## Actor Responsibilities

### Client

- Complete intake and fact-finding data.
- Review advisor recommendation and disclosures.
- Confirm handoff and complete consent.
- Submit application and track status.

### Advisor (licensed)

- Review intake completeness for quote shopping.
- Trigger carrier comparison using normalized inputs.
- Record recommendation plus rationale.
- Provide handoff context and next-step guidance.

### System

- Normalize comparison inputs and return provider-agnostic option summaries.
- Enforce ownership, auth, and workflow transitions.
- Preserve auditability (best-effort, PII-safe).
- Keep provider integration behind carrier abstraction.

## End-to-End Workflow

1. Client completes intake (`/apply/intake`) and optional fact-finding.
2. Advisor opens client context in advisor workspace.
3. Advisor requests comparison; system returns normalized carrier option set.
4. Advisor records one recommendation and rationale.
5. Client sees recommendation + disclosures and acknowledges handoff.
6. Client completes consent and submits application (existing submit flow).
7. Client tracks status timeline (existing application status flow).

## Minimal Data Requirements (MVP)

For comparison:

- Province
- Date of birth (or derived age)
- Tobacco use
- Coverage amount
- Term years

For recommendation/handoff:

- Selected provider key
- Recommendation rationale (plain text, bounded length)
- Advisor identifier
- Recommendation timestamp

For submission continuity:

- Existing consent timestamps
- Client ownership and active status checks

## API Implications (MVP)

- Add advisor comparison endpoint for normalized quote-shopping request/response.
- Add recommendation capture endpoint with strict validation.
- Add client handoff acknowledgement endpoint that gates transition to submit-ready.
- Reuse existing submission and status endpoints; do not fork carrier submission logic.

Implementation constraints:

- Use `withApiHandler(...)` for route consistency.
- Reuse shared ownership and UUID validation helpers.
- Keep audit logging best-effort and sanitized.

## UI Implications (MVP)

- Add advisor view for carrier comparison + recommendation capture.
- Add client review block showing recommendation summary and handoff acknowledgement.
- Keep non-binding language explicit on all comparison/recommendation displays.
- Do not add policy purchase or issuance screens.

## Compliance and Licensing Touchpoints

- Advisor lane assumes licensed professional involvement for recommendation step.
- Province handling remains Canada-first.
- Recommendation and handoff actions should be auditable without raw sensitive data.
- Disclosure/legal copy requires product/legal review before launch.

## In Scope (MVP)

- One canonical advisor-assisted workflow.
- One normalized comparison contract.
- Recommendation + handoff data capture.
- Explicit boundaries and follow-up build tickets.

## Out of Scope (MVP)

- Carrier-specific underwriting APIs and purchase flows.
- Payments, binding, issuance, policy servicing.
- Real-time production multi-carrier integrations.
- Advanced advisor analytics dashboards.

## Follow-up Implementation Tickets

1. API: Advisor carrier comparison contract and normalized response shape.
2. API: Recommendation capture + client handoff acknowledgement transitions.
3. UI: Advisor carrier-shopping workspace shell.
4. Compliance/Audit: Advisor workflow lifecycle events, PII-safe.
5. Product/Compliance: Disclosure and licensing review checklist for advisor lane.

## Acceptance Criteria Mapping (Issue #293)

- End-to-end workflow documented: yes.
- Actor responsibilities defined: yes.
- Minimal data for comparison/submission defined: yes.
- API/UI implications listed: yes.
- MVP in-scope vs out-of-scope explicit: yes.
- Compliance/licensing touchpoints called out: yes.
