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
# Waiting for attached data volume (e.g. /dev/xvdf or /dev/nvme1n1)
DATA_DEV="/dev/nvme1n1"
if [ ! -b "$DATA_DEV" ]; then
  DATA_DEV="/dev/xvdf"
fi

if [ -b "$DATA_DEV" ]; then
  echo "Mounting dedicated persistent EBS volume: $DATA_DEV"
  if ! blkid "$DATA_DEV" > /dev/null; then
    echo "Formatting $DATA_DEV with XFS..."
    mkfs.xfs "$DATA_DEV"
  fi
  mkdir -p /mnt/data
  UUID=$(blkid -s UUID -o value "$DATA_DEV")
  if ! grep -q "$UUID" /etc/fstab; then
    echo "UUID=$UUID /mnt/data xfs defaults,noatime 0 2" >> /etc/fstab
  fi
  mount -a
  mkdir -p /mnt/data/postgres
  chown -R 70:70 /mnt/data/postgres
  chmod 700 /mnt/data/postgres
else
  echo "Warning: Dedicated EBS device not found. Creating local directory /mnt/data"
  mkdir -p /mnt/data/postgres
  chown -R 70:70 /mnt/data/postgres
  chmod 700 /mnt/data/postgres
fi

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
