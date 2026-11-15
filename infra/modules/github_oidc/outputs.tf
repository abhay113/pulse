output "deploy_role_arn" {
  description = "ARN of the GitHub Actions OIDC deployment IAM role"
  value       = aws_iam_role.deployer.arn
}

output "deploy_role_name" {
  description = "Name of the GitHub Actions deployment role"
  value       = aws_iam_role.deployer.name
}

