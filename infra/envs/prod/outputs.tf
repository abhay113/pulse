output "api_url" {
  description = "API Gateway HTTP API invoke URL"
  value       = module.lambda_api.api_url
}

output "lambda_name" {
  description = "Name of the API Lambda function"
  value       = module.lambda_api.lambda_name
}

output "deploy_role_arn" {
  description = "ARN of the GitHub Actions OIDC deployment IAM role"
  value       = module.github_oidc.deploy_role_arn
}

