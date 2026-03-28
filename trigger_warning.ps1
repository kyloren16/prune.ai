# trigger_warning.ps1
param(
    [string]$InstanceId = "i-0abcd1234efgh5678"
)

$RoleArn = "arn:aws:iam::008533941157:role/PruneAI_CrossAccount_Role"

Write-Host "`n⚡ Triggering CloudScope AIOps WARNING Pipeline..." -ForegroundColor Yellow

$Body = @{
    role_arn = $RoleArn
    instance_id = $InstanceId
    suspicion_score = 0.72
    metrics = @{
        cpu_usage_percent = 72.5
        memory_usage_percent = 64.2
        network_in_bytes = 450000000
        hourly_spend = 2.85
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://34.201.22.230:8000/api/alert" -Method Post -Body $Body -ContentType "application/json"

Write-Host "`n✅ Warning Triggered! Suspicion Score: 0.72" -ForegroundColor Green
Write-Host "Look for the 'Resolve Now' button on your dashboard!`n"
