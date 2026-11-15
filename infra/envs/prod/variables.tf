variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project identifier"
  default     = "pulse"
}

variable "environment" {
  type        = string
  description = "Target deployment environment"
  default     = "prod"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository formatted as owner/repo"
}

variable "state_bucket_arn" {
  type        = string
  description = "ARN of the Terraform S3 bootstrap state bucket"
}

variable "create_oidc_provider" {
  type        = bool
  description = "Whether to create the GitHub OIDC provider"
  default     = true
}

variable "budget_limit_usd" {
  type        = number
  description = "Monthly budget cap in USD"
  default     = 10.0
}

variable "alert_email" {
  type        = string
  description = "Optional alert email address for AWS Budget notifications"
  default     = ""
}

variable "cors_allow_origins" {
  type        = list(string)
  description = "Optional CORS allow origins"
  default     = []
}

