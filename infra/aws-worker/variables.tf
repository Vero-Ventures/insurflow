variable "aws_region" {
  description = "AWS region for the worker infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "name_prefix" {
  description = "Prefix for worker infrastructure resources"
  type        = string
  default     = "insurflow-letter-worker"
}

variable "database_url_parameter_arn" {
  description = "SSM parameter ARN containing the worker database URL"
  type        = string
}

variable "gemini_api_key_parameter_arn" {
  description = "SSM parameter ARN containing the worker Gemini API key"
  type        = string
}

variable "gemini_model" {
  description = "Gemini model name used by the worker"
  type        = string
  default     = "gemini-2.5-flash"
}

variable "poll_interval" {
  description = "Worker queue poll interval"
  type        = string
  default     = "2s"
}

variable "image_tag" {
  description = "Container image tag to deploy from ECR"
  type        = string
  default     = "latest"
}

variable "cpu" {
  description = "Fargate task CPU units"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory in MiB"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired ECS service task count. Set to 1 for validation deploys."
  type        = number
  default     = 0
}
