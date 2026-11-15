variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, prod)"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in format 'owner/repo' (e.g. 'octocat/pulse')"
  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repo))
    error_message = "Must be in the format 'owner/repo'."
  }
}

variable "state_bucket_arn" {
  type        = string
  description = "ARN of the Terraform S3 state bucket"
}

variable "create_oidc_provider" {
  type        = bool
  description = "Whether to create the GitHub OIDC provider (set to false if one already exists in the AWS account)"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}

