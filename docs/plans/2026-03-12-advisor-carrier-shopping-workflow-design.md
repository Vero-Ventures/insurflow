# Advisor Carrier-Shopping Workflow Implementation Plan (Archived)

> Status note (2026-03-16): This implementation plan belongs to the previous advisor-assisted pivot and is retained for historical context only.
>
> Do not use this plan for current execution. The active direction is the Canadian consumer term life broker model documented in `docs/product-direction-alignment.md`.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Define and validate one MVP advisor carrier-shopping workflow (intake -> compare options -> recommend -> submit/handoff), with explicit scope boundaries and implementation-ready follow-up tickets.

**Architecture:** Keep the current D2C submission path intact and layer an advisor-assisted lane around existing client/application primitives. Reuse current ownership/auth patterns and carrier abstraction points; do not introduce carrier-specific behavior into MVP core routes. Capture workflow logic as a deterministic state contract first, then map APIs/UI to that contract.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Drizzle ORM/PostgreSQL, Better Auth, Vitest, GitHub CLI (`gh`).

---

## Scope Guardrails

- In scope for this plan:
  - A single approved advisor-assisted MVP workflow spec.
  - Data contract and responsibilities for advisor vs client.
  - Follow-up engineering tasks with exact files and test commands.
- Out of scope for this plan:
  - Carrier-specific underwriting/purchase/issuance logic.
  - Payments/billing.
  - Real-time multi-carrier production integrations.

## Assumptions To Preserve

- D2C v1 stop line remains submission + status tracking.
- `CarrierProvider` remains minimal and provider-agnostic.
- Existing D2C routes stay valid for consumer self-serve path.
- Compliance review gates are required before advisor workflow goes live.

## Workflow Contract (Target)

1. Client intake captured (existing D2C intake fields).
2. Advisor opens client profile and requests carrier comparison.
3. System returns normalized option cards (premium range + caveats).
4. Advisor records recommendation with rationale.
5. Client reviews recommendation and confirms handoff.
6. Submission uses existing provider submission pipeline.
7. Status tracking remains existing application timeline.

---

### Task 1: Write the canonical workflow spec artifact

**Files:**

- Create: `docs/advisor-carrier-shopping-workflow.md`
- Reference: `docs/product-direction-alignment.md`
- Reference: `README.md`

**Step 1: Write the failing test**

Create a checklist in `docs/advisor-carrier-shopping-workflow.md` with unchecked required sections:

- Objective
- Actor responsibility matrix
- End-to-end sequence
- MVP in-scope/out-of-scope
- Compliance/licensing checkpoints
- API and UI implications

**Step 2: Run test to verify it fails**

Run: `grep -n "\[x\]" docs/advisor-carrier-shopping-workflow.md`
Expected: no completed checklist items.

**Step 3: Write minimal implementation**

Fill the workflow doc with:

- One canonical sequence diagram (textual).
- Advisor/client responsibility matrix.
- Explicit stop line preserving D2C constraints.

**Step 4: Run test to verify it passes**

Run: `grep -n "## Objective\|## Actor Responsibilities\|## End-to-End Workflow\|## In Scope\|## Out of Scope\|## Compliance Touchpoints\|## API Implications\|## UI Implications" docs/advisor-carrier-shopping-workflow.md`
Expected: all required sections present.

**Step 5: Commit**

```bash
git add docs/advisor-carrier-shopping-workflow.md
git commit -m "docs: define mvp advisor carrier-shopping workflow"
```

---

### Task 2: Add deterministic workflow state contract (pure logic)

**Files:**

- Create: `src/lib/workflows/advisor-shopping-workflow.ts`
- Create: `src/lib/workflows/__tests__/advisor-shopping-workflow.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  ADVISOR_SHOPPING_STATES,
  canTransition,
} from "@/lib/workflows/advisor-shopping-workflow";

describe("advisor shopping workflow transitions", () => {
  it("allows compare -> recommended", () => {
    expect(canTransition("comparison_ready", "recommended")).toBe(true);
  });

  it("blocks intake -> submitted", () => {
    expect(canTransition("intake_ready", "submitted")).toBe(false);
  });

  it("exports stable state list", () => {
    expect(ADVISOR_SHOPPING_STATES).toContain("handoff_confirmed");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run src/lib/workflows/__tests__/advisor-shopping-workflow.test.ts`
Expected: FAIL with module not found.

**Step 3: Write minimal implementation**

