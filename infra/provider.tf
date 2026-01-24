# The Cloudflare provider is configured via environment variable:
# CLOUDFLARE_API_TOKEN
#
# This is only needed if you want to use Terraform for infrastructure management.
# Currently, deployments are handled via GitHub Actions.

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
