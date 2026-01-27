# InsurFlow Agent Guide

## Project Overview

InsurFlow is an AI-integrated InsurTech SaaS platform for life insurance advisors. It modernizes financial needs analysis workflows by replacing archaic spreadsheets with a cutting-edge web application featuring complex financial calculators, interactive dashboards, and GenAI-powered document generation.

This is a **greenfield v2.0 rebuild** - built entirely from scratch using modern architecture, with v1.0 serving only as a functional specification and logic reference.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (Strict Mode)
- **Database**: PostgreSQL (Neon in production) via Drizzle ORM
- **Authentication**: Better Auth with Better Auth UI (`@daveyplate/better-auth-ui`)
- **UI Components**: shadcn/ui, Tailwind CSS v4, Recharts
- **Notifications**: Sonner (toast notifications)
- **Observability**: Axiom (Structured Logging)
- **Services** (planned): Stripe (Payments), UploadThing (File Storage), OpenAI/Gemini (AI features)
- **Runtime**: Bun
- **DevOps**: GitHub Actions, Cloudflare Workers (CI/CD)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/[path]/        # Auth pages (sign-in, sign-up, etc.)
│   ├── api/auth/[...all]/  # Better Auth API routes
│   ├── global-error.tsx    # Global error boundary
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page
│   └── providers.tsx       # Client-side providers (Auth, Theme)
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/                    # Utility functions (cn, etc.)
├── server/
│   ├── axiom/              # Structured logging (Canonical Logging pattern)
│   ├── better-auth/        # Auth configuration
│   └── db/                 # Drizzle ORM schema and client
└── styles/globals.css      # Global styles with CSS variables

infra/                      # Infrastructure documentation
├── main.tf                 # Cloudflare Workers setup reference
├── provider.tf             # Cloudflare provider configuration
├── variables.tf            # Input variables reference
├── outputs.tf              # Output values
└── terraform.tfvars.example # Example variable values

.github/workflows/          # GitHub Actions
├── ci.yml                  # CI pipeline (lint, test, build)
├── deploy-production.yml   # Production deployment to Cloudflare Workers
├── deploy-preview.yml      # Preview deployment with Neon branching
├── cleanup-preview.yml     # Cleanup preview resources on PR close
├── codeql.yml              # CodeQL security analysis
└── security.yml            # Trivy vulnerability scanning
```

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
- `bun run build:cloudflare` — build for Cloudflare Workers using OpenNext
- `bun run preview` — serve the built app for smoke testing
- `bun run preview:cloudflare` — build and preview Cloudflare Workers locally
- `bun run deploy:cloudflare` — build and deploy to Cloudflare Workers
- `bun run check` — run ESLint and TypeScript without emitting output
- `bun run verify` — full verification: lint, typecheck, unit tests, e2e tests, build
- `bun run db:generate` / `bun run db:migrate` — generate Drizzle migrations & apply them
- `bun run db:push` — push schema changes directly to database (dev only)
- `bun run db:studio` — open Drizzle Studio for local data inspection
- `bun run sync` — sync current branch with main (rebase)
- `bun run sync:check` — check if branch is behind main
- `bun run sync:merge` — sync with main using merge instead of rebase

## Code Style & Conventions

- Prettier (`prettier.config.js`) with 2-space indentation; use `bun run format:write`
- ESLint (`eslint.config.js`) + TypeScript enforce modern React rules
- PascalCase for React components, camelCase for vars/functions, kebab-case for route segments under `src/app`
- Keep server-only utilities inside `src/server` to avoid client bundling

## Authentication

Authentication uses Better Auth with Better Auth UI for pre-built components:

- **Auth routes**: `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/magic-link`, `/auth/sign-out`
- **Components**: `<SignedIn>`, `<SignedOut>`, `<UserButton>` from `@daveyplate/better-auth-ui`
- **Provider**: `AuthUIProvider` wraps the app in `src/app/providers.tsx`
- **Config**: `src/server/better-auth/config.ts` - email/password enabled, GitHub OAuth optional

## UI Components

- **shadcn/ui** for component primitives; add new components with `bunx shadcn@latest add <component>`
- **Recharts** for financial data visualization
- **Tailwind CSS v4** for styling with `prettier-plugin-tailwindcss` for class sorting
- **Sonner** for toast notifications (required by Better Auth UI)

Components are installed to `src/components/ui/`. The `cn()` utility in `src/lib/utils.ts` merges Tailwind classes.

## Observability & Analytics

### Structured Logging (Axiom)

InsurFlow uses Axiom for structured logging, following the **Canonical Logging** (Wide Events) pattern from [loggingsucks.com](https://loggingsucks.com).

**Philosophy**: "One Event Per Request" - accumulate context throughout the request lifecycle and emit a single wide event when complete. This reduces noise and adds comprehensive context.

**Usage**:

```typescript
import { createLogger } from "~/server/axiom";

