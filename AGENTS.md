# InsurFlow Agent Guide

## Project Overview

InsurFlow is an AI-integrated InsurTech SaaS platform for life insurance advisors. It modernizes financial needs analysis workflows by replacing archaic spreadsheets with a cutting-edge web application featuring complex financial calculators, interactive dashboards, and GenAI-powered document generation.

- Next.js 16 App Router app in `src/app` with server helpers in `src/server`
- Drizzle ORM for database access with PostgreSQL (Neon in production)
- Authentication via Better Auth
- Global styles in `src/styles/globals.css`; static assets in `public`

## Key Modules

1. **Financial Engines**: Calculators for Settling Requirements (Probate, Final Taxes), Income Replacement, and Corporate Shareholder Analysis (EBITDA contribution, Key Person risks)
2. **Interactive Dashboard**: Visual reports using Recharts for Net Worth, Tax Burdens, and Liquidity scenarios
3. **GenAI Co-Pilot**: LLM integration (OpenAI/Gemini) for auto-generating compliance documents ("Reasons Why" letters) and cover letters
4. **SaaS Infrastructure**: Multi-tenancy, subscription gating (Stripe), secure document handling (UploadThing)

## Getting Started

- `bun install` to install dependencies tracked in `bun.lock`
- `docker compose up -d postgres` to launch the local database container before running Drizzle commands or local dev
- Copy required env vars into `.env`; validation happens in `src/env.js`
- `./scripts/dev-services.sh start|stop|status` wraps `docker compose` to manage local Postgres without recreating containers
- `.env.example` documents required variables; replace placeholder strings with environment-specific values in your local `.env`

## Build & Verification Commands

- `bun run dev` — start Docker services, push schema, and run HMR dev server
- `bun run build` — create the production bundle and run type checks
- `bun run preview` — serve the built app for smoke testing
- `bun run check` — run ESLint and TypeScript without emitting output; **run this after finishing edits to verify no lint/type errors**
- `bun run db:generate` / `bun run db:migrate` — generate Drizzle migrations & apply them
- `bun run db:push` — push schema changes directly to database (dev only)
- `bun run db:studio` — open Drizzle Studio for local data inspection

## Code Style & Conventions

- Prettier (`prettier.config.js`) with 2-space indentation; use `bun run format:write`
- ESLint (`eslint.config.js`) + TypeScript enforce modern React rules
- PascalCase for React components, camelCase for vars/functions, kebab-case for route segments under `src/app`
- Keep server-only utilities inside `src/server` to avoid client bundling

## Testing Guidance

- **Framework**: Vitest (when configured) for unit and integration tests
- **Structure**: Mirror source structure with `__tests__/` folders (e.g., `src/lib/__tests__/utils.test.ts`)
- **Patterns**:
  - Use `vi.mock()` for module-level mocking
  - Test happy paths, error scenarios, and edge cases
  - Mock external dependencies (Stripe, OpenAI, etc.) to isolate units
- **Running Tests**:
  - `bun run test` — watch mode for development
  - `bun run test:run` — single run for CI/verification
- **Adding Tests**: Create `__tests__/` folder next to source, name test files `*.test.ts`

## Database & Configuration

- Use Drizzle schema at `src/server/db/schema.ts`; rerun `bun run db:generate` after edits
- Local Postgres defaults come from `docker-compose.yml` (port 5432)
- `DATABASE_URL` should point to local Docker instance for development, Neon for production
- Restart dev server after schema or environment changes
- Do not commit local database artifacts

## Domain-Specific Concepts

### Financial Calculations

- **Settling Requirements**: Probate fees, final income tax, capital gains tax on deemed disposition
- **Income Replacement**: Present value calculations for income streams with inflation adjustment
- **Corporate Analysis**: EBITDA contribution, key person insurance needs, shareholder agreements

### Compliance Documents

- **Reasons Why Letter**: Regulatory document explaining insurance recommendations
- **Cover Letter**: Client-facing summary of financial analysis and recommendations

## Security & Secrets

- Never commit secrets; store credentials securely
- Add new env vars to `src/env.js` so they are validated via `@t3-oss/env-nextjs`
- Be mindful of server-only code paths to keep sensitive logic off the client
- Validate all inputs at API boundaries using Zod schemas

## Git & Collaboration

- Commit subjects: imperative, present tense, under 72 chars (e.g., `Add income replacement calculator`)
- Squash formatting-only changes into the related feature commit
- PRs should link issues, summarize changes, list verification commands, and include UI captures for user-facing work
- **Incremental Commits**: When working on multi-step tasks, create small, focused commits along the way to encapsulate each logical change. This keeps the git history clean and makes code review easier. For example, when adding a new feature:
  1. Commit dependency additions separately
  2. Commit configuration/setup changes
  3. Commit new components/modules
  4. Commit integration changes to existing code

## UI Components

- Shadcn/ui for component primitives; add new components with `npx shadcn@latest add <component>`
- Recharts for financial data visualization
- Tailwind CSS for styling with `prettier-plugin-tailwindcss` for class sorting

## Definition of Done

A task is not complete until:

1. **Linter Pass**: Code passes `bun run check` (ESLint + TypeScript)
2. **Tests Pass**: Relevant unit/integration tests are green
3. **No Regression**: Existing functionality remains unaffected
4. **Documentation**: Update AGENTS.md if new patterns or architecture decisions were established
