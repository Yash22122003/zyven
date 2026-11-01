#!/bin/bash
# ==============================================================================
# ZYVEN Production EC2 Bootstrap User Data (Amazon Linux 2023 ARM64)
# ==============================================================================
set -euo pipefail

exec > >(tee -a /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "=== Starting ZYVEN EC2 Provisioning at $(date -u) ==="

# 1. System Updates & Dependencies
dnf update -y
dnf install -y docker git aws-cli jq dnf-automatic

# Enable automatic security updates
systemctl enable --now dnf-automatic.timer

# 2. Docker Service Setup
systemctl enable --now docker
usermod -aG docker ec2-user

# Install Docker Compose Plugin v2
DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
mkdir -p "$DOCKER_CONFIG/cli-plugins"
curl -SL https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-linux-aarch64 \
  -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

# 3. 2 GB Swap File Setup (Mitigate OOM spikes)
if [ ! -f /swapfile ]; then
  echo "Setting up 2 GB swap..."
  dd if=/dev/zero of=/swapfile bs=128M count=16 status=progress
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
fi

# 4. Encrypted Persistent EBS Mount (/mnt/data)
# Poll and wait up to 60 seconds for the dedicated EBS data volume to attach
DATA_DEV=""
echo "Waiting for dedicated EBS data volume to attach..."
for i in $(seq 1 30); do
  if [ -b "/dev/nvme1n1" ]; then
    DATA_DEV="/dev/nvme1n1"
    break
  elif [ -b "/dev/xvdf" ]; then
    DATA_DEV="/dev/xvdf"
    break
  fi
  echo "Data volume not attached yet. Sleeping 2s (attempt $i/30)..."
  sleep 2
done

if [ -z "$DATA_DEV" ] || [ ! -b "$DATA_DEV" ]; then
  echo "FATAL: Dedicated persistent EBS volume failed to attach within 60 seconds." >&2
  echo "Halting deployment to prevent initializing database on the root volume." >&2
  exit 1
fi

echo "Detected persistent block device: $DATA_DEV"
# Never format an existing filesystem: format ONLY if blkid detects no filesystem header
if ! blkid "$DATA_DEV" > /dev/null 2>&1; then
  echo "No existing filesystem detected on $DATA_DEV. Formatting with XFS..."
  mkfs.xfs -L ZYVEN_DATA "$DATA_DEV"
else
  echo "Existing filesystem detected on $DATA_DEV. Preserving existing database data."
fi

mkdir -p /mnt/data
UUID=$(blkid -s UUID -o value "$DATA_DEV")
if [ -z "$UUID" ]; then
  echo "FATAL: Failed to retrieve UUID for $DATA_DEV" >&2
  exit 1
fi

if ! grep -q "$UUID" /etc/fstab; then
  echo "UUID=$UUID /mnt/data xfs defaults,noatime,nofail 0 2" >> /etc/fstab
fi

mountpoint -q /mnt/data || mount /mnt/data

if ! mountpoint -q /mnt/data; then
  echo "FATAL: /mnt/data failed to mount. Halting deployment." >&2
  exit 1
fi

mkdir -p /mnt/data/postgres /mnt/data/backups
chown -R 70:70 /mnt/data/postgres
chmod 700 /mnt/data/postgres /mnt/data/backups

# 5. Root-Only In-Memory Env Vault (/run/zyven on tmpfs)
mkdir -p /run/zyven
mount -t tmpfs -o size=16m,mode=700,noexec,nosuid,nodev tmpfs /run/zyven

# 6. Fetch Secrets from SSM Parameter Store & Launch Stack
cat <<'EOF' > /usr/local/bin/zyven-deploy
#!/bin/bash
set -euo pipefail

REGION="ap-south-1"
PARAM_PATH="/zyven/prod"
ENV_FILE="/run/zyven/.env"

echo "Verifying persistent storage mount..."
if ! mountpoint -q /mnt/data; then
  echo "FATAL: /mnt/data is not mounted! Refusing to start PostgreSQL to protect against root disk pollution." >&2
  exit 1
fi

echo "Fetching SSM parameters from ${PARAM_PATH}..."
umask 077
truncate -s 0 "$ENV_FILE"

PARAMETERS=$(aws ssm get-parameters-by-path \
  --path "$PARAM_PATH" \
  --with-decryption \
  --region "$REGION" \
  --query "Parameters[*].[Name,Value]" \
  --output text)

while IFS=$'\t' read -r name value; do
  var_name=$(basename "$name")
  echo "${var_name}=${value}" >> "$ENV_FILE"
  if [ "$var_name" = "CLOUDFLARE_TUNNEL_TOKEN" ]; then
    printf "%s" "$value" > /run/zyven/tunnel.token
    chmod 600 /run/zyven/tunnel.token
  fi
done <<< "$PARAMETERS"

# Log into ECR
REGISTRY="532787445442.dkr.ecr.ap-south-1.amazonaws.com"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

cd /opt/zyven
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml pull
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d --remove-orphans
echo "ZYVEN stack deployed successfully."
EOF
chmod 700 /usr/local/bin/zyven-deploy

mkdir -p /opt/zyven
echo "=== ZYVEN EC2 Bootstrap Completed at $(date -u) ==="
