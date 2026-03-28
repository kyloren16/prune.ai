import boto3
import os

# Use region from environment or default to us-east-1
region = os.environ.get("AWS_REGION", "us-east-1")

# Prune.ai's internal database for tracking snoozed instances.
dynamodb = boto3.resource('dynamodb', region_name=region)
SNOOZE_TABLE = "SnoozeRegistry"

def _get_assumed_role_session(role_arn: str):
    """Assumes the user's AWS IAM Role to fetch temporary credentials."""
    sts_client = boto3.client('sts')
    try:
        assumed_role_object = sts_client.assume_role(
            RoleArn=role_arn,
            RoleSessionName="PruneAIOpsSession"
        )
        credentials = assumed_role_object['Credentials']
        return boto3.Session(
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken'],
            region_name=region
        )
    except Exception as e:
        raise Exception(f"Failed to assume role: {str(e)}")

def verify_role_arn(role_arn: str):
    """Verifies that Prune.ai can assume the requested cross-account Role ARN."""
    try:
        session = _get_assumed_role_session(role_arn)
        sts = session.client('sts')
        identity = sts.get_caller_identity()
        return {"status": "success", "account": identity['Account'], "role_uri": identity['Arn']}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def stop_instance(instance_id: str, role_arn: str):
    """Stops an EC2 instance to remediate the anomaly (Manual Resolution)."""
    try:
        session = _get_assumed_role_session(role_arn)
        ec2_client = session.client('ec2')
        response = ec2_client.stop_instances(InstanceIds=[instance_id])
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def restart_instance(instance_id: str, role_arn: str):
    """Starts a stopped EC2 instance to undo remediation."""
    try:
        session = _get_assumed_role_session(role_arn)
        ec2_client = session.client('ec2')
        response = ec2_client.start_instances(InstanceIds=[instance_id])
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def add_to_snooze_registry(instance_id: str):
    """Adds instance_id to SnoozeRegistry to pause monitoring (Internal SaaS State)."""
    try:
        table = dynamodb.Table(SNOOZE_TABLE)
        response = table.put_item(
            Item={
                'instance_id': instance_id
            }
        )
        return {"status": "success", "response": response}
    except Exception as e:
        return {"status": "error", "message": str(e)}
