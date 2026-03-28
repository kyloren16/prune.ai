# trigger_anomaly.ps1
param(
    [string]$InstanceId = "i-0abcd1234efgh5678"
)

$RoleArn = "arn:aws:iam::008533941157:role/PruneAI_CrossAccount_Role"

Write-Host "`n⚡ Triggering CloudScope AIOps CRITICAL Anomaly..." -ForegroundColor Red

$Body = @{
    role_arn = $RoleArn
    instance_id = $InstanceId
    suspicion_score = 0.93
    metrics = @{
        cpu_usage_percent = 92.5
        memory_usage_percent = 88.2
        network_in_bytes = 1500000000
        hourly_spend = 12.85
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://34.201.22.230:8000/api/alert" -Method Post -Body $Body -ContentType "application/json"

Write-Host "`n✅ Anomaly Triggered! Suspicion Score: 0.93" -ForegroundColor Green
Write-Host "Look for the 'Undo Remediation' button on your dashboard!`n"
