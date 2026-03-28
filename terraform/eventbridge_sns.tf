resource "aws_sns_topic" "anomalies" {
  name = "cloudscope-anomalies"
}

resource "aws_cloudwatch_event_rule" "fifteen_min_pulse" {
  name                = "cloudscope-detector-pulse"
  description         = "Triggers the Detector Lambda every 15 minutes"
  schedule_expression = "rate(15 minutes)"
}

resource "aws_cloudwatch_event_target" "trigger_detector" {
  rule      = aws_cloudwatch_event_rule.fifteen_min_pulse.name
  target_id = "DetectorLambda"
  arn       = aws_lambda_function.detector_lambda.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.detector_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.fifteen_min_pulse.arn
}
