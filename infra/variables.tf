# =============================================================================
# Cloudflare Configuration
# =============================================================================

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Pages edit permissions"
  type        = string
  sensitive   = true
  default     = null # Will use CLOUDFLARE_API_TOKEN env var if not set
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID (found in dashboard sidebar)"
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name"
  type        = string
  default     = "insurflow"
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
  description = "Base URL for Better Auth (e.g., https://insurflow.pages.dev)"
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
# Observability & Analytics
# =============================================================================

# Axiom (Structured Logging)
variable "axiom_token" {
  description = "Axiom API token from https://app.axiom.co/settings/tokens"
  type        = string
  sensitive   = true
  default     = ""
}

variable "axiom_dataset" {
  description = "Axiom dataset name"
  type        = string
  default     = "insurflow"
}

variable "axiom_org_id" {
  description = "Axiom organization ID (optional)"
  type        = string
  default     = ""
}

# Sentry (Error Tracking)
variable "sentry_dsn" {
  description = "Sentry DSN for server-side error tracking"
  type        = string
  sensitive   = true
  default     = ""
}

variable "next_public_sentry_dsn" {
  description = "Sentry DSN for client-side error tracking"
  type        = string
  default     = ""
}

variable "sentry_auth_token" {
  description = "Sentry auth token for source map uploads (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sentry_org" {
  description = "Sentry organization slug"
  type        = string
  default     = ""
}

variable "sentry_project" {
  description = "Sentry project slug"
  type        = string
  default     = ""
}

# PostHog (Product Analytics)
variable "next_public_posthog_key" {
  description = "PostHog project API key from https://app.posthog.com/project/settings"
  type        = string
  default     = ""
}

variable "next_public_posthog_host" {
  description = "PostHog instance URL"
  type        = string
  default     = "https://app.posthog.com"
}