```ts
export const ADVISOR_SHOPPING_STATES = [
  "intake_ready",
  "comparison_requested",
  "comparison_ready",
  "recommended",
  "handoff_confirmed",
  "submitted",
] as const;

export type AdvisorShoppingState = (typeof ADVISOR_SHOPPING_STATES)[number];

const ALLOWED_TRANSITIONS: Record<
  AdvisorShoppingState,
  AdvisorShoppingState[]
> = {
  intake_ready: ["comparison_requested"],
  comparison_requested: ["comparison_ready"],
  comparison_ready: ["recommended"],
  recommended: ["handoff_confirmed"],
  handoff_confirmed: ["submitted"],
  submitted: [],
};

export function canTransition(
  from: AdvisorShoppingState,
  to: AdvisorShoppingState,
) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
```

**Step 4: Run test to verify it passes**

Run: `bun run test:run src/lib/workflows/__tests__/advisor-shopping-workflow.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/workflows/advisor-shopping-workflow.ts src/lib/workflows/__tests__/advisor-shopping-workflow.test.ts
git commit -m "feat: add deterministic advisor workflow state contract"
```

---

### Task 3: Define advisor comparison API contract (no carrier lock-in)

**Files:**

- Create: `src/lib/api/advisor-comparison-helpers.ts`
- Create: `src/lib/api/__tests__/advisor-comparison-helpers.test.ts`
- Create: `src/app/api/advisor/clients/[clientId]/carrier-comparison/route.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildComparisonRequest } from "@/lib/api/advisor-comparison-helpers";

describe("buildComparisonRequest", () => {
  it("maps minimum intake fields only", () => {
    const result = buildComparisonRequest({
      province: "ON",
      dateOfBirth: "1990-01-01",
      tobaccoUse: false,
      coverageAmount: "500000",
      termYears: 20,
    });

    expect(result).toEqual({
      province: "ON",
      age: 36,
      tobaccoUse: false,
      coverageAmount: 500000,
      termYears: 20,
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run src/lib/api/__tests__/advisor-comparison-helpers.test.ts`
Expected: FAIL with missing helper.

**Step 3: Write minimal implementation**

- Implement pure mapping and validation helper.
- Route uses `withApiHandler(...)`, UUID validation, and ownership checks.
- Route returns normalized comparison payload only (no submit side effects).

**Step 4: Run test to verify it passes**

Run: `bun run test:run src/lib/api/__tests__/advisor-comparison-helpers.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/api/advisor-comparison-helpers.ts src/lib/api/__tests__/advisor-comparison-helpers.test.ts src/app/api/advisor/clients/[clientId]/carrier-comparison/route.ts
git commit -m "feat: add advisor carrier comparison contract"
```

---

### Task 4: Add recommendation capture + handoff acknowledgement APIs

**Files:**

- Create: `src/app/api/advisor/clients/[clientId]/recommendation/route.ts`
- Create: `src/app/api/d2c/handoff/[clientId]/acknowledge/route.ts`
- Create: `src/lib/api/advisor-recommendation-helpers.ts`
- Create: `src/lib/api/__tests__/advisor-recommendation-helpers.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { recommendationSchema } from "@/lib/api/advisor-recommendation-helpers";

describe("recommendation schema", () => {
  it("requires rationale and selected provider", () => {
    const parsed = recommendationSchema.safeParse({
      providerKey: "mock",
      rationale: "Best fit for client profile",
    });
    expect(parsed.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run src/lib/api/__tests__/advisor-recommendation-helpers.test.ts`
Expected: FAIL with missing exports.

**Step 3: Write minimal implementation**

- Add schema + sanitizer for recommendation text.
- Persist recommendation metadata in workflow-safe storage (or temporary JSON metadata table).
- Add client acknowledgement endpoint that only transitions recommended -> handoff_confirmed.

**Step 4: Run test to verify it passes**

Run: `bun run test:run src/lib/api/__tests__/advisor-recommendation-helpers.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/advisor/clients/[clientId]/recommendation/route.ts src/app/api/d2c/handoff/[clientId]/acknowledge/route.ts src/lib/api/advisor-recommendation-helpers.ts src/lib/api/__tests__/advisor-recommendation-helpers.test.ts
git commit -m "feat: add advisor recommendation and handoff acknowledgement endpoints"
```

---

### Task 5: Add advisor UI workflow shell

**Files:**

- Create: `src/app/advisor/clients/[clientId]/carrier-shopping/page.tsx`
- Create: `src/app/advisor/clients/[clientId]/carrier-shopping/page.test.tsx`
- Create: `src/components/advisor/carrier-option-card.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import CarrierShoppingPage from "@/app/advisor/clients/[clientId]/carrier-shopping/page";

describe("CarrierShoppingPage", () => {
  it("shows comparison and recommendation actions", async () => {
    render(
      await CarrierShoppingPage({ params: { clientId: "test" } } as never),
    );
    expect(screen.getByText(/carrier comparison/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save recommendation/i }),
    ).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run src/app/advisor/clients/[clientId]/carrier-shopping/page.test.tsx`
