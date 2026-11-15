# ==============================================================================
# OPTIONAL MODULE: Custom API Domain (ACM + Cloudflare DNS)
# Status: Disabled by default. Uncomment and supply variables when a custom
# domain (e.g., api.pulse.yourdomain.com) is desired directly on API Gateway.
# Note: In the standard Pulse architecture, Cloudflare Worker proxies /api/*
# so requests already use the Worker's custom domain without needing ACM.
# ==============================================================================

/*
variable "domain_name" {
  type        = string
  description = "Custom domain name (e.g. api.pulse.example.com)"
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare Zone ID for the root domain"
}

variable "api_id" {
  type        = string
  description = "API Gateway HTTP API ID"
}

variable "stage_name" {
  type        = string
  description = "Stage name to map ($default)"
  default     = "$default"
}

# 1. Request ACM Certificate in us-east-1 (or current region)
resource "aws_acm_certificate" "api_cert" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# 2. Add DNS Validation CNAME in Cloudflare
resource "cloudflare_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = var.cloudflare_zone_id
  name    = each.value.name
  content = each.value.record
  type    = each.value.type
  ttl     = 60
  proxied = false
}

# 3. Wait for Certificate Validation
resource "aws_acm_certificate_validation" "cert_validation" {
  certificate_arn         = aws_acm_certificate.api_cert.arn
  validation_record_fqdns = [for record in cloudflare_record.acm_validation : record.hostname]
}

# 4. Create API Gateway Custom Domain Name
resource "aws_apigatewayv2_domain_name" "custom_domain" {
  domain_name = var.domain_name

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.cert_validation.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

# 5. Map Custom Domain to API Gateway Stage
resource "aws_apigatewayv2_api_mapping" "mapping" {
  api_id      = var.api_id
  domain_name = aws_apigatewayv2_domain_name.custom_domain.id
  stage       = var.stage_name
}

# 6. Point Cloudflare DNS CNAME to API Gateway Target Domain
resource "cloudflare_record" "api_cname" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain_name
  content = aws_apigatewayv2_domain_name.custom_domain.domain_name_configuration[0].target_domain_name
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

output "custom_domain_url" {
  value = "https://${var.domain_name}"
}
*/

