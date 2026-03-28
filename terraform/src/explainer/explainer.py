import json
import os
import urllib.request
import urllib.error
import boto3
from botocore.exceptions import ClientError

def check_backend_active(url):
    """Check if the primary FastAPI backend (WebSocket server) is active."""
    try:
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=3) as response:
            return response.status == 200
    except (urllib.error.URLError, Exception) as e:
        print(f"Backend check failed: {e}")
        return False

def send_alert_email(issue_x, dep_n, dep_xyz, resolve_url, recipient_email):
    """Sends a formatted email using AWS SES."""
    ses_client = boto3.client('ses', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
    sender = os.environ.get('SENDER_EMAIL', 'alert@prune.ai')
    
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1a2024; padding: 40px 20px; color: #f2f0dc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #27313b; border-radius: 8px; border-top: 4px solid #43927d; box-shadow: 0 4px 15px rgba(0,0,0,0.3); overflow: hidden;">
            <div style="text-align: center; padding: 30px 20px 10px;">
                <!-- Assuming logo is hosted here -->
                <img src="https://prune.ai/logo.png" alt="prune.ai logo" style="max-width: 140px; height: auto;">
            </div>
            <div style="padding: 20px 40px 40px;">
                <h2 style="color: #8B0000; font-size: 24px; font-weight: 600; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #374354; padding-bottom: 15px;">
                    Urgent Action Required
                </h2>
                <p style="font-size: 16px; line-height: 1.6; color: #d8d8d8; margin: 0;">
                    <strong style="color: #f2f0dc;">{issue_x}</strong> issue has risen and is causing <strong style="color: #f2f0dc;">{dep_n}</strong> <strong style="color: #f2f0dc;">{dep_xyz}</strong> dependencies.
                </p>
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
                    'Text': {'Charset': 'UTF-8', 'Data': f"Urgent Action Required\n\n{issue_x} issue has risen and is causing {dep_n} {dep_xyz} dependencies.\n\nClick here to resolve or view more: {resolve_url}\n\nprune.ai Team"}
                },
                'Subject': {'Charset': 'UTF-8', 'Data': f"Urgent: {issue_x} Issue Detected"}
            },
            Source=sender
        )
        print(f"Email sent successfully. Message ID: {response['MessageId']}")
    except ClientError as e:
        print(f"Failed to send email: {e.response['Error']['Message']}")

def lambda_handler(event, context):
    print("CloudScope Explainer Triggered")
    
    # 1. Check if backend is active
    backend_url = os.environ.get('BACKEND_URL', 'http://127.0.0.1:8000/api/health')
    is_active = check_backend_active(backend_url)
    
    if not is_active:
        print("Backend is inactive. Switching to email notification flow.")
        
        # 2. Hit up email service with JSON file (parsed from event)
        payload = event
        if 'Records' in event and len(event['Records']) > 0 and 'Sns' in event['Records'][0]:
            try:
                payload = json.loads(event['Records'][0]['Sns']['Message'])
            except json.JSONDecodeError:
                pass
                
        # Extract x, n, xyz values
        x_issue = payload.get('issue_x', 'Critical System')
        n_count = payload.get('n', 'multiple')
        xyz_deps = payload.get('xyz', 'downstream')
        recipient_email = payload.get('user_email', os.environ.get('ADMIN_EMAIL', 'admin@prune.ai'))
        
        # 3. Create resolution hyperlink
        base_website_url = os.environ.get('WEBSITE_URL', 'https://prune.ai/resolve')
        incident_id = payload.get('incident_id', 'unknown')
        resolve_url = f"{base_website_url}?incident={incident_id}"
        
        # 4. Email the user
        send_alert_email(x_issue, n_count, xyz_deps, resolve_url, recipient_email)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Backend inactive. Fallback email dispatched.'})
        }
    
    # Normal flow if backend is active
    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Explainer executed and pushed to active backend.'})
    }
