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

resource "vercel_project_environment_variable" "grafana_otlp_endpoint_prod" {
  count      = var.grafana_otlp_endpoint != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "GRAFANA_OTLP_ENDPOINT"
  value      = var.grafana_otlp_endpoint
  target     = ["production"]
  comment    = "Grafana Cloud OTLP endpoint"
}

resource "vercel_project_environment_variable" "grafana_otlp_headers_prod" {
  count      = var.grafana_otlp_headers != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "GRAFANA_OTLP_HEADERS"
  value      = var.grafana_otlp_headers
  target     = ["production"]
  sensitive  = true
  comment    = "Grafana Cloud OTLP auth headers"
}

resource "vercel_project_environment_variable" "grafana_instance_id_prod" {
  count      = var.grafana_instance_id != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "GRAFANA_INSTANCE_ID"
  value      = var.grafana_instance_id
  target     = ["production"]
  comment    = "Grafana Cloud instance id"
}

resource "vercel_project_environment_variable" "prometheus_metrics_token_prod" {
  count      = var.prometheus_metrics_token != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "PROMETHEUS_METRICS_TOKEN"
  value      = var.prometheus_metrics_token
  target     = ["production"]
  sensitive  = true
  comment    = "Bearer token for Prometheus scrape endpoint"
}

resource "vercel_project_environment_variable" "posthog_key_prod" {
  count      = var.posthog_key != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "NEXT_PUBLIC_POSTHOG_KEY"
  value      = var.posthog_key
  target     = ["production"]
  sensitive  = true
  comment    = "PostHog project key"
}

resource "vercel_project_environment_variable" "posthog_host_prod" {
  count      = var.posthog_host != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "NEXT_PUBLIC_POSTHOG_HOST"
  value      = var.posthog_host
  target     = ["production"]
  comment    = "PostHog API host"
}

resource "vercel_project_environment_variable" "posthog_ui_host_prod" {
  count      = var.posthog_ui_host != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "NEXT_PUBLIC_POSTHOG_UI_HOST"
  value      = var.posthog_ui_host
  target     = ["production"]
  comment    = "PostHog UI host"
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

resource "vercel_project_environment_variable" "grafana_otlp_endpoint_preview" {
  count      = var.grafana_otlp_endpoint != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "GRAFANA_OTLP_ENDPOINT"
  value      = var.grafana_otlp_endpoint
  target     = ["preview"]
  comment    = "Grafana Cloud OTLP endpoint"
}

resource "vercel_project_environment_variable" "grafana_otlp_headers_preview" {
  count      = var.grafana_otlp_headers != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "GRAFANA_OTLP_HEADERS"
  value      = var.grafana_otlp_headers
  target     = ["preview"]
  sensitive  = true
  comment    = "Grafana Cloud OTLP auth headers"
}

resource "vercel_project_environment_variable" "grafana_instance_id_preview" {
  count      = var.grafana_instance_id != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "GRAFANA_INSTANCE_ID"
  value      = var.grafana_instance_id
  target     = ["preview"]
  comment    = "Grafana Cloud instance id"
}

resource "vercel_project_environment_variable" "prometheus_metrics_token_preview" {
  count      = var.prometheus_metrics_token != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "PROMETHEUS_METRICS_TOKEN"
  value      = var.prometheus_metrics_token
  target     = ["preview"]
  sensitive  = true
  comment    = "Bearer token for Prometheus scrape endpoint"
}

resource "vercel_project_environment_variable" "posthog_key_preview" {
  count      = var.posthog_key != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "NEXT_PUBLIC_POSTHOG_KEY"
  value      = var.posthog_key
  target     = ["preview"]
  sensitive  = true
  comment    = "PostHog project key"
}

resource "vercel_project_environment_variable" "posthog_host_preview" {
  count      = var.posthog_host != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "NEXT_PUBLIC_POSTHOG_HOST"
  value      = var.posthog_host
  target     = ["preview"]
  comment    = "PostHog API host"
}

resource "vercel_project_environment_variable" "posthog_ui_host_preview" {
  count      = var.posthog_ui_host != "" ? 1 : 0
  project_id = vercel_project.insurflow.id
  key        = "NEXT_PUBLIC_POSTHOG_UI_HOST"
  value      = var.posthog_ui_host
  target     = ["preview"]
  comment    = "PostHog UI host"
}

# =============================================================================
# Environment Variables - Gemini AI (Production + Preview)
# =============================================================================

resource "vercel_project_environment_variable" "gemini_api_key" {
  for_each   = var.gemini_api_key != "" ? toset(["production", "preview"]) : toset([])
  project_id = vercel_project.insurflow.id
  key        = "GEMINI_API_KEY"
  value      = var.gemini_api_key
  target     = [each.key]
  sensitive  = true
  comment    = "Google Gemini API key for AI features"
}
