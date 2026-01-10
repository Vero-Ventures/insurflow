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
  vercel_authentication = {
    deployment_type = "preview"
  }

  # Auto-assign custom domains on production
  auto_assign_custom_domains = true

  # Enable directory listing for debugging (disable in production)
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
  comment    = "Neon PostgreSQL connection string"
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
  key        = "GITHUB_CLIENT_ID"
  value      = var.github_client_id
  target     = ["production"]
  comment    = "GitHub OAuth Client ID"
}

resource "vercel_project_environment_variable" "github_client_secret_prod" {
  count      = var.github_client_secret != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "GITHUB_CLIENT_SECRET"
  value      = var.github_client_secret
  target     = ["production"]
  sensitive  = true
  comment    = "GitHub OAuth Client Secret"
}

# =============================================================================
# Environment Variables - Preview (uses same values, can override later)
# =============================================================================

resource "vercel_project_environment_variable" "database_url_preview" {
  project_id = vercel_project.insurflow.id
  key        = "DATABASE_URL"
  value      = var.database_url # Can use separate preview DB later
  target     = ["preview"]
  sensitive  = true
  comment    = "Neon PostgreSQL connection string for previews"
}

resource "vercel_project_environment_variable" "better_auth_secret_preview" {
  project_id = vercel_project.insurflow.id
  key        = "BETTER_AUTH_SECRET"
  value      = var.better_auth_secret
  target     = ["preview"]
  sensitive  = true
  comment    = "Better Auth session encryption key"
}

resource "vercel_project_environment_variable" "better_auth_url_preview" {
  project_id = vercel_project.insurflow.id
  key        = "BETTER_AUTH_URL"
  value      = var.better_auth_url # Will be overwritten by Vercel's VERCEL_URL
  target     = ["preview"]
  comment    = "Better Auth base URL (preview)"
}
