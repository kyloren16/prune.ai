resource "aws_dynamodb_table" "snooze_registry" {
  name           = "SnoozeRegistry"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5  # Free Tier Eligible
  write_capacity = 5

  hash_key = "instance_id"

  attribute {
    name = "instance_id"
    type = "S"
  }

  tags = {
    Name = "CloudScope-SnoozeRegistry"
  }
}
