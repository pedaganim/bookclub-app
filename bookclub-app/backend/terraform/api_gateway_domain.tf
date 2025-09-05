# API Gateway custom domain, base path mapping, and related data sources

# Read CloudFormation exports from Serverless stack
# These export names come from backend/serverless.yml outputs

data "aws_cloudformation_export" "rest_api_id" {
  name = "${var.service_name}-${var.stage}-RestApiId"
}

data "aws_cloudformation_export" "user_pool_id" {
  name = "${var.service_name}-${var.stage}-UserPoolId"
}

data "aws_cloudformation_export" "user_pool_client_id" {
  name = "${var.service_name}-${var.stage}-UserPoolClientId"
}

# ACM certificate for the API custom domain (must be in us-east-1 for EDGE)
resource "aws_acm_certificate" "api_cert" {
  domain_name       = var.api_fqdn
  validation_method = "DNS"
}

# Create DNS validation records in Route53
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

# Validate the certificate
resource "aws_acm_certificate_validation" "api_cert_validation" {
  certificate_arn         = aws_acm_certificate.api_cert.arn
  validation_record_fqdns = [for r in aws_route53_record.api_cert_validation : r.fqdn]
}

# API Gateway custom domain (edge-optimized)
resource "aws_api_gateway_domain_name" "api_domain" {
  domain_name              = var.api_fqdn
  certificate_arn          = aws_acm_certificate_validation.api_cert_validation.certificate_arn
  endpoint_configuration {
    types = ["EDGE"]
  }
}

# Base path mapping to the deployed REST API and stage
resource "aws_api_gateway_base_path_mapping" "api_mapping" {
  api_id      = data.aws_cloudformation_export.rest_api_id.value
  stage_name  = var.stage
  domain_name = aws_api_gateway_domain_name.api_domain.domain_name
  base_path   = "" # root
}

# Route53 alias for the API custom domain to API Gateway CloudFront distribution
resource "aws_route53_record" "api_alias" {
  zone_id = var.hosted_zone_id
  name    = var.api_fqdn
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api_domain.cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.api_domain.cloudfront_zone_id
    evaluate_target_health = false
  }
}
