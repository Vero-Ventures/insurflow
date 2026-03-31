# DB Baseline Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current Drizzle migration history with a single clean baseline and document the operational reset required for production and preview databases.

**Architecture:** Treat the current schema files under `src/server/db/schemas/` as the source of truth, regenerate Drizzle artifacts from that schema, and keep preview deployment behavior unchanged except for consuming the new baseline chain. Separate repo changes from the actual Neon/Vercel reset so the codebase stays reviewable and the operational wipe is explicit.

**Tech Stack:** Bun, Drizzle Kit, PostgreSQL/Neon, GitHub Actions, Vercel preview envs, Markdown docs.

---

### Task 1: Capture the reset runbook in repo docs

**Files:**

- Create: `docs/plans/2026-03-22-db-baseline-reset.md`
- Modify: `README.md`

**Step 1: Write the docs change**

Add a short operational note to `README.md` explaining that migration history may be intentionally re-baselined only during a coordinated empty-database window and that preview DB branches must be recreated at the same time.

**Step 2: Verify docs render cleanly**

Run: `bun prettier --check README.md docs/plans/2026-03-22-db-baseline-reset.md`
Expected: PASS / no formatting errors.

**Step 3: Commit**

```bash
git add README.md docs/plans/2026-03-22-db-baseline-reset.md
git commit -m "docs: record database baseline reset plan"
```

### Task 2: Regenerate Drizzle baseline artifacts

**Files:**

- Modify: `drizzle/*.sql`
- Modify: `drizzle/meta/*`
- Read: `drizzle.config.ts`
- Read: `src/server/db/schemas/index.ts`

**Step 1: Remove old migration artifacts**

Delete all existing SQL migration files in `drizzle/` and all existing metadata snapshots/journal files in `drizzle/meta/`.

**Step 2: Generate the new baseline**

Run: `bun run db:generate`
Expected: Drizzle writes one new SQL file and fresh metadata reflecting the current schema tree under `src/server/db/schemas/`.

**Step 3: Inspect the generated artifacts**

Confirm there is a single migration chain starting at `0000_*` and that `drizzle/meta/_journal.json` contains one entry only.

**Step 4: Commit**

```bash
git add drizzle
git commit -m "build: rebaseline drizzle migrations"
```

### Task 3: Keep preview deployment assumptions explicit

**Files:**

- Modify: `README.md`
- Read: `.github/workflows/deploy-preview.yml`
- Read: `.github/workflows/cleanup-preview.yml`

**Step 1: Document preview branch behavior**

Document that preview branches created by `.github/workflows/deploy-preview.yml` are disposable and must be recreated after a migration baseline reset because the workflow runs `bun run db:migrate` against fresh Neon branches.

**Step 2: Verify no workflow code changes are needed**

Run: `bun prettier --check .github/workflows/deploy-preview.yml .github/workflows/cleanup-preview.yml README.md`
Expected: PASS / workflows remain unchanged.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: note preview database reset coupling"
```

### Task 4: Verify repo state for the new baseline

**Files:**

- Modify: generated files under `drizzle/`
- Read: `package.json`

**Step 1: Run migration generation idempotency check**

Run: `bun run db:generate`
Expected: No new files or diffs after the first baseline generation.

**Step 2: Run task-scoped quality gates**

Run: `bun run check`
Expected: PASS.

**Step 3: Record the manual production step**

Before any destructive wipe, complete all mandatory gates below:

1. Approval gate (required):
   - Explicit written approval from engineering owner and product owner.
   - Planned execution window and operator-on-call are documented.
2. Backup gate (required):
   - Capture a production backup/snapshot and verify retention location.
   - Export schema + critical data audit artifacts needed for forensic recovery.
3. Restore gate (required):
   - Validate backup restoration in a non-production Neon branch.
   - Record restore duration and confirm it fits outage/rollback expectations.
4. Rollback gate (required):
   - Define go/no-go checkpoint after migrate.
   - Define clear rollback criteria and who can trigger rollback.
5. Coupling gate (required):
   - Confirm preview workflow coupling (`deploy-preview.yml` and `cleanup-preview.yml`) and branch naming assumptions remain unchanged.

Only after all gates pass, execute the manual reset outside the repo:

1. Wipe the production Neon branch/database and any open preview Neon branches.
2. Re-run `bun run db:migrate` against production baseline target.
3. Trigger preview branch recreation (or let next PR sync recreate) so all environments start from the clean baseline.
4. Verify post-reset health: app boot, auth, and migration status checks.

**Step 4: Commit**

```bash
git add drizzle README.md
git commit -m "chore: verify clean database baseline"
```
