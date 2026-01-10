# =============================================================================
# Variables
# =============================================================================

variable "vercel_api_token" {
  description = "Vercel API token from https://vercel.com/account/tokens"
  type        = string
  sensitive   = true
  default     = null # Will use VERCEL_API_TOKEN env var if not set
}

variable "vercel_team_id" {
  description = "Vercel Team ID or slug"
  type        = string
  default     = null # Will use VERCEL_TEAM env var if not set
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

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

# =============================================================================
# Database Configuration
# =============================================================================

variable "database_url" {
  description = "PostgreSQL connection string (Neon)"
  type        = string
  sensitive   = true
}

# =============================================================================
# Auth Configuration
# =============================================================================

variable "better_auth_secret" {
  description = "Secret key for Better Auth session encryption"
  type        = string
  sensitive   = true
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
