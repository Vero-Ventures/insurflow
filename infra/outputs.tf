# =============================================================================
# Outputs Reference
# =============================================================================
#
# These outputs document the expected deployment URLs for InsurFlow.
# Since deployments are managed via GitHub Actions, these are reference values only.
# =============================================================================

output "production_url" {
  description = "Production deployment URL"
  value       = "https://${var.project_name}.workers.dev"
}

output "preview_url_pattern" {
  description = "Preview deployment URL pattern"
  value       = "https://${var.project_name}-preview-pr-{number}.workers.dev"
}

output "project_name" {
  description = "Cloudflare Workers project name"
  value       = var.project_name
}
