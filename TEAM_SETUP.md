# Team Setup Guide

## Prerequisites

- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Docker Desktop installed and running
- Git configured with SSH keys for GitHub

## Initial Setup

### 1. Clone Repository

```bash
git clone git@github.com:Vero-Ventures/insurflow.git
cd insurflow
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

### 4. Get Shared Development Credentials

Contact the team lead for access to our shared 1Password vault containing:

- Development database credentials
- Development Axiom/Sentry/PostHog keys (optional for local dev)
- Better Auth secret

**Required Variables** (get from 1Password):

```bash
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
```

**Optional Variables** (for full observability stack):

```bash
# Axiom (Structured Logging) - optional locally
AXIOM_TOKEN="..."
AXIOM_DATASET="insurflow-dev"

# Grafana Cloud (Logs / Metrics / Traces) - optional locally
GRAFANA_OTLP_ENDPOINT="https://otlp-gateway-prod-us-central-0.grafana.net/otlp"
GRAFANA_OTLP_HEADERS="Authorization=Basic <base64 instance:token>"
GRAFANA_INSTANCE_ID="..."

# Prometheus scrape auth - required for the protected scrape endpoint
PROMETHEUS_METRICS_TOKEN="replace-with-long-random-token"

# Sentry (Error Tracking) - optional locally
SENTRY_DSN="..."
NEXT_PUBLIC_SENTRY_DSN="..."

# PostHog (Product Analytics) - optional locally
NEXT_PUBLIC_POSTHOG_KEY="..."
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
NEXT_PUBLIC_POSTHOG_UI_HOST="https://us.posthog.com"
```

Privacy rule: never send application answers, health disclosures, date of birth, income, coverage amounts, or freeform prompts to analytics vendors. Keep analytics events to coarse status, route, feature, count, and other sanitized metadata.

`/api/metrics` returns Prometheus text for the current worker only. On Vercel/serverless it is useful for compatibility checks and targeted scraping, not fleet-wide truth. Send `Authorization: Bearer <PROMETHEUS_METRICS_TOKEN>` and keep the token configured anywhere the endpoint is enabled.

Variables in `.env.example` for Stripe/UploadThing are reserved for future features and are not required for current MVP development.

### 5. Start Development Environment

```bash
# Start Docker services (PostgreSQL)
./scripts/dev-services.sh start

# Run dev server (starts services + pushes schema + runs Next.js)
bun run dev
```

The app will be available at `http://localhost:3000`

### 6. Verify Setup

Run the full check suite:

```bash
# ESLint + TypeScript
bun run check

# Unit tests
bun run test:run

# Production build
bun run build
```

## Working Without Observability Keys

All observability services are **optional for local development**:

- **Axiom**: Logs will print to console in JSON format
- **Grafana Cloud**: Metrics and traces remain local no-ops until OTLP env vars are configured
- **Sentry**: Errors will be logged to console
- **PostHog**: Events won't be tracked

This allows you to develop without setting up these accounts.

## Adding Production Keys (Team Leads Only)

### GitHub Secrets

Add to **Settings → Secrets and variables → Actions**:

```
DATABASE_URL
BETTER_AUTH_SECRET
AXIOM_TOKEN
AXIOM_DATASET
GRAFANA_OTLP_ENDPOINT
GRAFANA_OTLP_HEADERS
GRAFANA_INSTANCE_ID
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
NEXT_PUBLIC_POSTHOG_UI_HOST
```

### Vercel Deployment (via Terraform)

1. Navigate to infrastructure directory:

```bash
cd infra
```

2. Copy and configure variables:

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with production values
```

3. Initialize and apply:

```bash
terraform init
terraform plan
terraform apply
```

This automatically syncs all environment variables to Vercel.

## Common Commands

```bash
# Development
bun run dev                  # Start dev server
bun run services:start       # Start Docker services
bun run services:stop        # Stop Docker services
bun run services:status      # Check services status

# Database
bun run db:generate          # Generate migrations
bun run db:push              # Push schema to database
bun run db:studio            # Open Drizzle Studio
bun run db:debug             # Print users/clients for local debugging
bun run db:clean:clients     # DANGER: hard-delete all clients

# Code Quality
bun run check                # ESLint + TypeScript
bun run format:write         # Format code with Prettier
bun run lint:fix             # Auto-fix lint issues

# Testing
bun run test                 # Unit tests (watch mode)
bun run test:run             # Unit tests (single run)
bun run test:coverage        # Unit tests with coverage
bun run test:e2e             # E2E tests
bun run test:e2e:ui          # E2E tests with UI

# Build
bun run build                # Production build
bun run preview              # Build + serve locally
```

## Troubleshooting

### Port 5432 Already in Use

If you see "port 5432 already in use":

```bash
# Stop any existing PostgreSQL
./scripts/dev-services.sh stop

# Or change the port in docker-compose.yml and update DATABASE_URL
```

### Docker Not Running

```bash
open -a Docker
# Wait for Docker to start, then run dev again
```

### Schema Already Exists Error

The `db:push` command will show errors if tables already exist. This is harmless - the dev server will still start successfully.

### Build Fails

```bash
# Clean and rebuild
rm -rf .next node_modules
bun install
bun run build
```

## Operational Guardrails

- `scripts/clean-clients.ts` hard-deletes every client row. Treat it as destructive and local-only.
- Pre-push runs lint/typecheck/tests and may auto-rebase onto `origin/main`.
- If automation must bypass auto-sync logic, use `SKIP_SYNC_CHECK=1 git push` intentionally.

## Getting Help

- **Technical Questions**: Post in #insurflow-dev Slack channel
- **Environment Issues**: Contact @tech-lead
- **Credentials Access**: Request access to 1Password vault
