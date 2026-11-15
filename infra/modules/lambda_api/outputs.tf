output "api_url" {
  description = "The HTTP API Gateway execution URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "api_id" {
  description = "The HTTP API Gateway ID"
  value       = aws_apigatewayv2_api.http_api.id
}

output "lambda_name" {
  description = "Name of the created Lambda function"
  value       = aws_lambda_function.api.function_name
}

output "lambda_arn" {
  description = "ARN of the created Lambda function"
  value       = aws_lambda_function.api.arn
}

output "log_group_name" {
  description = "Name of the Lambda CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}

