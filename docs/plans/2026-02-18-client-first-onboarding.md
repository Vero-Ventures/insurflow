# Client-First Onboarding Implementation Plan

**Goal:** Introduce a client-focused onboarding flow that captures essential profile context after authentication and redirects new users into a personalized experience.

**Architecture:** Add a dedicated `user_profile` table keyed by `userId`, expose read/write onboarding APIs under `/api/onboarding/profile`, and route authenticated users through `/onboarding` before their first `/clients` session. Keep implementation small and backwards-compatible by preserving existing auth tables and only adding profile enrichment.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM, Better Auth, Zod, Vitest.

---

### Task 1: Define onboarding domain helpers

**Files:**

- Create: `src/lib/onboarding.ts`
- Test: `src/lib/__tests__/onboarding.test.ts`

1. Write failing tests for profile prefill and completion rules.
2. Run `bun run test:run src/lib/__tests__/onboarding.test.ts` and confirm failure.
3. Implement helper functions and option constants.
4. Run `bun run test:run src/lib/__tests__/onboarding.test.ts` and confirm pass.

### Task 2: Persist onboarding profile data

**Files:**

- Create: `src/server/db/schemas/user-profile-schema.ts`
- Modify: `src/server/db/schemas/index.ts`

1. Add `user_profile` table with required onboarding fields.
2. Wire table + relations into schema barrel exports.
3. Verify types compile with `bun run check`.

### Task 3: Expose onboarding API endpoints

**Files:**

- Create: `src/app/api/onboarding/profile/route.ts`

1. Add authenticated `GET` endpoint for prefill and completion status.
2. Add authenticated `PUT` endpoint with Zod validation and upsert logic.
3. Keep user display name in sync from onboarding first/last name.

### Task 4: Build onboarding UI and routing

**Files:**

- Create: `src/components/onboarding/onboarding-form.tsx`
- Create: `src/app/onboarding/page.tsx`
- Modify: `src/app/providers.tsx`

1. Build onboarding form with required client-first fields.
2. Add server onboarding page that redirects signed-out users to auth and completed users to `/clients`.
3. Set auth post-login redirect to `/onboarding`.

### Task 5: Update product copy for client-first positioning

**Files:**

- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/auth/[path]/page.tsx`

1. Replace advisor-centric language with client-first messaging.
2. Keep visual style and existing structure intact.

### Task 6: Verification

1. Run `bun run check`.
2. Run `bun run test:run`.
3. Run `bun run build`.
4. If build requires missing local env vars, document blocker and exact missing vars.
