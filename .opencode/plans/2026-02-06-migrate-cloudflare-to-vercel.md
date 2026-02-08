# Migrate Deployment from Cloudflare Workers to Vercel

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Cloudflare Workers deployment infrastructure with Vercel, restoring the original Vercel Terraform configuration while keeping Neon database branching for preview environments.

**Architecture:** Vercel handles automatic deployments via Git integration (push to main = production, PRs = preview). GitHub Actions are simplified to only handle Neon database branching for previews. Terraform manages the Vercel project and environment variables.

**Tech Stack:** Vercel, Terraform (vercel/vercel provider ~> 2.0), Neon serverless driver, Next.js 16

**Reference Commit:** The original Vercel Terraform config was in commit `5e5e671` (2026-01-10).

---

## Pre-Implementation Checklist

Before starting, ensure you have:

- [ ] Vercel account (personal, per user confirmation)
- [ ] Vercel API token (from https://vercel.com/account/tokens)
- [ ] GitHub repo connected to Vercel (will be configured via Terraform)

---

## Task 1: Update Terraform Provider Configuration

**Files:**

- Modify: `infra/versions.tf`
- Modify: `infra/provider.tf`

**Step 1: Replace Cloudflare provider with Vercel provider in versions.tf**

Replace the entire content of `infra/versions.tf` with:

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }

  # Uncomment to use remote state (recommended for team collaboration)
  # backend "s3" {
  #   bucket = "insurflow-terraform-state"
  #   key    = "vercel/terraform.tfstate"
  #   region = "us-east-1"
  # }
}
```

**Step 2: Update provider.tf for Vercel**

Replace the entire content of `infra/provider.tf` with:

```hcl
# The Vercel provider is configured via environment variables:
# - VERCEL_API_TOKEN: API token from https://vercel.com/account/tokens
#
# Environment variables are the recommended approach for security.
# Do not hardcode tokens in Terraform files.

provider "vercel" {
  # Configuration is read from environment variables
}
```

**Step 3: Commit provider changes**

```bash
git add infra/versions.tf infra/provider.tf
git commit -m "chore(infra): switch from Cloudflare to Vercel provider"
```

---

## Task 2: Update Terraform Variables

**Files:**

- Modify: `infra/variables.tf`

**Step 1: Replace Cloudflare variables with Vercel variables**

Replace the entire content of `infra/variables.tf` with:

```hcl
# =============================================================================
# Variables
# =============================================================================

variable "vercel_api_token" {
  description = "Vercel API token from https://vercel.com/account/tokens"
  type        = string
  sensitive   = true
  default     = null # Will use VERCEL_API_TOKEN env var if not set
}

variable "github_repo" {
  description = "GitHub repository in format 'org/repo'"
  type        = string
  default     = "Vero-Ventures/insurflow"
}

variable "production_branch" {
  description = "Git branch for production deployments"
  type        = string
  default     = "main"
}

# =============================================================================
# Database Configuration
# =============================================================================

variable "database_url" {
  description = "PostgreSQL connection string (Neon)"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^postgres(ql)?://", var.database_url))
    error_message = "DATABASE_URL must be a valid PostgreSQL connection string starting with 'postgresql://' or 'postgres://'"
  }
}

# =============================================================================
# Auth Configuration
# =============================================================================

variable "better_auth_secret" {
  description = "Secret key for Better Auth session encryption"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.better_auth_secret) >= 32
    error_message = "BETTER_AUTH_SECRET must be at least 32 characters for security. Generate with: openssl rand -base64 32"
  }
}

variable "better_auth_url" {
  description = "Base URL for Better Auth (e.g., https://insurflow.vercel.app)"
  type        = string
}

variable "github_client_id" {
  description = "GitHub OAuth App Client ID (optional)"
  type        = string
  default     = ""
}

