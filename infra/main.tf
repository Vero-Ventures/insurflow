# =============================================================================
# InsurFlow Cloudflare Pages Project
# =============================================================================

# Build environment variables map using locals for cleaner conditional logic
locals {
  # Base environment variables (required)
  base_env_vars = {
    # CI flag to skip husky install
    CI = {
      type  = "plain_text"
      value = "true"
    }
    NODE_ENV = {
      type  = "plain_text"
      value = "production"
    }
    DATABASE_URL = {
      type  = "secret_text"
      value = var.database_url
    }
    BETTER_AUTH_SECRET = {
      type  = "secret_text"
      value = var.better_auth_secret
    }
  }

  # Production-only: BETTER_AUTH_URL
  production_auth_url = {
    BETTER_AUTH_URL = {
      type  = "plain_text"
      value = var.better_auth_url
    }
  }

  # GitHub OAuth (optional)
  github_oauth_env_vars = var.github_client_id != "" ? {
    BETTER_AUTH_GITHUB_CLIENT_ID = {
      type  = "plain_text"
      value = var.github_client_id
    }
    BETTER_AUTH_GITHUB_CLIENT_SECRET = {
      type  = "secret_text"
      value = var.github_client_secret
    }
  } : {}

  # Axiom (optional)
  axiom_env_vars = var.axiom_token != "" ? merge(
    {
      AXIOM_TOKEN = {
        type  = "secret_text"
        value = var.axiom_token
      }
      AXIOM_DATASET = {
        type  = "plain_text"
        value = var.axiom_dataset
      }
    },
    var.axiom_org_id != "" ? {
      AXIOM_ORG_ID = {
        type  = "plain_text"
        value = var.axiom_org_id
      }
    } : {}
  ) : {}

  # Sentry (optional)
  sentry_env_vars = merge(
    var.sentry_dsn != "" ? {
      SENTRY_DSN = {
        type  = "secret_text"
        value = var.sentry_dsn
      }
    } : {},
    var.next_public_sentry_dsn != "" ? {
      NEXT_PUBLIC_SENTRY_DSN = {
        type  = "plain_text"
        value = var.next_public_sentry_dsn
      }
    } : {},
    var.sentry_auth_token != "" ? {
      SENTRY_AUTH_TOKEN = {
        type  = "secret_text"
        value = var.sentry_auth_token
      }
    } : {},
    var.sentry_org != "" ? {
      SENTRY_ORG = {
        type  = "plain_text"
        value = var.sentry_org
      }
    } : {},
    var.sentry_project != "" ? {
      SENTRY_PROJECT = {
        type  = "plain_text"
        value = var.sentry_project
      }
    } : {}
  )

  # PostHog (optional)
  posthog_env_vars = var.next_public_posthog_key != "" ? {
    NEXT_PUBLIC_POSTHOG_KEY = {
      type  = "plain_text"
      value = var.next_public_posthog_key
    }
    NEXT_PUBLIC_POSTHOG_HOST = {
      type  = "plain_text"
      value = var.next_public_posthog_host
    }
  } : {}

  # Combined environment variables
  production_env_vars = merge(
    local.base_env_vars,
    local.production_auth_url,
    local.github_oauth_env_vars,
    local.axiom_env_vars,
    local.sentry_env_vars,
    local.posthog_env_vars
  )

  # Preview env vars (same as production, minus BETTER_AUTH_URL - uses CF_PAGES_URL)
  preview_env_vars = merge(
    local.base_env_vars,
    local.github_oauth_env_vars,
    local.axiom_env_vars,
    local.sentry_env_vars,
    local.posthog_env_vars
  )
}

# =============================================================================
# Cloudflare Pages Project
# =============================================================================

resource "cloudflare_pages_project" "insurflow" {
  account_id        = var.cloudflare_account_id
  name              = var.project_name
  production_branch = var.production_branch

  # GitHub repository integration
  source = {
    type = "github"
    config = {
      owner                          = split("/", var.github_repo)[0]
      repo_name                      = split("/", var.github_repo)[1]
      production_branch              = var.production_branch
      pr_comments_enabled            = true
      deployments_enabled            = true
      production_deployments_enabled = true
      preview_deployment_setting     = "all"
    }
  }

  # Build configuration for Next.js with Bun and @cloudflare/next-on-pages
  # Install bun first since Cloudflare doesn't have it pre-installed
  build_config = {
    build_command   = "npm install -g bun && bun install && bun run build:full:cloudflare"
    destination_dir = ".vercel/output/static"
    root_dir        = ""
  }

  # Deployment configurations
  deployment_configs = {
    # ==========================================================================
    # Production Environment
    # ==========================================================================
    production = {
      compatibility_date  = "2025-01-22"
      compatibility_flags = ["nodejs_compat"]
      env_vars            = local.production_env_vars
    }

    # ==========================================================================
    # Preview Environment
    # WARNING: Preview environments currently share the production database.
    # This means preview deployments can read/write production data.
    # For isolation, configure Neon Database Branching or a separate preview DB.
    # ==========================================================================
    preview = {
      compatibility_date  = "2025-01-22"
      compatibility_flags = ["nodejs_compat"]
      env_vars            = local.preview_env_vars
      # NOTE: BETTER_AUTH_URL is NOT set for preview environments.
      # Preview deployments derive their base URL dynamically from
      # Cloudflare's CF_PAGES_URL environment variable at runtime.
    }
  }
}
