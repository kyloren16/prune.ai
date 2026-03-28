import os
import json
import random
import urllib.request
from datetime import datetime

# Standard Mock Data Generation (No external deps)
def get_mock_cloudwatch_vitals(instance_id, anomaly=False):
    if anomaly:
        return {
            "instance_id": instance_id,
            "cpu_usage_percent": random.uniform(85.0, 98.0),
            "memory_usage_percent": random.uniform(70.0, 90.0),
            "network_in_bytes": random.randint(500000000, 1000000000)
        }
    return {
        "instance_id": instance_id,
        "cpu_usage_percent": random.uniform(10.0, 30.0),
        "memory_usage_percent": random.uniform(20.0, 40.0),
        "network_in_bytes": random.randint(1000000, 10000000)
    }

def get_mock_cost_explorer_spend():
    return {"hourly_spend": random.uniform(0.10, 5.0)}

def calculate_suspicion_score(vitals, spend):
    """Simple weighted logic (No ML deps) for stable demo."""
    cpu = vitals['cpu_usage_percent']
    spend_val = spend['hourly_spend']
    
    # Simple threshold-based score
    s1 = 0.95 if cpu > 80 else (cpu / 100)
    s2 = 0.90 if spend_val > 3.0 else (spend_val / 5.0)
    
    final_score = (s1 * 0.6) + (s2 * 0.4)
    return float(round(final_score, 2))

def publish_to_sns(bundle):
    """Publishes to SNS (Boto3 is standard in Lambda)."""
    try:
        import boto3
        sns = boto3.client('sns', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        topic_arn = os.environ.get('SNS_TOPIC_ARN')
        if topic_arn:
            sns.publish(TopicArn=topic_arn, Message=json.dumps(bundle))
            print(f"[SNS-PUBLISH] Success: {bundle['suspicion_score']}")
    except Exception as e:
        print(f"[SNS-ERROR] Failed: {e}")

def lambda_handler(event, context):
    print("[DETECTOR] Initializing Triple-Signal Ingestion...")
    instance_id = "i-0abcd1234efgh5678"
    
    # Simulating anomaly for demo
    vitals = get_mock_cloudwatch_vitals(instance_id, anomaly=True)
    spend = get_mock_cost_explorer_spend()
    
    score = calculate_suspicion_score(vitals, spend)
    print(f"[ANALYSIS] Instance: {instance_id} | Score: {score}")
    
    if score >= 0.60:
        event_payload = {
            "instance_id": instance_id,
            "suspicion_score": score,
            "metrics": {**vitals, **spend},
            "timestamp": datetime.utcnow().isoformat(),
            "role_arn": os.environ.get("TARGET_ROLE_ARN", "arn:aws:iam::008533941157:role/PruneAI_CrossAccount_Role")
        }
        publish_to_sns(event_payload)
    
    return {"statusCode": 200, "score": score}

if __name__ == '__main__':
    lambda_handler({}, None)
