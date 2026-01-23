terraform {
  required_version = ">= 1.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # Uncomment to use remote state (recommended for team collaboration)
  # backend "s3" {
  #   bucket = "insurflow-terraform-state"
  #   key    = "cloudflare/terraform.tfstate"
  #   region = "us-east-1"
  # }
}
