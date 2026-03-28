import random
from datetime import datetime
import json

def get_mock_cloudwatch_vitals(instance_id: str, anomaly: bool = False):
    """Generates mock CPU, Memory, and Network vitals."""
    if anomaly:
        # Generate an anomaly spike
        return {
            "instance_id": instance_id,
            "cpu_usage_percent": round(random.uniform(85.0, 99.9), 2),
            "memory_usage_percent": round(random.uniform(90.0, 99.0), 2),
            "network_in_bytes": random.randint(500000000, 1000000000) # 500MB+ spike
        }
    else:
        # Normal behavior
        return {
            "instance_id": instance_id,
            "cpu_usage_percent": round(random.uniform(10.0, 30.0), 2),
            "memory_usage_percent": round(random.uniform(20.0, 40.0), 2),
            "network_in_bytes": random.randint(1000000, 50000000)
        }

def get_mock_cost_explorer_spend():
    """Generates mock hourly spend data."""
    # Assuming standard run rate is $0.50/hr, spike is $5.00/hr
    run_rate = random.choice([0.5, 0.55, 0.45, 5.0, 6.5]) 
    return {"hourly_spend": run_rate}

def get_mock_cloudtrail_logs(minutes_window: int = 30):
    """Generates a mock CloudTrail log bundle indicating someone scaled up the instance manually."""
    return [
        {
            "eventTime": datetime.utcnow().isoformat() + "Z",
            "eventName": "ModifyInstanceAttribute",
            "userIdentity": {
                "type": "IAMUser",
                "principalId": "AIDAJ45Q7YFFAEXAMPLE",
                "arn": "arn:aws:iam::123456789012:user/dev-user-bob",
                "userName": "dev-user-bob"
            },
            "requestParameters": {
                "instanceType": {
                    "value": "p3.8xlarge" # Very expensive instance type
                }
            }
        },
        {
            "eventTime": datetime.utcnow().isoformat() + "Z",
            "eventName": "StartInstances",
            "userIdentity": {
                "userName": "dev-user-bob"
            }
        }
    ]

# If run directly just print some mock data
if __name__ == "__main__":
    print("Normal Vitals:", get_mock_cloudwatch_vitals("i-1234567890abcdef0"))
    print("Anomaly Vitals:", get_mock_cloudwatch_vitals("i-1234567890abcdef0", anomaly=True))
    print("CloudTrail:", json.dumps(get_mock_cloudtrail_logs(), indent=2))
