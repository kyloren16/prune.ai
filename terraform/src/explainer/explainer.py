import os
import json
import boto3
import urllib.request
from botocore.exceptions import ClientError
from datetime import datetime

def generate_ai_narrative(event_payload):
    """Uses Gemini 2.5 Flash via REST API (Zero-Dependency) to generate analysis."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_key_here":
         print("[AI-MOCK] Missing valid GEMINI_API_KEY. Using mock narrative fallback.")
         return {
             "title": "Unusual Cluster Resource Spike",
             "who": "Engineering Account: 008533941157",
             "what": f"Instance {event_payload.get('instance_id')} exceeded CPU baseline by {event_payload.get('metrics', {}).get('cpu_usage_percent', 0):.1f}%.",
             "why": "Anomaly detected in cost-vitals correlation. Triple-Signal Model flagged Isolation Forest outlier.",
             "action": "Analysis Complete. Awaiting resolution decision."
         }

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        prompt = f"""
        You are CloudScope AIOps, a world-class AWS security and cost optimization AI.
        Analyze the following anomaly event. 
        Generate a structured JSON report explaining the Who, What, and Why of this cost spike.
        Keep it brief but technically accurate.
        
        Anomaly Event: {json.dumps(event_payload)}
        
        Strictly format your response as valid JSON with keys: "title", "who", "what", "why", "action".
        For "action", state: "Analysis Complete. Awaiting operator resolution based on score."
        """
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            # Extract text from Gemini response
            if 'candidates' in result and len(result['candidates']) > 0:
                text = result['candidates'][0]['content']['parts'][0]['text']
                # Clean up markdown code block if present
                if text.startswith('```json'):
                    text = text.replace('```json', '').replace('```', '')
                elif text.startswith('```'):
                    text = text.replace('```', '')
                    
                return json.loads(text.strip())
                
    except Exception as e:
         print(f"[AI-ERROR] Gemini API failed: {e}")
         
    return {
        "title": "Anomaly Analysis Failed",
        "who": "Unknown",
        "what": "Internal error occurred during AI narrative generation.",
        "why": "API Timeout or Parsing Failure.",
        "action": "Manual investigation required."
    }

def send_alert_email(narrative_dict, event_payload):
    """Sends a formatted email using AWS SES."""
    ses_client = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
    
    # In SES sandbox, Sender and Recipient must be verified. 
    # For hackathons, it's best to set both to a verified email via env vars.
    sender = os.environ.get('SENDER_EMAIL', 'alert@prune.ai')
    recipient = os.environ.get('ADMIN_EMAIL', sender) # Default to self-send
    
    score = event_payload.get('suspicion_score', 0)
    instance_id = event_payload.get('instance_id', 'unknown')
    
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px;">
        <h2 style="color: #43927d;">CloudScope AIOps Alert (Score: {score})</h2>
        <div style="padding: 15px; background-color: #f8f9fa; border-radius: 5px; border-left: 4px solid #e11d48;">
            <strong>AI Root Cause Analysis:</strong><br><br>
            <strong>What:</strong> {narrative_dict.get('what', 'Anomaly detected.')}<br>
            <strong>Why:</strong> {narrative_dict.get('why', 'Unknown')}<br>
            <strong>Who:</strong> {narrative_dict.get('who', 'Unknown')}<br>
        </div>
        <p>Instance ID: {instance_id}</p>
        <p>Please check the Vercel dashboard to resolve this anomaly.</p>
    </div>
    """

    try:
        response = ses_client.send_email(
            Destination={'ToAddresses': [recipient]},
            Message={
                'Body': {
                    'Html': {'Charset': 'UTF-8', 'Data': html_content},
                    'Text': {'Charset': 'UTF-8', 'Data': f"Alert Score {score}: {narrative_dict.get('why')}"}
                },
                'Subject': {'Charset': 'UTF-8', 'Data': f"CloudScope Alert - {narrative_dict.get('title', 'Anomaly Detected')}"}
            },
            Source=sender
        )
        print(f"[SES] Email sent successfully. Message ID: {response['MessageId']}")
    except ClientError as e:
        print(f"[SES] Failed to send email (Check Sandbox verification?): {e.response['Error']['Message']}")
    except Exception as e:
        print(f"[SES] Email Disabled or Error: {e}")

def publish_to_dashboard(payload):
    url = os.environ.get('FASTAPI_URL', 'http://127.0.0.1:8000')
    if not url.endswith('/api/alert'):
        url = f"{url}/api/alert"
        
    print(f"[BACKEND-SYNC] Pushing to {url}...")
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f"[BACKEND-SYNC] Success: {response.status}")
    except Exception as e:
        print(f"[BACKEND-SYNC] Failed: {e}")

def lambda_handler(event, context):
    # 1. Parse SNS
    event_payload = {}
    if 'Records' in event:
        msg = event['Records'][0]['Sns']['Message']
        event_payload = json.loads(msg)
    else:
        event_payload = event if event else {"instance_id": "test", "suspicion_score": 0.9}

    print(f"[EXPLAINER] Analyzing Event: {event_payload.get('instance_id')}")
    
    # 2. Narrative Generation (Live Gemini)
    narrative = generate_ai_narrative(event_payload)
    
    # 3. SES Email Logic
    send_alert_email(narrative, event_payload)
    
    # 4. Dashboard Push
    # Unifying the format so the dashboard receives it beautifully
    score_val = float(event_payload.get("suspicion_score", 0))
    if score_val >= 0.8:
         narrative["action"] = "Auto-Remediation Executed (Resources Stopped)"
    elif score_val >= 0.6:
         narrative["action"] = "Awaiting Manual Resolution"
         
    full_payload = {
        **event_payload,
        "narrative": narrative,
        "role_arn": event_payload.get("role_arn", "arn:aws:iam::008533941157:role/PruneAI_CrossAccount_Role")
    }
    publish_to_dashboard(full_payload)
    
    return {"statusCode": 200}

if __name__ == '__main__':
    lambda_handler({}, None)
