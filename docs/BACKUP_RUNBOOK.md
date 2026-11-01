# ZYVEN Database Backup & Disaster Recovery Runbook

## 1. Backup Strategy Overview

1. **Local Persistent Storage**: PostgreSQL runs on an independent, encrypted `gp3` EBS volume mounted at `/mnt/data`.
2. **Nightly EBS Snapshots via AWS DLM (Data Lifecycle Manager)**:
   - Automated daily snapshots taken at 02:00 UTC.
   - Retained for 7 days (zero operational friction for instance-level disaster recovery).
3. **Off-AWS Encrypted Database Dumps (Cloudflare R2 / Backblaze B2)**:
   - Executes nightly via cron at 03:00 UTC (`deploy/backup-restore.sh`).
   - Format: PostgreSQL Custom Archive (`-Fc`).
   - Encryption: Client-side Authenticated Encryption (AES-256-GCM + Scrypt KDF via `deploy/crypto-gcm.js`).
   - Retention Policy: 7 daily + 4 weekly archives.

---

## 2. Recovery Procedure: Step-by-Step

### Step 1: Download and Decrypt the Backup
```bash
# Set parameters
ENC_FILE="zyven_backup_YYYYMMDD_HHMMSS.dump.enc"
DUMP_FILE="zyven_backup_restored.dump"

# Download from Cloudflare R2
aws s3 cp "s3://zyven-production-backups/daily/${ENC_FILE}" . --endpoint-url "https://<account-id>.r2.cloudflarestorage.com"

# Fetch key from SSM and decrypt with authenticity verification
KEY=$(aws ssm get-parameter --name "/zyven/prod/BACKUP_ENCRYPTION_KEY" --with-decryption --query "Parameter.Value" --output text --region ap-south-1)
BACKUP_ENCRYPTION_KEY="$KEY" node /opt/zyven/deploy/crypto-gcm.js decrypt "$ENC_FILE" "$DUMP_FILE"
unset KEY
```

### Step 2: Test Restore in an Isolated Throwaway Container
Always test the dump in a throwaway container before restoring to production:
```bash
# 1. Launch throwaway PostgreSQL container
docker run -d --name restore-test-db -e POSTGRES_PASSWORD=restore_test_pass postgres:16-alpine
sleep 3

# 2. Execute pg_restore
docker cp "$DUMP_FILE" restore-test-db:/tmp/restore.dump
docker exec restore-test-db pg_restore -U postgres -d postgres --clean --if-exists /tmp/restore.dump

# 3. Verify integrity
docker exec restore-test-db psql -U postgres -d postgres -c "SELECT count(*) FROM users;"
docker exec restore-test-db psql -U postgres -d postgres -c "SELECT count(*) FROM businesses;"
docker exec restore-test-db psql -U postgres -d postgres -c "SELECT count(*) FROM orders;"

# 4. Clean up test container
docker stop restore-test-db && docker rm restore-test-db
rm -f "$DUMP_FILE"
```

### Step 3: Production In-Place Database Restore
If restoring to live production database:
```bash
# 1. Stop web traffic by stopping the app container
docker compose -f /opt/zyven/docker-compose.prod.yml stop app

# 2. Restore database
docker cp "$DUMP_FILE" zyven-db:/tmp/restore.dump
docker exec zyven-db pg_restore -U zyven_app -d zyven_prod --clean --if-exists /tmp/restore.dump

# 3. Restart application
docker compose -f /opt/zyven/docker-compose.prod.yml start app
rm -f "$DUMP_FILE" "$ENC_FILE"
```