variable "github_client_secret" {
  description = "GitHub OAuth App Client Secret (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

# =============================================================================
# Observability (Optional)
# =============================================================================

variable "axiom_token" {
  description = "Axiom API token for structured logging"
  type        = string
  sensitive   = true
  default     = ""
}

variable "axiom_dataset" {
  description = "Axiom dataset name"
  type        = string
  default     = "insurflow"
}
```

**Step 2: Commit variable changes**

```bash
git add infra/variables.tf
git commit -m "chore(infra): update variables for Vercel deployment"
```

---

## Task 3: Create Vercel Project Terraform Configuration

**Files:**

- Modify: `infra/main.tf`

**Step 1: Replace main.tf with Vercel project configuration**

Replace the entire content of `infra/main.tf` with:

```hcl
# =============================================================================
# InsurFlow Vercel Project
# =============================================================================

resource "vercel_project" "insurflow" {
  name      = "insurflow"
  framework = "nextjs"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.production_branch
  }

  # Build configuration for Bun
  build_command   = "bun run build"
  install_command = "bun install"

  # Root directory (monorepo support - leave null for root)
  root_directory = null

  # Serverless function region (US East - closest to Neon default)
  serverless_function_region = "iad1"

  # Enable PR comments for preview deployments
  git_comments = {
    on_commit       = true
    on_pull_request = true
  }

  # Vercel Authentication for preview deployments
  # "standard_protection" requires Vercel account login to view previews
  vercel_authentication = {
    deployment_type = "standard_protection"
  }

  # Auto-assign custom domains on production
  auto_assign_custom_domains = true

  # Disable directory listing
  directory_listing = false

  # Skew protection - keeps old deployments accessible for 24 hours
  skew_protection = "24 hours"
}

# =============================================================================
# Environment Variables - Production
# =============================================================================

resource "vercel_project_environment_variable" "database_url_prod" {
  project_id = vercel_project.insurflow.id
  key        = "DATABASE_URL"
  value      = var.database_url
  target     = ["production"]
  sensitive  = true
  comment    = "Neon PostgreSQL connection string (pooled)"
}

resource "vercel_project_environment_variable" "better_auth_secret_prod" {
  project_id = vercel_project.insurflow.id
  key        = "BETTER_AUTH_SECRET"
  value      = var.better_auth_secret
  target     = ["production"]
  sensitive  = true
  comment    = "Better Auth session encryption key"
}

resource "vercel_project_environment_variable" "better_auth_url_prod" {
  project_id = vercel_project.insurflow.id
  key        = "BETTER_AUTH_URL"
  value      = var.better_auth_url
  target     = ["production"]
  comment    = "Better Auth base URL"
}

# GitHub OAuth (optional)
resource "vercel_project_environment_variable" "github_client_id_prod" {
  count      = var.github_client_id != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "BETTER_AUTH_GITHUB_CLIENT_ID"
  value      = var.github_client_id
  target     = ["production"]
  comment    = "GitHub OAuth Client ID"
}

resource "vercel_project_environment_variable" "github_client_secret_prod" {
  count      = var.github_client_secret != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "BETTER_AUTH_GITHUB_CLIENT_SECRET"
  value      = var.github_client_secret
  target     = ["production"]
  sensitive  = true
  comment    = "GitHub OAuth Client Secret"
}

# Axiom (optional)
resource "vercel_project_environment_variable" "axiom_token_prod" {
  count      = var.axiom_token != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "AXIOM_TOKEN"
  value      = var.axiom_token
  target     = ["production"]
  sensitive  = true
  comment    = "Axiom API token for structured logging"
}

resource "vercel_project_environment_variable" "axiom_dataset_prod" {
  count      = var.axiom_dataset != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "AXIOM_DATASET"
  value      = var.axiom_dataset
  target     = ["production"]
  comment    = "Axiom dataset name"
}

# =============================================================================
# Environment Variables - Preview
# =============================================================================
# NOTE: DATABASE_URL for preview environments is set dynamically by GitHub Actions
# when creating Neon database branches. This ensures each PR gets an isolated DB.
#
# BETTER_AUTH_URL is NOT set for preview - the app derives it from VERCEL_URL.
# =============================================================================

