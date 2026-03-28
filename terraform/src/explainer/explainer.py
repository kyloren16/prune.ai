import json
import boto3
import os
import urllib.request
import re

# Gemini API Config
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEN_AI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

def generate_ai_narrative(event):
    """Uses Gemini 2.0 Flash to generate a Root Cause Analysis narrative."""
    prompt = f"""
    Analyze this AIOps event and provide a JSON response with 'who', 'what', 'why', and 'action' fields.
    Event: {json.dumps(event)}
    
    Context: CPU usage is at {event.get('metrics', {}).get('cpu_usage_percent')}% and Suspicion Score is {event.get('suspicion_score')}.
    Industry: Cloud Infrastructure / EC2 Reliability.
    
    Format example:
    {{
      "who": "Compute Optimizer / CloudWatch",
      "what": "Sudden CPU spike detected on instance {event.get('instance_id')}",
      "why": "Potential resource exhaustion or noisy neighbor effect.",
      "action": "Investigating logs..."
    }}
    """
    
    payload = {{
        "contents": [{{
            "parts": [{{
                "text": prompt
            }}]
        }}]
    }}
    
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(GEN_AI_ENDPOINT, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            text_response = result['candidates'][0]['content']['parts'][0]['text']
            # Extract JSON from markdown if Gemini wraps it
            json_match = re.search(r'\{.*\}', text_response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            return json.loads(text_response)
    except Exception as e:
        print(f"[AI-ERROR] Gemini failed: {e}")
        return {
            "who": "PruneAI Engine",
            "what": "Critical Anomaly Detected",
            "why": "Metrics exceeded baseline thresholds.",
            "action": "Manual resolution suggested."
        }

def send_alert_email(narrative, event):
    """Sends a formatted email via SES (Simplified for Demo)."""
    # Placeholder for SES logic if needed later
    print(f"[SES] Alert sent for {event.get('instance_id')}")

def publish_to_dashboard(payload):
    """Pushes the anomaly report to the FastAPI backend gateway."""
    url = os.environ.get("BACKEND_URL", "http://34.201.22.230:8000/api/alert")
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f"[BACKEND-SYNC] Success: {response.status}")
    except Exception as e:
        print(f"[BACKEND-SYNC] Failed: {e}")

def _get_assumed_role_session(role_arn):
    """Assumes the user's AWS IAM Role to perform actions in their account."""
    sts_client = boto3.client('sts')
    try:
        assumed_role = sts_client.assume_role(
            RoleArn=role_arn,
            RoleSessionName="PruneAI_Remediation"
        )
        tokens = assumed_role['Credentials']
        return boto3.Session(
            aws_access_key_id=tokens['AccessKeyId'],
            aws_secret_access_key=tokens['SecretAccessKey'],
            aws_session_token=tokens['SessionToken'],
            region_name=os.environ.get('AWS_REGION', 'us-east-1')
        )
    except Exception as e:
        print(f"[STS-ERROR] Failed to assume role {role_arn}: {e}")
        return None

def lambda_handler(event, context):
    # 1. Parse SNS
    event_payload = {}
    if 'Records' in event:
        msg = event['Records'][0]['Sns']['Message']
        event_payload = json.loads(msg)
    else:
        event_payload = event if event else {"instance_id": "test", "suspicion_score": 0.9}

    instance_id = event_payload.get("instance_id")
    role_arn = event_payload.get("role_arn", "arn:aws:iam::008533941157:role/PruneAI_CrossAccount_Role")
    score_val = float(event_payload.get("suspicion_score", 0))

    print(f"[EXPLAINER] Analyzing Event for {instance_id}")
    
    # 2. Narrative Generation (Live Gemini)
    narrative = generate_ai_narrative(event_payload)
    
    # 3. Real-Time Remediation (Stop Instance if score >= 0.8)
    if score_val >= 0.8 and instance_id != "test" and not instance_id.startswith("i-0abcd"):
        try:
            print(f"[REMEDIATION] Attempting to stop instance {instance_id} in account...")
            session = _get_assumed_role_session(role_arn)
            if session:
                ec2 = session.client('ec2')
                ec2.stop_instances(InstanceIds=[instance_id])
                print(f"[REMEDIATION] Successfully stopped {instance_id}")
                narrative["action"] = "Auto-Remediation Executed (Resources Stopped)"
            else:
                narrative["action"] = "Auto-Remediation Failed (Assumption Error)"
        except Exception as e:
            print(f"[REMEDIATION] Failed to stop instance: {e}")
            narrative["action"] = f"Auto-Remediation Failed: {str(e)}"
    elif score_val >= 0.8:
        narrative["action"] = "Auto-Remediation Executed (Mock Instance)"
    elif score_val >= 0.6:
        narrative["action"] = "Awaiting Manual Resolution"

    # 4. SES Email Logic
    send_alert_email(narrative, event_payload)
    
    # 5. Dashboard Push
    full_payload = {
        **event_payload,
        "narrative": narrative,
        "role_arn": role_arn
    }
    publish_to_dashboard(full_payload)
    
    return {"statusCode": 200}
