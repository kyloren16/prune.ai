import os
import json
import psycopg2
from dotenv import load_dotenv
from datetime import datetime
import sys
# Fix paths for new repository structure (Lambdas moved to terraform/src)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'terraform', 'src', 'detector')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'terraform', 'src', 'explainer')))

from mock_data import get_mock_cloudwatch_vitals, get_mock_cost_explorer_spend, get_mock_cloudtrail_logs
from detector import calculate_suspicion_score, generate_historical_baseline, save_to_timescaledb
from explainer import generate_ai_narrative, auto_remediate, publish_to_dashboard_or_email as publish_to_dashboard

load_dotenv()

def run_e2e_demo():
    print("[START] Starting Cloudscope AIOps Local Demo\n")
    print("-" * 50)
    print("STAGE 1 & 2: INGESTION & ANALYSIS (detector.py)")
    print("-" * 50)
    
    instance_id = "i-1234567890abcdef0"
    print(f"Ingesting metrics for instance: {instance_id}")
    
    # 1. Ingestion
    vitals = get_mock_cloudwatch_vitals(instance_id, anomaly=True) # Forced anomaly
    spend = get_mock_cost_explorer_spend()
    history_df = generate_historical_baseline()
    
    # 2. Analysis
    print("Running Triple-Signal Models...")
    score = calculate_suspicion_score(vitals, spend, history_df)
    print(f"Final Suspicion Score: {score}")
    
    metric_bundle = {**vitals, **spend}
    db_conn = None
    try:
        url = os.environ.get("TIMESCALEDB_URL")
        if url: db_conn = psycopg2.connect(url)
    except Exception:
        pass
        
    save_to_timescaledb(db_conn, metric_bundle, score)
    if db_conn:
         db_conn.close()

    # If score is high, trigger SNS -> Explainer
    if score >= 0.60:
        print("\n" + "-" * 50)
        print("STAGE 3 & 5: NARRATIVE & REMEDIATION (explainer.py)")
        print("-" * 50)
        print(f"\n[ALERT] Anomaly Detected (Score={score}). Triggering SNS and Explainer Lambda...")
        
        event_payload = {
            "instance_id": instance_id,
            "suspicion_score": score,
            "metrics": metric_bundle,
            "timestamp": datetime.utcnow().isoformat(),
            "role_arn": "arn:aws:iam::123456789012:role/demo"
        }
        
        # 3. Narrative
        print("Fetching CloudTrail Logs for the past 30 minutes...")
        logs = get_mock_cloudtrail_logs()
        
        print("Sending Payload + Logs to Gemini 2.5 Flash...")
        narrative_json = generate_ai_narrative(event_payload, logs)
        print("\n[AI] Roots Cause Narrative:")
        try:
             parsed = json.loads(narrative_json)
             print(json.dumps(parsed, indent=2))
        except:
             print(narrative_json)
        
        # 4. Delivery
        publish_to_dashboard(narrative_json, event_payload)
        
        # 5. Remediation
        if score >= 0.80:
             print("\n[WARNING] Score is >= 0.80! Initiating Safety Loop.")
             auto_remediate(instance_id)

    print("\n[DONE] Demo Complete.\n")

if __name__ == "__main__":
    run_e2e_demo()