resource "vercel_project_environment_variable" "better_auth_secret_preview" {
  project_id = vercel_project.insurflow.id
  key        = "BETTER_AUTH_SECRET"
  value      = var.better_auth_secret
  target     = ["preview"]
  sensitive  = true
  comment    = "Better Auth session encryption key"
}

# Axiom for preview (optional)
resource "vercel_project_environment_variable" "axiom_token_preview" {
  count      = var.axiom_token != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "AXIOM_TOKEN"
  value      = var.axiom_token
  target     = ["preview"]
  sensitive  = true
  comment    = "Axiom API token for structured logging"
}

resource "vercel_project_environment_variable" "axiom_dataset_preview" {
  count      = var.axiom_dataset != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "AXIOM_DATASET"
  value      = var.axiom_dataset
  target     = ["preview"]
  comment    = "Axiom dataset name"
}
```

**Step 2: Commit main.tf changes**

```bash
git add infra/main.tf
git commit -m "feat(infra): add Vercel project and environment variables"
```

---

## Task 4: Update Terraform Outputs

**Files:**

- Modify: `infra/outputs.tf`

**Step 1: Update outputs for Vercel**

Replace the entire content of `infra/outputs.tf` with:

```hcl
# =============================================================================
# Outputs
# =============================================================================

output "project_id" {
  description = "Vercel Project ID"
  value       = vercel_project.insurflow.id
}

output "project_name" {
  description = "Vercel Project Name"
  value       = vercel_project.insurflow.name
}

output "production_url" {
  description = "Production deployment URL"
  value       = "https://insurflow.biz"
}

output "preview_url_pattern" {
  description = "Preview deployment URL pattern"
  value       = "https://insurflow-{git-hash}-{vercel-team}.vercel.app"
}
```

**Step 2: Commit outputs changes**

```bash
git add infra/outputs.tf
git commit -m "chore(infra): update outputs for Vercel"
```

---

## Task 5: Update Terraform tfvars Example

**Files:**

- Modify: `infra/terraform.tfvars.example`

**Step 1: Update tfvars example for Vercel**

Replace the entire content of `infra/terraform.tfvars.example` with:

```hcl
# =============================================================================
# Terraform Variables for InsurFlow (Vercel)
# =============================================================================
# Copy this file to terraform.tfvars and fill in the values
# NEVER commit terraform.tfvars to version control
# =============================================================================

# Vercel Configuration
# Get your API token from: https://vercel.com/account/tokens
# vercel_api_token = "your-vercel-api-token"

# GitHub Repository
github_repo       = "Vero-Ventures/insurflow"
production_branch = "main"

# Database (Neon PostgreSQL)
# Get the POOLED connection string from Neon dashboard
# database_url = "postgresql://user:pass@host/db?sslmode=require"

# Better Auth Configuration
# Generate a secure secret: openssl rand -base64 32
# better_auth_secret = "your-32-char-secret"
# better_auth_url    = "https://insurflow.vercel.app"

# GitHub OAuth (optional)
# Create OAuth App: https://github.com/settings/developers
# github_client_id     = ""
# github_client_secret = ""

# =============================================================================
# Observability (optional)
# =============================================================================

# Axiom (Structured Logging)
# Sign up at: https://app.axiom.co
# Get token from: https://app.axiom.co/settings/tokens
# axiom_token   = ""
# axiom_dataset = "insurflow"
```

**Step 2: Commit tfvars example**

```bash
git add infra/terraform.tfvars.example
git commit -m "docs(infra): update tfvars example for Vercel"
```

---

## Task 6: Simplify GitHub Actions for Neon Branching Only

**Files:**

- Delete: `.github/workflows/deploy-production.yml`
- Modify: `.github/workflows/deploy-preview.yml`
- Modify: `.github/workflows/cleanup-preview.yml`

**Step 1: Delete the production deployment workflow**

Vercel handles production deployments automatically via Git integration. Delete the file:

```bash
rm .github/workflows/deploy-production.yml
git add .github/workflows/deploy-production.yml
```

**Step 2: Update deploy-preview.yml to only handle Neon branching**

Replace the entire content of `.github/workflows/deploy-preview.yml` with:

```yaml
name: Preview Database Branch

