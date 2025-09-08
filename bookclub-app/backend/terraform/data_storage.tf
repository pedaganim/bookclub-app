# Data storage resources managed by Terraform

# DynamoDB tables
resource "aws_dynamodb_table" "books" {
  name         = "${var.service_name}-books-${var.stage}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "bookId"

  attribute {
    name = "bookId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "users" {
  name         = "${var.service_name}-users-${var.stage}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "metadata_cache" {
  name         = "${var.service_name}-metadata-cache-${var.stage}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cacheKey"

  attribute {
    name = "cacheKey"
    type = "S"
  }

  # TTL for cache entries to automatically expire old data
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

# S3 bucket for book covers
resource "aws_s3_bucket" "book_covers" {
  bucket = "${var.service_name}-${var.stage}-book-covers"
}

resource "aws_s3_bucket_cors_configuration" "book_covers" {
  bucket = aws_s3_bucket.book_covers.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = []
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_public_access_block" "book_covers" {
  bucket                  = aws_s3_bucket.book_covers.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Expose names via SSM (optional, for other systems)
resource "aws_ssm_parameter" "books_table_name" {
  name  = "/${var.service_name}/${var.stage}/books_table_name"
  type  = "String"
  value = aws_dynamodb_table.books.name
}

resource "aws_ssm_parameter" "users_table_name" {
  name  = "/${var.service_name}/${var.stage}/users_table_name"
  type  = "String"
  value = aws_dynamodb_table.users.name
}

resource "aws_ssm_parameter" "book_covers_bucket_name" {
  name  = "/${var.service_name}/${var.stage}/book_covers_bucket_name"
  type  = "String"
  value = aws_s3_bucket.book_covers.bucket
}

resource "aws_ssm_parameter" "metadata_cache_table_name" {
  name  = "/${var.service_name}/${var.stage}/metadata_cache_table_name"
  type  = "String"
  value = aws_dynamodb_table.metadata_cache.name
}
