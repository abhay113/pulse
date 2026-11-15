variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, prod)"
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be either 'dev' or 'prod'."
  }
}

variable "memory_size" {
  type        = number
  description = "Lambda memory size in MB"
  default     = 128
  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 1024
    error_message = "Memory size must be between 128 and 1024 MB."
  }
}

variable "timeout" {
  type        = number
  description = "Lambda timeout in seconds"
  default     = 5
  validation {
    condition     = var.timeout >= 1 && var.timeout <= 15
    error_message = "Timeout must be between 1 and 15 seconds."
  }
}

variable "reserved_concurrency" {
  type        = number
  description = "Maximum concurrent Lambda executions cap"
  default     = 20
  validation {
    condition     = var.reserved_concurrency >= 1 && var.reserved_concurrency <= 100
    error_message = "Reserved concurrency must be between 1 and 100."
  }
}

variable "throttling_rate_limit" {
  type        = number
  description = "API Gateway steady-state request rate limit"
  default     = 50
}

variable "throttling_burst_limit" {
  type        = number
  description = "API Gateway burst request rate limit"
  default     = 100
}

variable "cors_allow_origins" {
  type        = list(string)
  description = "Optional CORS allow origins (empty by default since Cloudflare Worker proxies /api/*)"
  default     = []
}

variable "tags" {
  type        = map(string)
  description = "Resource tags"
  default     = {}
}