on:
  pull_request:
    types: [opened, synchronize, reopened]

concurrency:
  group: preview-db-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  create-neon-branch:
    name: Create Neon Database Branch
    runs-on: ubuntu-latest

    steps:
      - name: Create Neon Branch
        id: neon-branch
        uses: neondatabase/create-branch-action@v6
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: preview/pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Set DATABASE_URL in Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_API_TOKEN }}
        run: |
          # Get the project ID
          PROJECT_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
            "https://api.vercel.com/v9/projects/insurflow" | jq -r '.id')

          # Check if DATABASE_URL already exists for this preview
          EXISTING=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
            "https://api.vercel.com/v10/projects/$PROJECT_ID/env" | \
            jq -r '.envs[] | select(.key == "DATABASE_URL" and .target[] == "preview" and .gitBranch == "${{ github.head_ref }}") | .id')

          DB_URL="${{ steps.neon-branch.outputs.db_url_pooled }}"

          if [ -n "$EXISTING" ]; then
            # Update existing env var
            curl -s -X PATCH \
              -H "Authorization: Bearer $VERCEL_TOKEN" \
              -H "Content-Type: application/json" \
              -d "{\"value\": \"$DB_URL\"}" \
              "https://api.vercel.com/v10/projects/$PROJECT_ID/env/$EXISTING"
          else
            # Create new env var for this branch
            curl -s -X POST \
              -H "Authorization: Bearer $VERCEL_TOKEN" \
              -H "Content-Type: application/json" \
              -d "{
                \"key\": \"DATABASE_URL\",
                \"value\": \"$DB_URL\",
                \"type\": \"encrypted\",
                \"target\": [\"preview\"],
                \"gitBranch\": \"${{ github.head_ref }}\"
              }" \
              "https://api.vercel.com/v10/projects/$PROJECT_ID/env"
          fi

      - name: Trigger Vercel Redeploy
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_API_TOKEN }}
        run: |
          # Get latest deployment for this branch and redeploy
          # This ensures the preview uses the new DATABASE_URL
          DEPLOYMENT=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
            "https://api.vercel.com/v6/deployments?projectId=insurflow&target=preview&limit=1" | \
            jq -r '.deployments[0].uid')

          if [ -n "$DEPLOYMENT" ] && [ "$DEPLOYMENT" != "null" ]; then
            curl -s -X POST \
              -H "Authorization: Bearer $VERCEL_TOKEN" \
              "https://api.vercel.com/v13/deployments/$DEPLOYMENT/redeploy"
          fi

      - name: Checkout for migrations
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run migrations on Neon branch
        run: bun run db:migrate
        env:
          DATABASE_URL: ${{ steps.neon-branch.outputs.db_url_pooled }}

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const neonBranchUrl = `https://console.neon.tech/app/projects/${{ secrets.NEON_PROJECT_ID }}/branches`;

            const body = `## Database Branch Ready

            | Resource | Link |
            |----------|------|
            | Neon Branch | [preview/pr-${{ github.event.pull_request.number }}](${neonBranchUrl}) |

            This PR has its own isolated database branch. Changes here won't affect production data.

            Vercel will automatically deploy the preview - check the Vercel bot comment for the URL.

            ---
            <sub>Database branch created by GitHub Actions</sub>`;

            // Find existing comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const botComment = comments.find(c =>
              c.user.type === 'Bot' &&
              c.body.includes('Database Branch Ready')
            );

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }
```

**Step 3: Update cleanup-preview.yml to only clean up Neon branch**

Replace the entire content of `.github/workflows/cleanup-preview.yml` with:

```yaml
name: Cleanup Preview

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    name: Cleanup Preview Resources
    runs-on: ubuntu-latest

    steps:
      - name: Delete Neon Branch
        uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch: preview/pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Delete Vercel Preview Env Var
        continue-on-error: true
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_API_TOKEN }}
        run: |
          # Get the project ID
          PROJECT_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
            "https://api.vercel.com/v9/projects/insurflow" | jq -r '.id')

          # Find and delete the branch-specific DATABASE_URL env var
          ENV_ID=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
            "https://api.vercel.com/v10/projects/$PROJECT_ID/env" | \
            jq -r '.envs[] | select(.key == "DATABASE_URL" and .gitBranch == "${{ github.head_ref }}") | .id')

          if [ -n "$ENV_ID" ] && [ "$ENV_ID" != "null" ]; then
            curl -s -X DELETE \
              -H "Authorization: Bearer $VERCEL_TOKEN" \
              "https://api.vercel.com/v10/projects/$PROJECT_ID/env/$ENV_ID"
          fi

      - name: Cleanup Summary
        run: |
          echo "## Preview Cleanup Complete" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- Deleted Neon Branch: \`preview/pr-${{ github.event.pull_request.number }}\`" >> $GITHUB_STEP_SUMMARY
```

