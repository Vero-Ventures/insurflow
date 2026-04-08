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
  description = "Base URL for Better Auth (e.g., https://insurflow.biz)"
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

variable "grafana_otlp_endpoint" {
  description = "Grafana Cloud OTLP endpoint for metrics and traces"
  type        = string
  default     = ""
}

variable "grafana_otlp_headers" {
  description = "Grafana Cloud OTLP headers (for example Authorization=Basic ...)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "grafana_instance_id" {
  description = "Grafana Cloud instance identifier for dashboard deep links"
  type        = string
  default     = ""
}

variable "posthog_key" {
  description = "PostHog project API key for product analytics"
  type        = string
  sensitive   = true
  default     = ""
}

variable "posthog_host" {
  description = "PostHog API host"
  type        = string
  default     = "https://app.posthog.com"
}

variable "posthog_ui_host" {
  description = "PostHog UI host for deep links"
  type        = string
  default     = "https://us.posthog.com"
}

# =============================================================================
# AI/LLM Configuration (Optional)
# =============================================================================

variable "gemini_api_key" {
  description = "Google Gemini API key for AI features"
  type        = string
  sensitive   = true
  default     = ""
}
