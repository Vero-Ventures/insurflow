# Client Report View Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `ClientReportView` into focused sub-components without changing report behavior.

**Architecture:** Keep `ClientReportView` as the composition root for data loading, insurance hook usage, and download handlers. Move header and report sections into presentational components inside `src/components/clients/report/`, and share a small section wrapper so repeated card markup stays consistent.

**Tech Stack:** Next.js, React 19, TypeScript, Tailwind CSS, shadcn/ui, Vitest, Testing Library

---

### Task 1: Lock the intended component API with tests

**Files:**

- Create: `src/components/clients/report/client-report-components.test.tsx`
- Reference: `src/components/clients/client-report-view.tsx`

**Step 1: Write the failing tests**

- Assert `ClientReportHeader` renders the client name, demo badge, and both action buttons when enabled.
- Assert `ClientReportPdfTrigger` renders loading text and disabled state.
- Assert `ClientReportSection` renders title, description, and children.

**Step 2: Run test to verify it fails**

Run: `bun vitest run src/components/clients/report/client-report-components.test.tsx`
Expected: FAIL because the new report components do not exist yet.

### Task 2: Extract focused report components

**Files:**

- Create: `src/components/clients/report/client-report-header.tsx`
- Create: `src/components/clients/report/client-report-pdf-trigger.tsx`
- Create: `src/components/clients/report/client-report-section.tsx`
- Create: `src/components/clients/report/client-report-profile-section.tsx`
- Create: `src/components/clients/report/client-report-financial-inputs-section.tsx`
- Create: `src/components/clients/report/client-report-net-worth-section.tsx`
- Create: `src/components/clients/report/client-report-insurance-section.tsx`
- Create: `src/components/clients/report/index.ts`

**Step 3: Write minimal implementation**

- Build pure presentational components that accept already-computed props.
- Preserve existing markup, copy, and classes.
- Keep download button state text and demo/compliance button rules unchanged.

**Step 4: Run tests to verify they pass**

Run: `bun vitest run src/components/clients/report/client-report-components.test.tsx`
Expected: PASS.

### Task 3: Recompose `ClientReportView`

**Files:**

- Modify: `src/components/clients/client-report-view.tsx`

**Step 5: Replace inline sections with extracted components**

- Keep hook usage, state, totals, and handler logic in the root.
- Import the new report components from `src/components/clients/report/`.
- Reduce the root component to orchestration and prop wiring.

**Step 6: Run focused verification**

Run: `bun vitest run src/components/clients/report/client-report-components.test.tsx src/components/clients/client-report-view-footer.test.tsx`
Expected: PASS.

### Task 4: Run task-scoped quality checks

**Files:**

- Verify only

**Step 7: Run lint + typecheck for touched files**

Run: `bun run check`
Expected: PASS.