**Step 4: Commit GitHub Actions changes**

```bash
git add .github/workflows/
git commit -m "refactor(ci): simplify workflows for Vercel + Neon branching"
```

---

## Task 7: Update Environment URL Detection

**Files:**

- Modify: `src/env.js`

**Step 1: Simplify URL detection to prioritize VERCEL_URL**

Edit `src/env.js` and update the `getBetterAuthUrl` function.

Replace lines 4-22 (the comment and function) with:

```javascript
/**
 * Derive the Better Auth URL from environment variables.
 * Priority: BETTER_AUTH_URL > VERCEL_URL > localhost fallback
 * This allows Vercel preview deployments to work without explicit BETTER_AUTH_URL.
 */
function getBetterAuthUrl() {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  // Vercel provides VERCEL_URL for preview deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
```

**Step 2: Commit env.js changes**

```bash
git add src/env.js
git commit -m "refactor(env): simplify URL detection for Vercel"
```

---

## Task 8: Simplify Database Connection

**Files:**

- Modify: `src/server/db/index.ts`

**Step 1: Remove Hyperdrive logic from database connection**

Replace the entire content of `src/server/db/index.ts` with:

```typescript
import {
  drizzle as drizzlePostgresJs,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import {
  drizzle as drizzleNeonHttp,
  type NeonHttpDatabase,
} from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import { cache } from "react";

import * as schema from "./schema";

type Database =
  | PostgresJsDatabase<typeof schema>
  | NeonHttpDatabase<typeof schema>;

/**
 * Database connection factory with environment-aware driver selection.
 *
 * 1. **Production & Preview (Vercel)**:
 *    Uses Neon serverless driver via HTTP for optimal edge performance.
 *    Neon provides built-in connection pooling.
 *
 * 2. **Local Development**:
 *    Uses `postgres-js` for TCP connections to local Docker Postgres.
 *
 * The `cache()` wrapper ensures we reuse the same client within a single
 * React request context.
 *
 * @see https://neon.tech/docs/guides/vercel
 */
export const getDb = cache((): Database => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Production/Preview: Use Neon serverless driver (HTTP-based)
  if (connectionString.includes("neon.tech")) {
    const sql = neon(connectionString);
    return drizzleNeonHttp(sql, { schema });
  }

  // Local development: Use postgres-js for Docker Postgres
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzlePostgresJs(client, { schema });
});

// Type export for convenience
export type { Database };
```

**Step 2: Commit database changes**

```bash
git add src/server/db/index.ts
git commit -m "refactor(db): remove Hyperdrive, use Neon serverless driver"
```

---

## Task 9: Update next.config.js

**Files:**

- Modify: `next.config.js`

**Step 1: Remove OpenNext/Cloudflare initialization**

Edit `next.config.js`:

1. Remove lines 5-10 (the OpenNext import and initialization):

```javascript
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize OpenNext for local development with Cloudflare bindings
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
```

2. Update line 1 comment to:

