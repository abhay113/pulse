output "lambda_alarm_arn" {
  description = "ARN of the Lambda error CloudWatch alarm"
  value       = aws_cloudwatch_metric_alarm.lambda_errors.arn
}

output "api_alarm_arn" {
  description = "ARN of the API Gateway 5xx CloudWatch alarm"
  value       = aws_cloudwatch_metric_alarm.api_5xx_errors.arn
}

output "budget_name" {
  description = "Name of the monthly AWS budget"
  value       = aws_budgets_budget.cost_budget.name
}

