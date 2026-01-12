# The Vercel provider can be configured via:
# 1. terraform.tfvars (vercel_api_token variable)
# 2. Environment variable (VERCEL_API_TOKEN) - used as fallback
#
# If both are set, the variable takes precedence.

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}
