from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from datetime import datetime

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import aws_client
import os
import psycopg2
from dotenv import load_dotenv

# Load production .env
load_dotenv()

# Database Connection Helper
def get_db_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST"),
        port=os.environ.get("DB_PORT", 5432),
        user=os.environ.get("DB_USER"),
        password=os.environ.get("DB_PASSWORD"),
        database=os.environ.get("DB_NAME", "postgres")
    )

app = FastAPI(title="CloudScope AIOps Delivery Layer")

# Enable CORS for the React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        # We now map connections by role_arn so we can direct alerts properly
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, role_arn: str):
        await websocket.accept()
        if role_arn not in self.active_connections:
            self.active_connections[role_arn] = []
        self.active_connections[role_arn].append(websocket)

    def disconnect(self, websocket: WebSocket, role_arn: str):
        if role_arn in self.active_connections and websocket in self.active_connections[role_arn]:
            self.active_connections[role_arn].remove(websocket)

    async def broadcast_alert(self, role_arn: str, message: dict):
        if role_arn in self.active_connections:
            for connection in self.active_connections[role_arn]:
                try:
                    await connection.send_json(message)
                except:
                    pass

manager = ConnectionManager()

# --- Models ---
class AuthPayload(BaseModel):
    role_arn: str

class AlertPayload(BaseModel):
    role_arn: str
    instance_id: str
    suspicion_score: float
    narrative: dict
    metrics: dict

class RollbackPayload(BaseModel):
    role_arn: str
    instance_id: str

# --- HTTP Routes ---

@app.post("/api/auth/aws")
async def register_aws_account(payload: AuthPayload):
    """Authenticates the Front-End against an AWS Cross-Account Role."""
    
    # MAGIC DEMO STRING FOR HACKATHON
    if payload.role_arn in ["arn:aws:iam::008533941157:role/CloudScope-Demo", "arn:aws:iam::008533941157:role/PruneAI_CrossAccount_Role"]:
        return {
            "status": "authenticated",
            "account_id": "008533941157 (DEMO)",
            "token": payload.role_arn
        }

    result = aws_client.verify_role_arn(payload.role_arn)
    if result.get("status") == "error":
        # In a real setup, we would actually validate this. For mock demo, if STS fails due to local env, we return it as a success for testing.
        if "No credentials" in result.get("message", ""):
            # Auto-mock success for UI sandbox
            return {
                "status": "authenticated",
                "account_id": "MOCK_LOCAL_ENV_ID",
                "token": payload.role_arn
            }
        raise HTTPException(status_code=401, detail=f"Invalid AWS Role Assumption: {result['message']}")
    
    return {
        "status": "authenticated",
        "account_id": result["account"],
        "token": payload.role_arn
    }

@app.post("/api/alert")
async def receive_explainer_alert(alert: AlertPayload):
    """Hidden endpoint called by the Explainer Lambda to push Gemini Narrative to a specific user."""
    # 1. Persist to TimescaleDB
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO metrics_history (
                time, instance_id, cpu_usage_percent, memory_usage_percent, 
                network_in_bytes, hourly_spend, suspicion_score, is_anomaly, role_arn
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                datetime.utcnow(),
                alert.instance_id,
                alert.metrics.get("cpu_usage_percent"),
                alert.metrics.get("memory_usage_percent"),
                alert.metrics.get("network_in_bytes"),
                alert.metrics.get("hourly_spend"),
                alert.suspicion_score,
                alert.suspicion_score >= 0.6,
                alert.role_arn
            )
        )
        conn.commit()
        cur.close()
        conn.close()
        print(f"[DB-SYNC] Persisted alert for {alert.instance_id}")
    except Exception as e:
        print(f"[DB-ERROR] Failed to persist alert: {e}")

    # 2. Broadcast to Dashboard
    await manager.broadcast_alert(alert.role_arn, alert.model_dump())
    return {"status": "alert_broadcast_and_persisted", "delivered_to": alert.role_arn}

@app.post("/api/rollback")
async def trigger_rollback(payload: RollbackPayload):
    """Triggered when user clicks 'Undo' on React dashboard."""
    restart_resp = aws_client.restart_instance(payload.instance_id, payload.role_arn)
    snooze_resp = aws_client.add_to_snooze_registry(payload.instance_id)

    return {
        "rollback_status": "executed",
        "restart": restart_resp,
        "snooze": snooze_resp
    }

@app.get("/api/history")
async def get_anomaly_history(role_arn: str):
    """Fetches the last 10 anomaly records from TimescaleDB scoped to a specific Role ARN."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT time, instance_id, cpu_usage_percent, memory_usage_percent, suspicion_score, is_anomaly FROM metrics_history WHERE role_arn = %s ORDER BY time DESC LIMIT 10",
            (role_arn,)
        )
        rows = cur.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "time": row[0].isoformat() if row[0] else None,
                "instance_id": row[1],
                "cpu": row[2],
                "mem": row[3],
                "score": row[4],
                "is_anomaly": row[5]
            })
        
        cur.close()
        conn.close()
        return history
    except Exception as e:
        print(f"[DB-ERROR] History Fetch Failed: {e}")
        return []

# --- WebSockets ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = "default_session"):
    """
    Endpoint for React Dashboard to connect and receive real-time alerts.
    The frontend query param 'token' passes the authenticated user's Role ARN.
    """
    role_arn = token
    await manager.connect(websocket, role_arn)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, role_arn)
