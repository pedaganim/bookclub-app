output "api_domain_name" {
  description = "Custom API domain FQDN"
  value       = var.api_fqdn
}

output "api_domain_cloudfront" {
  description = "API Gateway domain CloudFront distribution DNS name"
  value       = try(aws_api_gateway_domain_name.api_domain.cloudfront_domain_name, null)
}

output "api_domain_cf_zone_id" {
  description = "API Gateway domain CloudFront hosted zone id"
  value       = try(aws_api_gateway_domain_name.api_domain.cloudfront_zone_id, null)
}
