variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, prod)"
}

variable "lambda_name" {
  type        = string
  description = "Lambda function name to monitor"
}

variable "api_id" {
  type        = string
  description = "API Gateway HTTP API ID to monitor"
}

variable "budget_limit_usd" {
  type        = number
  description = "Monthly budget limit in USD"
  default     = 5.0
}

variable "alert_email" {
  type        = string
  description = "Optional email address for AWS Budget alerts"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}

