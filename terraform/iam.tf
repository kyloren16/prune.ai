# IAM Role for Detector Lambda
resource "aws_iam_role" "detector_lambda_role" {
  name = "detector_lambda_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "detector_basic" {
  role       = aws_iam_role.detector_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "detector_custom_policy" {
  name   = "detector_custom_policy"
  role   = aws_iam_role.detector_lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:GetMetricData",
          "cloudwatch:GetMetricStatistics",
          "cloudwatch:ListMetrics",
          "ce:GetCostAndUsage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["sns:Publish"]
        Resource = aws_sns_topic.anomalies.arn
      }
    ]
  })
}

# IAM Role for Explainer Lambda
resource "aws_iam_role" "explainer_lambda_role" {
  name = "explainer_lambda_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "explainer_basic" {
  role       = aws_iam_role.explainer_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "explainer_custom_policy" {
  name   = "explainer_custom_policy"
  role   = aws_iam_role.explainer_lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["cloudtrail:LookupEvents"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["ec2:StopInstances", "ec2:DescribeInstances", "ec2:CreateTags"]
        Resource = "*"
      }
    ]
  })
}

# IAM Role for EC2 FastAPI Backup Server
resource "aws_iam_role" "fastapi_ec2_role" {
  name = "fastapi_ec2_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_instance_profile" "fastapi_ec2_profile" {
  name = "fastapi_ec2_profile"
  role = aws_iam_role.fastapi_ec2_role.name
}

resource "aws_iam_role_policy" "fastapi_custom_policy" {
  name   = "fastapi_custom_policy"
  role   = aws_iam_role.fastapi_ec2_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:DescribeInstances"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.snooze_registry.arn
      }
    ]
  })
}
