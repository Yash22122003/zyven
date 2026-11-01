# ZYVEN Operations, Rollback & Monitoring Runbook

## 1. Zero-Downtime Rollout & Rollback Procedures

### Standard Rollout Procedure:
1. Update image tags or digests in AWS SSM:
   ```bash
   aws ssm put-parameter --name "/zyven/prod/APP_TAG" --value "app-<newsha>" --type String --overwrite --region ap-south-1
   aws ssm put-parameter --name "/zyven/prod/MIGRATOR_TAG" --value "migrator-<newsha>" --type String --overwrite --region ap-south-1
   ```
2. Trigger deployment on EC2 via SSM Run Command or Session:
   ```bash
   /usr/local/bin/zyven-deploy
   ```

### Immediate Rollback Procedure:
If a regression or defect is identified:
1. Identify the previous release digest / tag:
   - **Current Release**: `app-58d2dff` (`sha256:3b825d0bf735653babb672a7427d1790de7ac706c5413cf4402afeeeeb6b96b4`)
   - **Previous Release**: `latest` (`sha256:1ac5878feb27a73706646604d1177b01718842e2afcc1024780f4a111379b110`)
2. Update Parameter Store with the previous digest:
   ```bash
   aws ssm put-parameter --name "/zyven/prod/APP_TAG" --value "sha256:1ac5878feb27a73706646604d1177b01718842e2afcc1024780f4a111379b110" --type String --overwrite --region ap-south-1
   ```
3. Re-run deploy script:
   ```bash
   /usr/local/bin/zyven-deploy
   ```

---

## 2. CloudWatch Alarms & Alerting (All Within Free Tier)

### 1. T4g CPU Credit Balance Exhaustion Alarm
Alerts if CPU credits drop below 20 (indicating the burstable instance is under heavy sustained load):
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "zyven-prod-cpu-credits-low" \
  --metric-name "CPUCreditBalance" \
  --namespace "AWS/EC2" \
  --statistic Minimum \
  --period 300 \
  --threshold 20 \
  --comparison-operator LessThanOrEqualToThreshold \
  --dimensions Name=InstanceId,Value=<instance-id> \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn> \
  --region ap-south-1
```

### 2. EC2 Status Check Failed Alarm
Alerts immediately if the instance fails either system or instance hardware checks:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "zyven-prod-instance-status-check" \
  --metric-name "StatusCheckFailed" \
  --namespace "AWS/EC2" \
  --statistic Maximum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=InstanceId,Value=<instance-id> \
  --evaluation-periods 2 \
  --alarm-actions <sns-topic-arn> \
  --region ap-south-1
```

### 3. AWS Billing / Credit Depletion Alarms
Configure alarms below the existing $10 alert to catch incremental spending:
- Alert 1: **$3.00** estimated monthly charge
- Alert 2: **$7.00** estimated monthly charge
- Alert 3: **$10.00** existing threshold
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "zyven-billing-3usd" \
  --metric-name "EstimatedCharges" \
  --namespace "AWS/Billing" \
  --statistic Maximum \
  --period 21600 \
  --threshold 3.0 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=Currency,Value=USD \
  --evaluation-periods 1 \
  --alarm-actions <sns-topic-arn> \
  --region us-east-1 # Billing metrics are hosted in us-east-1
```
