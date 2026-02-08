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