```javascript
/**
 * Run `build` with `SKIP_ENV_VALIDATION` to skip env validation.
 */
```

3. Change the images config (around line 166-171) from:

```javascript
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 86400,
    // Use unoptimized in Workers to reduce bundle size
    unoptimized: process.env.NODE_ENV === "production",
  },
```

To:

```javascript
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 86400,
  },
```

**Step 2: Commit next.config.js changes**

```bash
git add next.config.js
git commit -m "refactor(config): remove OpenNext/Cloudflare from next.config"
```

---

## Task 10: Update package.json Scripts

**Files:**

- Modify: `package.json`

**Step 1: Remove Cloudflare-specific scripts**

Edit `package.json` and update the scripts section.

Remove these scripts:

- `"build:cloudflare": "opennextjs-cloudflare build"`
- `"build:full:cloudflare": "drizzle-kit migrate && opennextjs-cloudflare build"`
- `"preview:cloudflare": "opennextjs-cloudflare build && opennextjs-cloudflare preview"`
- `"deploy:cloudflare": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`
- `"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"`
- `"postinstall": "bash scripts/stub-og-wasm.sh"`

The scripts section should become:

```json
"scripts": {
  "build": "next build",
  "build:full": "drizzle-kit migrate && next build",
  "check": "eslint && tsc --noEmit",
  "verify": "bun run check && bun run test:run && bun run test:e2e && bun run build",
  "sync": "bash scripts/sync-branch.sh",
  "sync:check": "bash scripts/sync-branch.sh --check",
  "sync:merge": "bash scripts/sync-branch.sh --merge",
  "services:start": "bash scripts/dev-services.sh start",
  "services:stop": "bash scripts/dev-services.sh stop",
  "services:status": "bash scripts/dev-services.sh status",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "dev": "bash scripts/dev.sh",
  "dev:e2e": "bash scripts/dev-services.sh start && (drizzle-kit push || true) && next dev",
  "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,mdx}\" --cache",
  "format:write": "prettier --write \"**/*.{ts,tsx,js,jsx,mdx}\" --cache",
  "lint": "eslint",
  "lint:fix": "eslint --fix",
  "preview": "bun run build:full && next start",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "knip": "knip",
  "prepare": "node -e \"if (process.env.CI !== 'true') { import('husky').then(m => m.default()) }\""
}
```

**Step 2: Commit package.json changes**

```bash
git add package.json
git commit -m "refactor(scripts): remove Cloudflare scripts, simplify for Vercel"
```

---

## Task 11: Remove Cloudflare-Specific Files

**Files:**

- Delete: `wrangler.toml`
- Delete: `open-next.config.ts`
- Delete: `worker-configuration.d.ts`
- Delete: `scripts/stub-og-wasm.sh`

**Step 1: Delete Cloudflare-specific files**

```bash
rm wrangler.toml open-next.config.ts worker-configuration.d.ts scripts/stub-og-wasm.sh
git add wrangler.toml open-next.config.ts worker-configuration.d.ts scripts/stub-og-wasm.sh
git commit -m "chore: remove Cloudflare Workers configuration files"
```

---

## Task 12: Remove Cloudflare Dependencies

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`

**Step 1: Remove Cloudflare-related dependencies**

Run:

```bash
bun remove @opennextjs/cloudflare wrangler
```

**Step 2: Commit dependency changes**

```bash
git add package.json bun.lock
git commit -m "chore(deps): remove Cloudflare dependencies"
```

---

## Task 13: Update AGENTS.md Documentation

**Files:**

- Modify: `AGENTS.md`

**Step 1: Update deployment section in AGENTS.md**

Find the "Deployment (Cloudflare Workers + GitHub Actions)" section and replace it with:

```markdown
## Deployment (Vercel + GitHub Actions)

InsurFlow deploys to Vercel with automatic Git integration. Database branching for previews is handled by GitHub Actions.

### Architecture

| Environment | URL                                 | Database                     |
| ----------- | ----------------------------------- | ---------------------------- |
| Production  | https://insurflow.biz               | Neon main branch             |
| Preview     | https://insurflow-{hash}.vercel.app | Neon `preview/pr-{N}` branch |

