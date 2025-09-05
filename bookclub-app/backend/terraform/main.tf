terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Google OAuth SSM Parameters
resource "aws_ssm_parameter" "google_client_id" {
  name  = "${var.ssm_path_prefix}/google_client_id"
  type  = "String"
  value = var.google_client_id
}

resource "aws_ssm_parameter" "google_client_secret" {
  name  = "${var.ssm_path_prefix}/google_client_secret"
  type  = "SecureString"
  value = var.google_client_secret
}
