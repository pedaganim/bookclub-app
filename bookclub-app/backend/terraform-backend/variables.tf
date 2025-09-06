variable "aws_region" {
  description = "AWS region for the Terraform backend resources"
  type        = string
}

variable "tf_backend_bucket" {
  description = "S3 bucket name to store Terraform state"
  type        = string
}

variable "tf_backend_lock_table" {
  description = "DynamoDB table name for Terraform state locking"
  type        = string
}
