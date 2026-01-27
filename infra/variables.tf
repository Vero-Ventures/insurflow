# =============================================================================
# Variables Reference
# =============================================================================
#
# These variables document the configuration needed for InsurFlow deployment.
# Actual values are managed via GitHub Secrets/Variables, not Terraform.
#
# See main.tf for complete setup instructions.
# =============================================================================

# =============================================================================
# Cloudflare Configuration
# =============================================================================

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers edit permissions"
  type        = string
  sensitive   = true
  default     = null
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID (found in dashboard sidebar)"
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Cloudflare Workers project name"
  type        = string
  default     = "insurflow"
}

# =============================================================================
# Database Configuration
# =============================================================================

variable "database_url" {
  description = "PostgreSQL connection string (Neon production)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "neon_project_id" {
  description = "Neon project ID for database branching"
  type        = string
  default     = ""
}

variable "neon_api_key" {
  description = "Neon API key for branch management"
  type        = string
  sensitive   = true
  default     = ""
}

# =============================================================================
# Auth Configuration
# =============================================================================

variable "better_auth_secret" {
  description = "Secret key for Better Auth session encryption (min 32 chars)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "better_auth_url" {
  description = "Base URL for Better Auth (e.g., https://insurflow.workers.dev)"
  type        = string
  default     = "https://insurflow.workers.dev"
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

variable "next_public_posthog_key" {
  description = "PostHog project API key"
  type        = string
  default     = ""
}

variable "next_public_posthog_host" {
  description = "PostHog instance URL"
  type        = string
  default     = "https://app.posthog.com"
}
