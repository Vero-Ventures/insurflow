# =============================================================================
# Outputs
# =============================================================================

output "project_name" {
  description = "Cloudflare Pages Project Name"
  value       = cloudflare_pages_project.insurflow.name
}

output "project_subdomain" {
  description = "Cloudflare Pages subdomain (e.g., insurflow.pages.dev)"
  value       = "${cloudflare_pages_project.insurflow.name}.pages.dev"
}

output "production_url" {
  description = "Production deployment URL"
  value       = "https://${cloudflare_pages_project.insurflow.name}.pages.dev"
}

output "account_id" {
  description = "Cloudflare Account ID"
  value       = var.cloudflare_account_id
}
