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

  lifecycle {
    prevent_destroy = true
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

  lifecycle {
    prevent_destroy = true
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

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "bookclub_groups" {
  name         = "${var.service_name}-bookclub-groups-${var.stage}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "clubId"

  attribute {
    name = "clubId"
    type = "S"
  }

  attribute {
    name = "inviteCode"
    type = "S"
  }

  attribute {
    name = "createdBy"
    type = "S"
  }

  global_secondary_index {
    name            = "InviteCodeIndex"
    hash_key        = "inviteCode"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "CreatedByIndex"
    hash_key        = "createdBy"
    projection_type = "ALL"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_dynamodb_table" "bookclub_members" {
  name         = "${var.service_name}-bookclub-members-${var.stage}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "clubId"
  range_key    = "userId"

  attribute {
    name = "clubId"
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

  lifecycle {
    prevent_destroy = true
  }
}

# S3 bucket for book covers
resource "aws_s3_bucket" "book_covers" {
  bucket = "${var.service_name}-${var.stage}-book-covers"

  lifecycle {
    prevent_destroy = true
  }
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
  block_public_policy     = false # Allow bucket policies for public read access
  ignore_public_acls      = true
  restrict_public_buckets = false # Allow public access through bucket policy
}

# Bucket policy to allow public read access to book covers
# This policy allows anyone to read book cover images under the book-covers/ prefix
# while maintaining security by:
# - Only allowing read access (s3:GetObject)
# - Restricting access to the book-covers/ prefix only
# - Upload access still controlled through signed URLs in generateUploadUrl handler
resource "aws_s3_bucket_policy" "book_covers_policy" {
  bucket = aws_s3_bucket.book_covers.id

  depends_on = [aws_s3_bucket_public_access_block.book_covers]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadBookCovers"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.book_covers.arn}/book-covers/*"
      }
    ]
  })
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

resource "aws_ssm_parameter" "bookclub_groups_table_name" {
  name  = "/${var.service_name}/${var.stage}/bookclub_groups_table_name"
  type  = "String"
  value = aws_dynamodb_table.bookclub_groups.name
}

resource "aws_ssm_parameter" "bookclub_members_table_name" {
  name  = "/${var.service_name}/${var.stage}/bookclub_members_table_name"
  type  = "String"
  value = aws_dynamodb_table.bookclub_members.name
}
