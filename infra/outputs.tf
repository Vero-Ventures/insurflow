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

# Note: Domains are managed separately via vercel_project_domain resources
# or automatically assigned by Vercel (e.g., project-name.vercel.app)
