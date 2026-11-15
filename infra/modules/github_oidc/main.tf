terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }
}

data "aws_caller_identity" "current" {}

# 1. GitHub Actions OIDC Provider
# GitHub OIDC thumbprints (GitHub's official well-known root CA thumbprints)
resource "aws_iam_openid_connect_provider" "github" {
  count          = var.create_oidc_provider ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com", "https://github.com/${split("/", var.github_repo)[0]}"]
  thumbprint_list = [
    "d367a47959a77b088bec4fe3e7dd3ec9ba733ab5",
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f8d264fcd9",
  ]
  tags = var.tags
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

# 2. Assume Role Policy Document scoped to this repo
data "aws_iam_policy_document" "oidc_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:*",
        "repo:${split("/", var.github_repo)[0]}*${split("/", var.github_repo)[1]}*:*",
      ]
    }
  }
}

# 3. IAM Deployment Role
resource "aws_iam_role" "deployer" {
  name               = "${var.project_name}-${var.environment}-github-deployer"
  assume_role_policy = data.aws_iam_policy_document.oidc_assume_role.json
  tags               = var.tags
}

# 4. Scoped Deployment Permissions Policy
data "aws_iam_policy_document" "deployer_permissions" {
  # S3 State Bucket Access
  statement {
    sid    = "TerraformStateAccess"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
      "s3:GetBucketVersioning",
    ]
    resources = [var.state_bucket_arn]
  }

  statement {
    sid    = "TerraformStateObjectAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${var.state_bucket_arn}/${var.project_name}/${var.environment}/*"]
  }

  # Lambda Management
  statement {
    sid    = "LambdaManagement"
    effect = "Allow"
    actions = [
      "lambda:*",
    ]
    resources = [
      "arn:aws:lambda:*:${data.aws_caller_identity.current.account_id}:function:${var.project_name}-${var.environment}-*",
    ]
  }

  # API Gateway v2 HTTP API Management
  statement {
    sid    = "ApiGatewayV2Management"
    effect = "Allow"
    actions = [
      "apigateway:*",
    ]
    resources = [
      "arn:aws:apigateway:*::/*",
    ]
  }

  # IAM Management for Lambda & Deployer roles and OIDC provider
  statement {
    sid    = "IAMManagement"
    effect = "Allow"
    actions = [
      "iam:*",
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-${var.environment}-*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com",
    ]
  }

  # CloudWatch Logs, Metrics, Alarms, and Budgets
  statement {
    sid    = "ObservabilityManagement"
    effect = "Allow"
    actions = [
      "logs:*",
      "cloudwatch:*",
      "budgets:*",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "deployer" {
  name   = "${var.project_name}-${var.environment}-deployer-policy"
  role   = aws_iam_role.deployer.id
  policy = data.aws_iam_policy_document.deployer_permissions.json
}

