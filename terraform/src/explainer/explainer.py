import os
import json
import boto3
import requests
from mock_data import get_mock_cloudtrail_logs
from google import genai
from google.genai import types

def generate_ai_narrative(event_payload, logs):
    """Uses Gemini 2.0 Flash to synthesize the metrics and logs into a human-readable narrative."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key":
        print("[AI-MOCK] Missing valid GEMINI_API_KEY. Using mock narrative.")
        return json.dumps({
            "title": "Unexplained Resource Upscale",
            "who": "dev-user-bob",
            "what": "Modified instance attribute to an expensive p3.8xlarge.",
            "why": "No specific Jira ticket referenced in tags. Likely a manual experimentation test."
        })

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        You are Cloudscope AIOps, a world-class AWS security and cost optimization AI.
        Analyze the following anomaly event and CloudTrail logs.
        Generate a structured JSON report explaining the Who, What, and Why of this cost spike.
        Keep it brief but technically accurate.
        
        Anomaly Event: {json.dumps(event_payload)}
        CloudTrail Logs: {json.dumps(logs)}
        
        Strictly format your response as valid JSON with keys: "title", "who", "what", "why".
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        return response.text
    except Exception as e:
         print(f"[AI-ERROR] Gemini API failed: {e}")
         return "{}"

def auto_remediate(instance_id):
    """Mock Boto3 remediation."""
    print(f"[AWS-BOTO3] [STOP] Auto-remediation triggered. Stopping instance: {instance_id}")
    # client = boto3.client('ec2')
    # client.stop_instances(InstanceIds=[instance_id])

def publish_to_dashboard(narrative_json, event_payload):
    """Mock pushing JSON to FastAPI the delivery websocket."""
    # Parse the narrative string into a dict to match AlertPayload
    try:
        narrative_dict = json.loads(narrative_json)
    except Exception:
        narrative_dict = {"raw": narrative_json}

    # Build payload to match AlertPayload BaseModel in main.py
    payload = {
        "role_arn": event_payload.get('role_arn', "arn:aws:iam::123456789012:role/demo"),
        "instance_id": event_payload.get('instance_id', 'unknown'),
        "suspicion_score": event_payload.get('suspicion_score', 0.0),
        "narrative": narrative_dict,
        "metrics": event_payload.get('metrics', {})
    }
    print("\n[FASTAPI-WEBHOOK] Pushing narrative to Dashboard internally via HTTP POST...")
    try:
        resp = requests.post("http://127.0.0.1:8000/api/alert", json=payload)
        if resp.status_code == 200:
             print("[FASTAPI-WEBHOOK] Broadcast successful.")
        else:
             print(f"[FASTAPI-WEBHOOK] Failed gracefully. Server returned {resp.status_code}.")
    except Exception as e:
        print(f"[FASTAPI-WEBHOOK] Failed to reach Dashboard. Is FastAPI running? error: {e}")

def lambda_handler(event, context):
    """AWS Lambda entry point for the Explainer (triggered by SNS)."""
    
    # In reality, event comes from SNS: event['Records'][0]['Sns']['Message']
    # If run directly as mock:
    event_payload = event if event else {
        "instance_id": "i-1234567890abcdef0",
        "suspicion_score": 0.85,
        "metrics": {"cpu": 95, "spend": 5.0}
    }
    
    instance_id = event_payload.get('instance_id')
    score = event_payload.get('suspicion_score', 0)
    print(f"[EXPLAINER] Processing anomaly for {instance_id} (Score: {score})")

    # 3. Narrative Stage
    # Perform CloudTrail lookup
    logs = get_mock_cloudtrail_logs()
    
    # Pass structured bundle to Gemini 2.0 Flash
    narrative_json = generate_ai_narrative(event_payload, logs)
    
    # 4. Delivery Stage
    publish_to_dashboard(narrative_json, event_payload)

    # 5. Remediation Stage block
    if score >= 0.80:
        auto_remediate(instance_id)

if __name__ == '__main__':
    # Local test execution
    lambda_handler(None, None)
