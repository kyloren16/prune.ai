import os
import random
import psycopg2
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.ensemble import IsolationForest
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from datetime import datetime
from mock_data import get_mock_cloudwatch_vitals, get_mock_cost_explorer_spend

# Load .env variables (e.g. TIMESCALEDB_URL and GEMINI_API_KEY)
load_dotenv()

def generate_historical_baseline():
    """Generates 100 data points of normal historical baseline for the ML models to fit onto."""
    history = []
    for _ in range(100):
        history.append({
            "cpu": random.uniform(10.0, 30.0),
            "spend": random.uniform(0.40, 0.60),
            "network": random.randint(1000000, 50000000)
        })
    return pd.DataFrame(history)

def isolation_forest_score(current_cpu, history_df):
    """Uses sklearn IsolationForest to score CPU anomalies. Returns normalized score [0, 1]."""
    clf = IsolationForest(contamination=0.05, random_state=42)
    # Fit historical CPU baseline
    clf.fit(history_df[['cpu']])
    
    # Predict current CPU (-1 for anomaly, 1 for normal)
    # decision_function returns negative values for outliers
    score = clf.decision_function([[current_cpu]])[0]
    
    # If the decision_function is negative, it's flagged as an outlier
    if score < 0:
        return 0.95 # Definite anomaly detected by Isolation Forest
    return max(0.0, min(1.0, 0.1 + random.uniform(0, 0.1)))

def holt_winters_score(current_spend, history_df):
    """Uses statsmodels Holt-Winters to forecast and score spend anomalies."""
    # We use simple exponential smoothing assuming no seasonality in our mock
    model = ExponentialSmoothing(history_df['spend'], trend=None, seasonal=None, initialization_method="estimated").fit()
    forecast = model.forecast(1).iloc[0]
    
    # Calculate deviation ratio
    deviation = current_spend / forecast
    if deviation > 3.0: # e.g., Spend is 3x what was forecast
        return 0.85 
    return min(1.0, deviation * 0.1)

def z_score(current_network, history_df):
    """Calculates Z-Score manually using scipy/numpy concepts ((val - mean) / std)."""
    mean = history_df['network'].mean()
    std = history_df['network'].std()
    
    z = (current_network - mean) / (std if std > 0 else 1)
    
    if z > 3.0: # 3 standard deviations away from the historical mean
        return 0.90
    return min(1.0, abs(z) * 0.1)

def calculate_suspicion_score(vitals, spend, history_df):
    """Runs the data through the Triple-Signal models and fuses the result."""
    s1 = isolation_forest_score(vitals['cpu_usage_percent'], history_df)
    s2 = holt_winters_score(spend['hourly_spend'], history_df)
    s3 = z_score(vitals['network_in_bytes'], history_df)
    
    print(f"[ML-SIGNALS] IF(CPU): {s1:.2f} | HW(Spend): {s2:.2f} | Z(Net): {s3:.2f}")
    
    # Mathematical fusion (simple weighted average for POC)
    final_score = (s1 * 0.4) + (s2 * 0.4) + (s3 * 0.2)
    return float(round(final_score, 2))

def save_to_timescaledb(conn, metric_bundle, score):
    """Saves the bundle to the TimescaleDB if connection exists."""
    if not conn:
        print("[DB-MOCK] TimescaleDB not connected. Would have inserted:", metric_bundle, "Score:", score)
        return
    
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO metrics_history (time, instance_id, cpu_usage_percent, memory_usage_percent, network_in_bytes, hourly_spend, suspicion_score, is_anomaly)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        is_anomaly = bool(score >= 0.60)
        cursor.execute(query, (
            datetime.utcnow(),
            metric_bundle['instance_id'],
            metric_bundle['cpu_usage_percent'],
            metric_bundle['memory_usage_percent'],
            metric_bundle['network_in_bytes'],
            metric_bundle['hourly_spend'],
            score,
            is_anomaly
        ))
        conn.commit()
        cursor.close()
        print(f"[DB-SAVE] Success - metrics (Score: {score}) written to Hosted TimescaleDB.")
    except Exception as e:
        print(f"[DB-ERROR] Failed to write to DB: {e}")

def publish_to_sns(bundle):
    """Mocks sending a message to the SNS Topic."""
    print(f"\n[SNS-PUBLISH] [ALERT] Anomaly Event Published! Payload: {bundle}\n")

def lambda_handler(event, context):
    """AWS Lambda entry point for the Detector."""
    
    # Connect to TimescaleDB
    db_conn = None
    try:
        timescale_url = os.environ.get("TIMESCALEDB_URL")
        if timescale_url:
             db_conn = psycopg2.connect(timescale_url)
    except Exception as e:
        print(f"Warning: TimescaleDB Connection failed. Operating in Mock DB Mode. Error: {e}")

    # 1. Ingestion Stage
    instance_id = "i-1234567890abcdef0"
    vitals = get_mock_cloudwatch_vitals(instance_id, anomaly=True) # Forcing an anomaly for testing
    spend = get_mock_cost_explorer_spend()
    history_df = generate_historical_baseline() # Mocking the last 24h baseline query
    
    # 2. Analysis Stage
    score = calculate_suspicion_score(vitals, spend, history_df)
    print(f"[{datetime.utcnow().isoformat()}] instance: {instance_id} | Final Suspicion Score: {score}")
    
    metric_bundle = {**vitals, **spend}
    save_to_timescaledb(db_conn, metric_bundle, score)

    # Output to trigger Narrative Stage
    if score >= 0.60:
        event_payload = {
            "instance_id": instance_id,
            "suspicion_score": score,
            "metrics": metric_bundle,
            "timestamp": datetime.utcnow().isoformat()
        }
        publish_to_sns(event_payload)
        
    if db_conn:
        db_conn.close()

if __name__ == '__main__':
    # Local test execution
    lambda_handler({}, {})
