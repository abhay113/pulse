output "state_bucket_name" {
  description = "Name of the created Terraform S3 state bucket"
  value       = aws_s3_bucket.state.id
}

output "aws_region" {
  description = "AWS region of the state bucket"
  value       = var.aws_region
}

