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
