variable "aws_region" {
  description = "AWS region to use"
  type        = string
  default     = "us-east-1"
}

variable "ssm_path_prefix" {
  description = "SSM parameter path prefix for OAuth secrets"
  type        = string
  default     = "/bookclub/oauth"
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "service_name" {
  description = "Service name used for CloudFormation export lookups (must match serverless service)"
  type        = string
  default     = "bookclub-app"
}

variable "stage" {
  description = "Deployment stage (e.g., dev, prod)"
  type        = string
  default     = "prod"
}

variable "api_fqdn" {
  description = "API custom domain FQDN, e.g., api.booklub.shop"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for the apex domain (e.g., Z123ABCXYZ)"
  type        = string
}

variable "hosted_zone_name" {
  description = "Optional Route53 hosted zone name (e.g., booklub.shop). Used if hosted_zone_id is not provided."
  type        = string
  default     = ""
}

variable "frontend_bucket_name" {
  description = "S3 bucket name for hosting the frontend build (synced from CI)"
  type        = string
}

variable "enable_api_mapping" {
  description = "Whether to create API Gateway base path mapping (requires Serverless CFN exports to exist)"
  type        = bool
  default     = true
}

variable "manage_frontend_bucket" {
  description = "Whether Terraform should create/manage the frontend S3 bucket. Set to true only if bucket does not already exist."
  type        = bool
  default     = false
}

variable "manage_dns" {
  description = "Whether Terraform should manage Route53 records and ACM validation for the API custom domain. If false, Terraform will not create Route53 records or the API Gateway custom domain; you'll create DNS CNAMEs manually and can enable later."
  type        = bool
  default     = false
}