### Deployment Workflows

**Production**:

- Triggered automatically by Vercel on push to `main` branch
- Vercel runs `bun run build` and deploys

**Preview** (GitHub Actions + Vercel):

- Vercel automatically creates preview deployment on PR
- GitHub Actions creates Neon database branch and sets DATABASE_URL

**Cleanup** (`.github/workflows/cleanup-preview.yml`):

- Triggered when PR is closed
- Deletes Neon database branch

### GitHub Secrets Required

Configure in: Settings → Secrets and variables → Actions → Secrets

| Secret             | Description                             |
| ------------------ | --------------------------------------- |
| `VERCEL_API_TOKEN` | Vercel API token for env var management |
| `NEON_API_KEY`     | Neon API key for database branching     |
| `NEON_PROJECT_ID`  | Neon project ID                         |

### Terraform Variables

The Vercel project and environment variables are managed via Terraform in `infra/`.

| Variable             | Description                                  |
| -------------------- | -------------------------------------------- |
| `database_url`       | Production Neon connection string            |
| `better_auth_secret` | Session encryption key (min 32 chars)        |
| `better_auth_url`    | Production URL (e.g., https://insurflow.biz) |
| `axiom_token`        | (Optional) Axiom logging token               |
| `axiom_dataset`      | (Optional) Axiom dataset name                |
```

Also search for and update any other references to:

- "cloudflare" → update context or remove
- "workers.dev" → replace with "vercel.app"
- "wrangler" → remove references
- "Hyperdrive" → remove references

**Step 2: Commit documentation changes**

```bash
git add AGENTS.md
git commit -m "docs: update deployment documentation for Vercel"
```

---

## Task 14: Verify Build Works Locally

**Step 1: Run build to ensure everything compiles**

```bash
bun run build
```

Expected: Build succeeds without errors.

**Step 2: Run type checking**

```bash
bun run check
```

Expected: No type errors.

**Step 3: Run tests**

```bash
bun run test:run
```

Expected: All tests pass.

---

## Task 15: Apply Terraform Configuration

**Prerequisites:**

- Set `VERCEL_API_TOKEN` environment variable
- Have a `terraform.tfvars` file with required values

**Step 1: Initialize Terraform**

```bash
cd infra
terraform init
```

Expected: Terraform downloads the Vercel provider.

**Step 2: Plan the changes**

```bash
terraform plan
```

Expected: Shows resources to be created (vercel_project and environment variables).

**Step 3: Apply the configuration**

```bash
terraform apply
```

Expected: Creates the Vercel project and configures environment variables.

**Step 4: Verify in Vercel dashboard**

- Go to https://vercel.com/dashboard
- Confirm the "insurflow" project exists
- Check that environment variables are configured

---

## Post-Implementation Checklist

- [ ] Terraform applies successfully
- [ ] Vercel project is created and connected to GitHub
- [ ] Push to main triggers production deployment
- [ ] PR creation triggers preview deployment
- [ ] Neon database branches are created for PRs
- [ ] Preview deployments use isolated database
- [ ] PR close cleans up Neon branch
- [ ] `bun run build` works locally
- [ ] `bun run check` passes
- [ ] `bun run test:run` passes

---

## GitHub Secrets Migration Checklist

### Secrets to ADD:

- `VERCEL_API_TOKEN` - Get from https://vercel.com/account/tokens

### Secrets to REMOVE (after migration verified):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `HYPERDRIVE_ID` (if it exists as a variable)

### Secrets to KEEP:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `NEON_API_KEY`
- `NEON_PROJECT_ID`
- `AXIOM_TOKEN` (optional)

---

## Rollback Plan

If issues arise, the original Cloudflare configuration can be restored from git:

```bash
git revert --no-commit HEAD~N  # where N is number of commits to revert
```

Or checkout specific files from before the migration:

```bash
git checkout HEAD~N -- infra/ .github/workflows/ wrangler.toml package.json
```
