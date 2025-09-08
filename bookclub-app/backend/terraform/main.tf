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

# Frontend hosting S3 bucket (private; served via CloudFront)
resource "aws_s3_bucket" "frontend" {
  count  = var.manage_frontend_bucket ? 1 : 0
  bucket = var.frontend_bucket_name
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  count  = var.manage_frontend_bucket ? 1 : 0
  bucket = aws_s3_bucket.frontend[0].id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  count                   = var.manage_frontend_bucket ? 1 : 0
  bucket                  = aws_s3_bucket.frontend[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
