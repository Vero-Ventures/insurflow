terraform {
  required_version = ">= 1.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }

  # Uncomment to use remote state (recommended for team collaboration)
  # backend "s3" {
  #   bucket = "insurflow-terraform-state"
  #   key    = "vercel/terraform.tfstate"
  #   region = "us-east-1"
  # }
}