// Create logger with initial context
const logger = createLogger({
  userId: "user_123",
  endpoint: "/api/users",
});

// Add context throughout request
logger.addContext({ operation: "fetchUser" });

// Emit log with complete context
await logger.info("User fetched successfully", {
  statusCode: 200,
  duration: 45,
});

// Always flush at end of request
await logger.flush();
```

**Log Levels**: `debug`, `info`, `warn`, `error`, `fatal`

**Configuration**:

- `AXIOM_TOKEN`: API token from https://app.axiom.co/settings/tokens
- `AXIOM_DATASET`: Dataset name (default: "insurflow")
- `AXIOM_ORG_ID`: Organization ID (optional)

**Fallback**: If Axiom is not configured, logs are written to console in JSON format.

## Testing

### Unit Testing (Vitest)

- **Framework**: Vitest with React Testing Library
- **Config**: `vitest.config.ts` with jsdom environment
- **Structure**: Mirror source structure with `__tests__/` folders (e.g., `src/lib/__tests__/utils.test.ts`)
- **Patterns**:
  - Use `vi.mock()` for module-level mocking
  - Test happy paths, error scenarios, and edge cases
  - Mock external dependencies (Stripe, OpenAI, etc.) to isolate units
- **Running Tests**:
  - `bun run test` — watch mode for development
  - `bun run test:run` — single run for CI/verification
  - `bun run test:coverage` — run with coverage report
- **Adding Tests**: Create `__tests__/` folder next to source, name test files `*.test.ts`

### E2E Testing (Playwright)

- **Framework**: Playwright with Chromium browser
- **Config**: `playwright.config.ts` with auto-start dev server
- **Structure**: All E2E tests in `e2e/` directory (e.g., `e2e/auth.spec.ts`)
- **Patterns**:
  - Use Page Object Model for complex flows
  - Test critical user journeys (auth, main features)
  - Use `test.describe()` to group related tests
- **Running Tests**:
  - `bun run test:e2e` — run all E2E tests headlessly
  - `bun run test:e2e:ui` — open Playwright UI for debugging
- **CI Considerations**: E2E tests run with `CI=true` (single worker, retries enabled)

## Database & Configuration

### Schema Management

Drizzle ORM uses two different workflows:

| Command                      | Purpose                             | When to Use                                             |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `db:push`                    | Directly syncs schema to DB         | **Local dev only** - fast iteration, no migration files |
| `db:generate` + `db:migrate` | Creates and applies migration files | **Production** - trackable, reversible changes          |

**Workflow:**

1. **Local development**: Use `db:push` for quick iteration
2. **Before PR**: Run `db:generate` to create migration files if schema changed
3. **CI tests**: Uses `db:migrate` (ephemeral database)
4. **Production**: GitHub Actions runs `db:migrate` before deployment

### Configuration

- Use Drizzle schema at `src/server/db/schema.ts`; rerun `bun run db:generate` after edits
- Local Postgres defaults come from `docker-compose.yml` (port 5432)
- `DATABASE_URL` should point to local Docker instance for development, Neon for production
- Restart dev server after schema or environment changes
- Do not commit local database artifacts

## Deployment (Cloudflare Workers + GitHub Actions)

InsurFlow deploys to Cloudflare Workers using the `@opennextjs/cloudflare` adapter, which provides full Node.js compatibility via the `nodejs_compat` flag.

### Architecture

| Environment | Worker Name                | URL                                          | Database                     |
| ----------- | -------------------------- | -------------------------------------------- | ---------------------------- |
| Production  | `insurflow`                | https://insurflow.workers.dev                | Neon main branch             |
| Preview     | `insurflow-preview-pr-{N}` | https://insurflow-preview-pr-{N}.workers.dev | Neon `preview/pr-{N}` branch |

### Deployment Workflows

**Production** (`.github/workflows/deploy-production.yml`):

- Triggered on push to `main` branch
- Runs database migrations
- Builds with OpenNext (`bun run build:cloudflare`)
- Deploys via wrangler with secrets

**Preview** (`.github/workflows/deploy-preview.yml`):

- Triggered on PR opened/updated
- Creates isolated Neon database branch
- Runs migrations on the branch
- Deploys as separate Worker with unique name
- Comments on PR with preview URL and Neon branch link

**Cleanup** (`.github/workflows/cleanup-preview.yml`):

- Triggered when PR is closed
- Deletes the preview Worker
- Deletes the Neon database branch

### GitHub Secrets Required

Configure in: Settings → Secrets and variables → Actions → Secrets

| Secret                  | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API token with Workers edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID                             |
| `DATABASE_URL`          | Production Neon connection string                 |
| `BETTER_AUTH_SECRET`    | Session encryption key (min 32 chars)             |
| `NEON_API_KEY`          | Neon API key for database branching               |
| `AXIOM_TOKEN`           | (Optional) Axiom logging token                    |

### GitHub Variables Required

Configure in: Settings → Secrets and variables → Actions → Variables

| Variable          | Description                     |
| ----------------- | ------------------------------- |
| `NEON_PROJECT_ID` | Neon project ID                 |
| `BETTER_AUTH_URL` | `https://insurflow.workers.dev` |
| `AXIOM_DATASET`   | (Optional) Axiom dataset name   |

