locals {
  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# 1. Lambda API + API Gateway HTTP API
module "lambda_api" {
  source = "../../modules/lambda_api"

  project_name           = var.project_name
  environment            = var.environment
  memory_size            = 256
  timeout                = 5
  reserved_concurrency   = -1
  throttling_rate_limit  = 100
  throttling_burst_limit = 200
  cors_allow_origins     = var.cors_allow_origins
  hmac_secret            = var.hmac_secret
  ses_from_email         = var.ses_from_email
  ses_to_email           = var.ses_to_email
  tags                   = local.tags
}

# 2. GitHub Actions OIDC Deployment Role
module "github_oidc" {
  source = "../../modules/github_oidc"

  project_name         = var.project_name
  environment          = var.environment
  github_repo          = var.github_repo
  state_bucket_arn     = var.state_bucket_arn
  create_oidc_provider = var.create_oidc_provider
  tags                 = local.tags
}

# 3. Observability (Alarms & Budget)
module "observability" {
  source = "../../modules/observability"

  project_name     = var.project_name
  environment      = var.environment
  lambda_name      = module.lambda_api.lambda_name
  api_id           = module.lambda_api.api_id
  budget_limit_usd = var.budget_limit_usd
  alert_email      = var.alert_email
  tags             = local.tags
}

