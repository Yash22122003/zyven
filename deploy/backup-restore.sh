#!/bin/bash
# ==============================================================================
# ZYVEN Automated Backup & Off-AWS Replication Script
# ==============================================================================
set -euo pipefail

BACKUP_DIR="/mnt/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="${BACKUP_DIR}/zyven_backup_${TIMESTAMP}.dump"
ENC_FILE="${DUMP_FILE}.enc"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "=== Starting ZYVEN Database Backup at $(date -u) ==="

# 1. Execute pg_dump from within PostgreSQL container in custom format
docker exec -t zyven-db pg_dump -U zyven_app -Fc zyven_prod > "$DUMP_FILE"

# Verify dump file was created and is non-empty
if [ ! -s "$DUMP_FILE" ]; then
  echo "FATAL: Database dump failed or produced an empty file." >&2
  exit 1
fi

# 2. Authenticated Client-Side Encryption using AES-256-GCM
BACKUP_ENCRYPTION_KEY=$(aws ssm get-parameter --name "/zyven/prod/BACKUP_ENCRYPTION_KEY" --with-decryption --query "Parameter.Value" --output text --region ap-south-1)

export BACKUP_ENCRYPTION_KEY
node /opt/zyven/deploy/crypto-gcm.js encrypt "$DUMP_FILE" "$ENC_FILE"
unset BACKUP_ENCRYPTION_KEY

if [ ! -s "$ENC_FILE" ]; then
  echo "FATAL: Encryption failed or produced an empty artifact." >&2
  exit 1
fi

rm -f "$DUMP_FILE"

# 3. Off-AWS Replication (Cloudflare R2 / Backblaze B2 via AWS CLI S3 endpoint)
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
BUCKET_NAME="zyven-production-backups"

# Upload encrypted artifact
S3_ACCESS_KEY=$(aws ssm get-parameter --name "/zyven/prod/BACKUP_S3_ACCESS_KEY" --with-decryption --query "Parameter.Value" --output text --region ap-south-1)
S3_SECRET_KEY=$(aws ssm get-parameter --name "/zyven/prod/BACKUP_S3_SECRET_KEY" --with-decryption --query "Parameter.Value" --output text --region ap-south-1)

AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
  aws s3 cp "$ENC_FILE" "s3://${BUCKET_NAME}/daily/$(basename "$ENC_FILE")" --endpoint-url "$R2_ENDPOINT"

# Verify remote upload integrity
AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
  aws s3 ls "s3://${BUCKET_NAME}/daily/$(basename "$ENC_FILE")" --endpoint-url "$R2_ENDPOINT" > /dev/null || {
    echo "FATAL: Remote backup verification failed! Object not found in S3 bucket." >&2
    exit 1
  }

unset S3_ACCESS_KEY S3_SECRET_KEY
echo "Backup uploaded and verified successfully: $(basename "$ENC_FILE")"

# 4. Local Retention: Retain 7 daily snapshots on disk
find "$BACKUP_DIR" -type f -name "*.enc" -mtime +7 -delete

echo "=== Backup Process Completed Successfully ==="