### Local Development with Cloudflare

```bash
# Preview locally (builds and runs Workers runtime)
bun run preview:cloudflare

# Deploy manually (requires wrangler auth)
bun run deploy:cloudflare
```

### Security Scanning

- **Trivy**: Scans for vulnerabilities in dependencies and IaC misconfigurations
- **CodeQL**: Static analysis for JavaScript/TypeScript security issues
- **Dependency Review**: Blocks PRs introducing high-severity vulnerabilities

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

### Branching Strategy

We use a **protected main** (trunk-based) workflow:

```
feature-branch → PR to main
```

| Branch            | Purpose              | Protection                            |
| ----------------- | -------------------- | ------------------------------------- |
| `main`            | Production releases  | PR required, CI must pass, 1 approval |
| `feat/*`, `fix/*` | Feature/fix branches | None - created from main              |

**Workflow:**

1. Create feature branch from `main`: `git checkout -b feat/my-feature`
2. Make changes, commit with conventional commits
3. Open PR to `main`, get approval, CI must pass → auto-deploys to production

**Branch Naming:**

- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) format, enforced by Commitlint:

- Format: `type(scope): description` (e.g., `feat(auth): add password reset flow`)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`
- The scope is optional but recommended

### Git Hooks (Husky)

| Hook         | When                  | What it Does                                              |
| ------------ | --------------------- | --------------------------------------------------------- |
| `pre-commit` | Before commit created | Runs lint-staged (ESLint + Prettier on staged files)      |
| `commit-msg` | After message entered | Validates conventional commit format                      |
| `pre-push`   | Before push to remote | Auto-syncs with main if behind, runs lint/typecheck/tests |

**Pre-push auto-sync:**

- If your branch is behind main, the hook automatically rebases
- If there are conflicts, it aborts and tells you to run `bun run sync` manually
- If the branch was previously pushed, it reminds you to `git push --force-with-lease`

### CI Pipeline (GitHub Actions)

The CI workflow (`.github/workflows/ci.yml`) runs on all PRs and pushes to main/dev:

| Job         | What it Checks                 |
| ----------- | ------------------------------ |
| `lint`      | ESLint + TypeScript            |
| `test-unit` | Vitest unit tests              |
| `test-e2e`  | Playwright E2E tests           |
| `build`     | Production build succeeds      |
| `ci-pass`   | Gate job - all above must pass |

**Branch Protection Requirements:**

- CI must pass (`ci-pass` job)
- At least 1 approval required
- Branch must be up-to-date with base

### PR Guidelines

- Link related issues
- Summarize changes clearly
- Include verification commands
- Add UI screenshots for user-facing changes
- Squash formatting-only changes into related commits

### Incremental Commits

When working on multi-step tasks, create small, focused commits:

1. Commit dependency additions separately
2. Commit configuration/setup changes
3. Commit new components/modules
4. Commit integration changes to existing code

## Definition of Done

A task is not complete until:

1. **Linter Pass**: Code passes `bun run check` (ESLint + TypeScript)
2. **Tests Pass**: Relevant unit/integration tests are green
3. **No Regression**: Existing functionality remains unaffected
4. **Documentation**: Update AGENTS.md if new patterns or architecture decisions were established

---

## Technology Strategy & Operational Standards

Modern development requires automated guardrails, not just manual vigilance. We automate standards within our DevOps infrastructure to ensure security, reliability, and standardization by default.

### 1. Development Environment & Tooling

- **Runtime & Package Manager**: Bun (superior speed for dependency installation and script execution)
- **Monorepo Architecture**: Turborepo (planned) - centralize shared configs in `packages/config`
- **Code Formatting**: Prettier with automated import sorting
- **Git Hooks**: Husky + lint-staged (prevent unformatted/error-ridden commits)

### 2. Static Analysis & Quality Gates

- **Strict TypeScript**: `strict: true`, enforce `no-explicit-any`
- **Dead Code Elimination**: Knip (`bun run knip` detects unused dependencies, files, and exports)
- **Commit Discipline**: Conventional Commits via Commitlint
- **Database Safety**: `eslint-plugin-drizzle` (catch ORM errors at lint time)

### 3. Testing Strategy

- **E2E Testing**: Playwright (handles auth flows, parallel execution)
- **Unit Testing**: Vitest with React Testing Library (jsdom environment)

### 4. AI & Automation Integration

- **AI Code Reviews**: CodeRabbit, CodiumAI, or Gemini Code Assist
- **Dependency Management**: Dependabot (auto-merge non-breaking patches if CI passes)
- **Workflow Automation**: Auto-Author-Assign for PRs

### 5. Security & Deployment (DevSecOps)

- **Main Branch Protection**: Passing CI, code owner approval, no direct pushes
- **Vulnerability Scanning**: Trivy (scan for CVEs before deployment)
- **Deployment Gates**: Cloudflare Workers deployment requires CI pass
- **Preview Environments**: Isolated Workers per PR with dedicated database branches

### 6. Observability & Analytics

- **Structured Logging**: Axiom (deep JSON inspection, wide event logging)

### 7. AI-Assisted Development Guardrails

- **Supply Chain Security**: Socket.dev (block malicious packages)
- **Secrets Detection**: GitGuardian/ggshield (verify API keys against services)
- **Code Quality & Security**: SonarCloud (code smells, bugs, vulnerabilities, technical debt)
- **Complexity Monitoring**: SonarCloud (flag unmaintainable code, cyclomatic complexity)
- **Visual Regression Testing**: Storybook + Chromatic (detect UI breaks)

### 8. Developer Experience (DX) Standards

- **Zero-Friction Onboarding**: Working local app in 10 mins with setup script
- **Environment Validation**: T3 Env (`@t3-oss/env-nextjs`) validates env vars at build time
- **Database Branching**: Neon Database Branching (isolated DB per PR for schema migration testing)

### 9. Structured Logging Strategy

- **Philosophy**: "One Event Per Request" (loggingsucks.com) - reduces noise, adds context
- **Standard**: Canonical Logging (Wide Events)
  - Accumulate context (User ID, Endpoint, Status, Error, Duration, Feature Flags) into single JSON object
  - Emit only when unit of work completes
- **Implementation**: OpenTelemetry middleware to initialize context span, attach attributes, export on completion
