# The Cloudflare provider can be configured via:
# 1. terraform.tfvars (cloudflare_api_token variable)
# 2. Environment variable (CLOUDFLARE_API_TOKEN) - used as fallback
#
# If both are set, the variable takes precedence.

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
