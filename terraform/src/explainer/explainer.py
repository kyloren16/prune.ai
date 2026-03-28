import os
import json
import boto3
import requests
import urllib.request
import urllib.error
from botocore.exceptions import ClientError
from mock_data import get_mock_cloudtrail_logs
from google import genai

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

def send_alert_email(issue_x, dep_n, dep_xyz, resolve_url, recipient_email, narrative_dict):
    """Sends a formatted email using AWS SES."""
    ses_client = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
    sender = os.environ.get('SENDER_EMAIL', 'alert@prune.ai')
    
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1a2024; padding: 40px 20px; color: #f2f0dc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #27313b; border-radius: 8px; border-top: 4px solid #43927d; box-shadow: 0 4px 15px rgba(0,0,0,0.3); overflow: hidden;">
            <div style="text-align: center; padding: 30px 20px 10px;">
                <img src="https://prune.ai/logo.png" alt="prune.ai logo" style="max-width: 140px; height: auto;">
            </div>
            <div style="padding: 20px 40px 40px;">
                <h2 style="color: #8B0000; font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #374354; padding-bottom: 15px;">
                    Urgent Action Required
                </h2>
                <p style="font-size: 16px; line-height: 1.6; color: #d8d8d8; margin: 0;">
                    <strong style="color: #f2f0dc;">{issue_x}</strong> issue has risen and is causing <strong style="color: #f2f0dc;">{dep_n}</strong> <strong style="color: #f2f0dc;">{dep_xyz}</strong> dependencies.
                </p>
                <div style="margin-top: 20px; padding: 15px; background-color: #1f272f; border-radius: 5px;">
                    <strong>AI Root Cause Analysis:</strong><br>
                    {narrative_dict.get('what', 'Anomaly detected.')}<br>
                    <em>Why: {narrative_dict.get('why', 'Unknown')}</em>
                </div>
                <div style="text-align: center; margin-top: 35px;">
                    <a href="{resolve_url}" style="background-color: #43927d; color: #f2f0dc; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: 600; font-size: 16px; display: inline-block;">Click here to resolve or view more</a>
                </div>
                <div style="margin-top: 40px; font-size: 14px; color: #8c9ba5;">
                    Best regards,<br>
                    <span style="font-weight: 600; color: #43927d;">prune.ai Team</span>
                </div>
            </div>
        </div>
    </div>
    """

    try:
        response = ses_client.send_email(
            Destination={'ToAddresses': [recipient_email]},
            Message={
                'Body': {
                    'Html': {'Charset': 'UTF-8', 'Data': html_content},
                    'Text': {'Charset': 'UTF-8', 'Data': f"Urgent: {issue_x} issue in {dep_n} {dep_xyz} dependencies.\n\nResolve: {resolve_url}"}
                },
                'Subject': {'Charset': 'UTF-8', 'Data': f"Urgent: {issue_x} Issue Detected"}
            },
            Source=sender
        )
        print(f"Email sent successfully. Message ID: {response['MessageId']}")
    except ClientError as e:
        print(f"Failed to send email: {e.response['Error']['Message']}")

def publish_to_dashboard_or_email(narrative_json, event_payload):
    """Attempts FastAPI delivery; falls back to SES email if backend is inactive."""
    try:
        narrative_dict = json.loads(narrative_json)
    except Exception:
        narrative_dict = {"raw": narrative_json}

    backend_url = os.environ.get('FASTAPI_URL', 'http://127.0.0.1:8000')
    backend_active = False

    try:
        # Check backend health silently
        req = urllib.request.Request(f"{backend_url}/docs", method='GET')
        with urllib.request.urlopen(req, timeout=3) as response:
            backend_active = response.status == 200
    except Exception:
        backend_active = False

    if backend_active:
        print("\n[FASTAPI-WEBHOOK] Pushing narrative to Dashboard internally via HTTP POST...")
        payload = {
            "role_arn": event_payload.get('role_arn', "arn:aws:iam::123456789012:role/demo"),
            "instance_id": event_payload.get('instance_id', 'unknown'),
            "suspicion_score": event_payload.get('suspicion_score', 0.0),
            "narrative": narrative_dict,
            "metrics": event_payload.get('metrics', {})
        }
        try:
            resp = requests.post(f"{backend_url}/api/alert", json=payload, timeout=3)
            if resp.status_code == 200:
                 print("[FASTAPI-WEBHOOK] Broadcast successful.")
                 return
        except Exception as e:
            print(f"[FASTAPI-WEBHOOK] Failed to reach Dashboard. error: {e}")
            
    print("Backend is inactive or failed. Switching to email notification flow.")
    
    # Extract x, n, xyz values for the email template
    x_issue = event_payload.get('issue_x', narrative_dict.get('title', 'Critical System'))
    n_count = event_payload.get('n', 'multiple')
    xyz_deps = event_payload.get('xyz', 'downstream')
    recipient_email = event_payload.get('user_email', os.environ.get('ADMIN_EMAIL', 'admin@prune.ai'))
    
    base_website_url = os.environ.get('WEBSITE_URL', 'https://prune.ai/resolve')
    incident_id = event_payload.get('instance_id', 'unknown')
    resolve_url = f"{base_website_url}?incident={incident_id}"
    
    send_alert_email(x_issue, n_count, xyz_deps, resolve_url, recipient_email, narrative_dict)

def lambda_handler(event, context):
    """AWS Lambda entry point for the Explainer (triggered by SNS)."""
    
    # 1. Parse Event from SNS format
    event_payload = event if event else {}
    if 'Records' in event and len(event['Records']) > 0 and 'Sns' in event['Records'][0]:
        try:
            event_payload = json.loads(event['Records'][0]['Sns']['Message'])
        except Exception:
            pass

    if not event_payload:
        event_payload = {
            "instance_id": "i-1234567890abcdef0",
            "suspicion_score": 0.85,
            "metrics": {"cpu": 95, "spend": 5.0}
        }
    
    instance_id = event_payload.get('instance_id')
    score = event_payload.get('suspicion_score', 0)
    print(f"[EXPLAINER] Processing anomaly for {instance_id} (Score: {score})")

    # 2. Extract Narrative with Gemini
    logs = get_mock_cloudtrail_logs()
    narrative_json = generate_ai_narrative(event_payload, logs)
    
    # 3. Delivery (Dashboard real-time or Fallback email)
    publish_to_dashboard_or_email(narrative_json, event_payload)

    # 4. Remediation
    if float(score) >= 0.80:
        auto_remediate(instance_id)

if __name__ == '__main__':
    lambda_handler({}, None)
