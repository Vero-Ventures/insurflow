# The Vercel provider is configured via environment variables:
# - VERCEL_API_TOKEN: API token from https://vercel.com/account/tokens
#
# Environment variables are the recommended approach for security.
# Do not hardcode tokens in Terraform files.

provider "vercel" {
  # Configuration is read from environment variables
}
