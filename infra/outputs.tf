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

output "domains" {
  description = "Project domains"
  value       = vercel_project.insurflow.domains
}
