output "ecr_repository_url" {
  description = "ECR repository URL for the letter worker image"
  value       = aws_ecr_repository.worker.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.worker.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.worker.name
}

output "cloudwatch_log_group_name" {
  description = "CloudWatch Logs group for the worker"
  value       = aws_cloudwatch_log_group.worker.name
}
