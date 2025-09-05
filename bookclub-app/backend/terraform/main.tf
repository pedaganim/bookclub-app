terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
  backend "s3" {}
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

# Frontend hosting S3 bucket (private; served via CloudFront)
resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
