data "archive_file" "detector_zip" {
  type        = "zip"
  source_dir  = "$${path.module}/src/detector"
  output_path = "$${path.module}/detector_payload.zip"
}

resource "aws_lambda_function" "detector_lambda" {
  filename         = data.archive_file.detector_zip.output_path
  source_code_hash = data.archive_file.detector_zip.output_base64sha256
  function_name    = "CloudScope-Detector"
  role             = aws_iam_role.detector_lambda_role.arn
  handler          = "detector.lambda_handler"
  runtime          = "python3.11"
  timeout          = 60

  environment {
    variables = {
      SNS_TOPIC_ARN   = aws_sns_topic.anomalies.arn
      DB_HOST         = aws_db_instance.timescaledb.address
      DB_USER         = "postgres"
      DB_PASS         = var.db_password
      DB_NAME         = "postgres"
    }
  }
}

data "archive_file" "explainer_zip" {
  type        = "zip"
  source_dir  = "$${path.module}/src/explainer"
  output_path = "$${path.module}/explainer_payload.zip"
}

resource "aws_lambda_function" "explainer_lambda" {
  filename         = data.archive_file.explainer_zip.output_path
  source_code_hash = data.archive_file.explainer_zip.output_base64sha256
  function_name    = "CloudScope-Explainer"
  role             = aws_iam_role.explainer_lambda_role.arn
  handler          = "explainer.lambda_handler"
  runtime          = "python3.11"
  timeout          = 60

  environment {
    variables = {
      GEMINI_API_KEY  = "YOUR_API_KEY_HERE"
      FASTAPI_URL     = "http://$${aws_instance.fastapi_server.public_ip}:8000"
    }
  }
}

resource "aws_sns_topic_subscription" "explainer_sub" {
  topic_arn = aws_sns_topic.anomalies.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.explainer_lambda.arn
}

resource "aws_lambda_permission" "allow_sns_invoke" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.explainer_lambda.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.anomalies.arn
}
