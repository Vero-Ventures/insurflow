# Canada-First Consumer Copy Notes

This file tracks copy and positioning rules that should stay true across the product while InsurFlow shifts toward a Canadian term life broker experience.

## Current Messaging Direction

The active copy direction is:

- Canada-first
- Consumer-first
- Term-life specific
- Plain-language
- Recommendation and provider-matching oriented

In plain English, the product should sound like a simple way for Canadians to understand term life insurance and get connected to the right provider.

## Audience Reminder

Write to:

- Canadian consumers
- People shopping for term life insurance
- First-time or low-confidence buyers who want help understanding options

Do not write to:

- Advisors as the default audience
- Wealth planners
- Internal insurance operators

## Copy Rules

- Use `province`, not `state`, in product-facing copy.
- Prefer `provider` over `carrier` in user-facing copy unless legal or operational detail requires `carrier`.
- Prefer `simple`, `clear`, `guided`, and `best-fit provider` over industry-heavy phrasing.
- Keep estimate language non-binding and transparent.
- Do not imply that InsurFlow is itself the insurance company.

## Phrases To Lean On

- A simpler way to shop for term life insurance
- Clear, non-binding estimate
- Find the right provider
- Guided application flow
- Built for Canadian consumers

## Phrases To Avoid

- Advisor handoff
- Advisor workspace
- Client acquisition demo
- Wealth planning platform
- Carrier shopping, when consumer-facing `provider matching` says the same thing more clearly

## Remaining US-Specific Behavior (Intentional Exception)

- The demo estimate screen still renders `RateTableDisplay` using `getStateRateTable(...)` from `src/lib/transparency/rate-tables.ts`.
- That reference table contains US-oriented tax and probate labels/data.

## Why This Still Exists

- The current updates are focused on direction, positioning, and consumer-facing messaging.
- Replacing the underlying transparency dataset is a separate data and modeling task.

## Follow-Up Direction

- Replace transparency table data with a Canada-specific dataset in a dedicated follow-up task.
- Review key landing, intake, estimate, and apply surfaces for `carrier` vs `provider` wording and make the public-facing language more consumer-native.
- Keep the current non-binding estimate disclaimers and methodology visibility behavior unchanged during that migration.
