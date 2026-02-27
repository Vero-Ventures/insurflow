# InsurFlow Agent Operating Spec

This document is for autonomous coding agents. It intentionally excludes obvious repo facts and command catalogs. It captures non-obvious constraints that prevent unsafe refactors.

## 1) Context Budgeting (Load Only What You Need)

- Do not ingest broad project context by default. Start from the task surface and load only relevant modules.
- For API work, prioritize: `src/lib/api/route-helpers.ts`, `src/lib/api/client-helpers.ts`, and the target route file.
- For business sub-resources, load `src/lib/api/business-resource-helpers.ts` before changing route handlers.
- For financial logic, load only the specific engine and its tests under `src/lib/financial/**`.
- For auth/runtime issues, load `src/server/better-auth/*`, `src/server/db/index.ts`, and `src/env.js` first.
- For infra/preview behavior, load only `.github/workflows/deploy-preview.yml`, `.github/workflows/cleanup-preview.yml`, and `infra/main.tf`.

## 2) Runtime and Boundary Invariants (Do Not Break)

- Keep auth and DB client creation request-scoped; do not hoist Better Auth/DB initialization to module level.
- Keep `getSession()` uncached; do not wrap with React `cache()`.
- Preserve DB driver branching: Neon URL -> HTTP driver, non-Neon -> postgres TCP driver.
- Keep server-only logic in `src/server/**`; never import server modules into client components.
- Keep PDF routes on Node runtime (`runtime = "nodejs"`).

## 3) API Contract Rules (Required)

- Prefer `withApiHandler(...)` for API routes. It standardizes session checks, UUID validation, ownership checks, and error shape.
- Use `parseJsonBody(...)` and `handleValidationError(...)` helpers; avoid ad-hoc body parsing and validation response formats.
- Treat ownership checks as a security boundary. Reuse shared ownership helpers; do not hand-roll ownership SQL in routes.

## 4) Concurrency and Mutation Safety

- Do not convert atomic ownership updates/deletes into separate check-then-mutate flows.
- Maintain TOCTOU protections in `src/lib/api/resource-helpers.ts` (`EXISTS` ownership checks inside mutation statements).
- For business-shareholder mutations, preserve transaction + business row lock behavior (`withBusinessLock`, `SELECT ... FOR UPDATE`).
- Keep transactional cascade behavior for client deletion atomic.

## 5) Data Modeling and Precision Rules

- Monetary and percentage values are stored as decimal strings in DB schemas. Convert at boundaries, not globally.
- Keep precision-safe math for shareholder ownership in basis points (integer arithmetic). Do not replace with float-only aggregation.
- Soft-delete is default for core entities (`deletedAt`), but allocation rows are intentionally hard-deleted.
- Always filter soft-deleted rows where appropriate (`isNull(deletedAt)`) in application queries.

## 6) Financial Engine Guardrails (High Risk)

- Financial engines are deterministic and side-effect free by design. Preserve purity.
- Do not change rounding/clamping behavior casually; these are part of output stability and downstream expectations.
- Treat jurisdiction/year constants as regulated business assumptions (estate tax/probate tables, actuarial assumptions). Changes require explicit policy/legal product direction.
- Preserve test-backed invariants (for example PV identity and non-negative coverage invariants) when touching formulas.

## 7) Compliance, Audit, and Observability

- Audit logging is best-effort and must not block primary business operations.
- Preserve audit sanitization rules for sensitive fields (`password`, `secret`, `token`) and change detection behavior.
- Preserve request correlation plumbing (`x-request-id`) and structured context enrichment.
- Keep structured logging paths intact; use raw console logging only for explicit fallback behavior.

## 8) AI Generation Constraints

- Reasons-Why letter generation is a compliance workflow, not generic content generation.
- Preserve Gemini feature gating (`isGeminiConfigured`) and graceful `503` degradation when unavailable.
- Do not weaken prompt requirements that enforce formal compliance tone and methodology explanation.

## 9) CI/CD and Infra Couplings (Hidden but Critical)

- Preview deployments depend on GitHub Actions creating Neon branches and writing branch-scoped `DATABASE_URL` into Vercel.
- Cleanup depends on matching branch metadata to remove preview DB/env resources.
- Do not change branch naming conventions in preview workflows without coordinated updates across both create and cleanup workflows.
- CI build currently uses `SKIP_ENV_VALIDATION=true`; do not infer production env correctness from CI build success alone.

## 10) Git Hooks and Automation Behavior

- Pre-push hook may auto-rebase branch onto `origin/main` and can require `--force-with-lease` afterward.
- Automation that cannot perform interactive sync logic should use the documented sync bypass env (`SKIP_SYNC_CHECK=1`) intentionally and explicitly.
- Do not bypass hooks/quality gates by default.

## 11) Bundle/Dependency Control Rules

- Stubbed overrides in `package.json` and externals/output tracing exclusions in `next.config.js` are operational controls for bundle size/runtime compatibility.
- Do not remove stubs/exclusions as "cleanup" unless you verify equivalent behavior and bundle impact.

## 12) Agent Change Policy by Risk Tier

- High-risk paths (require extra scrutiny + tests + explicit rationale in PR notes):
  - `src/server/better-auth/**`
  - `src/server/db/**` and `drizzle/**`
  - `src/lib/financial/**`
  - `src/server/audit/**`
  - `.github/workflows/deploy-preview.yml`
  - `.github/workflows/cleanup-preview.yml`
  - `infra/**`
- Other paths are lower risk but still require scoped verification.

## 13) Minimum Verification Matrix (Task-Scoped)

- API/auth/data mutation changes: run lint+types and relevant unit tests for touched modules.
- Financial changes: run full relevant financial tests, including invariant-focused cases.
- Workflow/infra changes: validate both preview create and cleanup logic paths by inspection.
- Schema/migration changes: preserve migration artifacts and `drizzle/meta/_journal.json` consistency.

## 14) Execution Workflow Expectations (Agent Behavior)

- For non-trivial issues, do a short pre-implementation design pass: propose the viable approaches and state tradeoffs/risks to each one, planning it out execution of a task is the most important part.
- Keep scope tight: implement the smallest valuable slice first; defer optional refactors unless required for correctness/safety.
- Make small, encapsulated commits by logical unit (e.g., validation, core logic, tests), not one large mixed commit.
- Before opening a PR, run the same quality gates CI enforces for the touched surface (lint/typecheck/tests/build as applicable).
- In PR notes, include: what changed, why this approach was chosen, verification performed, and any known follow-ups.

## 15) Explicit Anti-Patterns for Agents

- Do not replace helper-driven route patterns with one-off custom route logic.
- Do not introduce client imports of server modules.
- Do not collapse decimal-string boundaries into pervasive floating-point state.
- Do not remove atomic/transactional protections for ownership invariants.
- Do not convert compliance-oriented errors into silent fallbacks that hide operational failures.
- Do not rewrite preview DB workflow behavior without end-to-end understanding of Neon + Vercel coupling.

## 16) When Unsure

- Prefer minimal, reversible edits.
- Preserve existing invariants/helper patterns and add tests before deeper refactors.