Expected: FAIL with missing page.

**Step 3: Write minimal implementation**

- Render comparison summary list and provider option cards.
- Add recommendation save CTA and handoff CTA.
- Keep copy explicit that estimates are non-binding.

**Step 4: Run test to verify it passes**

Run: `bun run test:run src/app/advisor/clients/[clientId]/carrier-shopping/page.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/advisor/clients/[clientId]/carrier-shopping/page.tsx src/app/advisor/clients/[clientId]/carrier-shopping/page.test.tsx src/components/advisor/carrier-option-card.tsx
git commit -m "feat: add advisor carrier-shopping workflow shell"
```

---

### Task 6: Add compliance and audit event hooks (best-effort)

**Files:**

- Modify: `src/lib/api/audit-helpers.ts`
- Create: `src/lib/api/__tests__/advisor-audit-events.test.ts`
- Modify: `src/app/api/advisor/clients/[clientId]/recommendation/route.ts`
- Modify: `src/app/api/d2c/handoff/[clientId]/acknowledge/route.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { sanitizeAuditPayload } from "@/lib/api/audit-helpers";

describe("advisor audit sanitization", () => {
  it("redacts token and secret-like fields", () => {
    const payload = sanitizeAuditPayload({
      recommendation: "text",
      token: "abc",
      secret: "xyz",
    });
    expect(payload).toMatchObject({
      recommendation: "text",
      token: "[REDACTED]",
      secret: "[REDACTED]",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test:run src/lib/api/__tests__/advisor-audit-events.test.ts`
Expected: FAIL until advisor event coverage is added.

**Step 3: Write minimal implementation**

- Emit best-effort audit events for:
  - comparison requested
  - recommendation saved
  - handoff acknowledged
- Ensure raw sensitive values are not logged.

**Step 4: Run test to verify it passes**

Run: `bun run test:run src/lib/api/__tests__/advisor-audit-events.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/api/audit-helpers.ts src/lib/api/__tests__/advisor-audit-events.test.ts src/app/api/advisor/clients/[clientId]/recommendation/route.ts src/app/api/d2c/handoff/[clientId]/acknowledge/route.ts
git commit -m "feat: add pii-safe advisor workflow audit events"
```

---

### Task 7: End-to-end verification for touched surfaces

**Files:**

- Verify: all files touched in Tasks 2-6

**Step 1: Write the failing test**

Record expected verification matrix in PR notes:

- API/auth/data mutations: lint + typecheck + module tests.
- UI workflow page tests.

**Step 2: Run test to verify it fails**

Run: `bun run check`
Expected: FAIL initially until all tasks complete.

**Step 3: Write minimal implementation**

Address lint/type errors and flaky tests without broad refactors.

**Step 4: Run test to verify it passes**

Run:

- `bun run check`
- `bun run test:run src/lib/workflows/__tests__/advisor-shopping-workflow.test.ts src/lib/api/__tests__/advisor-comparison-helpers.test.ts src/lib/api/__tests__/advisor-recommendation-helpers.test.ts src/lib/api/__tests__/advisor-audit-events.test.ts src/app/advisor/clients/[clientId]/carrier-shopping/page.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "test: verify advisor carrier-shopping workflow surfaces"
```

---

### Task 8: Create follow-up GitHub tickets linked to #293

**Files:**

- Modify: GitHub issue tracker (no repo file)

**Step 1: Write the failing test**

Draft ticket titles in a local checklist and mark all unchecked.

**Step 2: Run test to verify it fails**

Run: `gh issue list --search "linked:293 advisor carrier"`
Expected: no linked follow-up issues yet.

**Step 3: Write minimal implementation**

Create at least four linked tickets:

1. API comparison contract
2. Recommendation + handoff endpoints
3. Advisor UI shell
4. Compliance + audit coverage

**Step 4: Run test to verify it passes**

Run: `gh issue view 293`
Expected: issue body/comments reference created follow-up tickets.

**Step 5: Commit**

No git commit required for tracker-only updates.

---

## Failure Modes and Guardrails

- Risk: advisor workflow scope conflicts with D2C self-serve assumptions.
  - Guardrail: keep advisor lane additive; do not remove self-serve submit path.
- Risk: accidental carrier-specific lock-in.
  - Guardrail: enforce normalized comparison contracts and provider-agnostic keys.
- Risk: compliance drift from informal recommendation text.
  - Guardrail: require rationale schema + disclosure copy + audit trail.

## Definition of Done

- Workflow spec approved with one canonical sequence.
- In-scope/out-of-scope boundaries are explicit and enforced in tickets.
- Follow-up tasks are implementation-ready with exact files/tests.
- Verification matrix is executable and green before merge.
