resource "aws_db_parameter_group" "timescaledb_pg" {
  name        = "cloudscope-pg"
  family      = "postgres15"
  description = "Parameter group to enable TimescaleDB extension"

  parameter {
    name  = "shared_preload_libraries"
    value = "timescaledb"
    apply_method = "pending-reboot"
  }
}

resource "aws_db_instance" "timescaledb" {
  identifier           = "cloudscope-timescaledb"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t4g.micro" # Free Tier Eligible
  allocated_storage    = 20
  storage_type         = "gp2"
  username             = "postgres"
  password             = var.db_password
  parameter_group_name = aws_db_parameter_group.timescaledb_pg.name
  skip_final_snapshot  = true
  publicly_accessible  = true
  
  vpc_security_group_ids = [aws_security_group.db_sg.id]
}

resource "aws_security_group" "db_sg" {
  name        = "timescaledb_sg"
  description = "Allow inbound PostgreSQL traffic"

  ingress {
    description = "PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
