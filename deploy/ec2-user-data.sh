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

# 2. 2 GB Swap File Setup (Mitigate OOM spikes)
if [ ! -f /swapfile ]; then
  echo "Setting up 2 GB swap..."
  dd if=/dev/zero of=/swapfile bs=128M count=16 status=progress
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
fi

# 3. Encrypted Persistent EBS Mount (/mnt/data)
# Identify EBS volume using Volume ID / NVMe serial (never assume /dev/nvme1n1)
REGION="ap-south-1"
TARGET_VOL_ID=$(aws ssm get-parameter --name "/zyven/prod/DATA_VOLUME_ID" --region "$REGION" --query "Parameter.Value" --output text 2>/dev/null || echo "")
TARGET_SERIAL=""
if [ -n "$TARGET_VOL_ID" ] && [ "$TARGET_VOL_ID" != "None" ]; then
  TARGET_SERIAL=$(echo "$TARGET_VOL_ID" | tr -d '-')
  echo "Targeting specific EBS Volume ID: $TARGET_VOL_ID (Serial: $TARGET_SERIAL)"
else
  echo "No specific /zyven/prod/DATA_VOLUME_ID set; discovering attached EBS data volume by NVMe serial / mapping..."
fi

DATA_DEV=""
echo "Polling for dedicated EBS data volume to attach..."
for attempt in $(seq 1 30); do
  # Determine root block device to exclude it
  ROOT_DEV=$(lsblk -no PKNAME "$(findmnt -n -o SOURCE /)" 2>/dev/null || echo "nvme0n1")

  for sys_dev in /sys/block/nvme[0-9]*n[0-9]*; do
    [ -d "$sys_dev" ] || continue
    bname=$(basename "$sys_dev")
    # Skip root block device
    [ "$bname" = "$ROOT_DEV" ] && continue

    dev_node="/dev/$bname"
    [ -b "$dev_node" ] || continue

    # Read NVMe serial
    serial=""
    if [ -f "$sys_dev/device/serial" ]; then
      serial=$(tr -d '[:space:]' < "$sys_dev/device/serial")
    fi

    # Read ebsnvme-id if available
    ebs_vol=""
    ebs_map=""
    if [ -x /sbin/ebsnvme-id ]; then
      ebs_vol=$(/sbin/ebsnvme-id -v "$dev_node" 2>/dev/null || true)
      ebs_map=$(/sbin/ebsnvme-id -b "$dev_node" 2>/dev/null || true)
    fi

    # Check match against target Volume ID / serial if defined
    if [ -n "$TARGET_SERIAL" ]; then
      if [ "$serial" = "$TARGET_SERIAL" ] || [ "$ebs_vol" = "$TARGET_VOL_ID" ]; then
        DATA_DEV="$dev_node"
        echo "Matched EBS volume by ID/serial ($ebs_vol / $serial): $DATA_DEV"
        break 2
      fi
    else
      # Fallback: Match mapping /dev/xvdf or EBS volume serial pattern
      if [ "$ebs_map" = "/dev/xvdf" ] || [ "$ebs_map" = "xvdf" ]; then
        DATA_DEV="$dev_node"
        echo "Matched EBS volume by mapping /dev/xvdf ($dev_node): $ebs_vol"
        break 2
      elif [[ "$serial" =~ ^vol[0-9a-f]+$ ]]; then
        DATA_DEV="$dev_node"
        echo "Matched EBS volume by NVMe serial ($serial): $DATA_DEV"
        break 2
      fi
    fi
  done

  echo "Data volume not ready yet. Sleeping 2s (attempt $attempt/30)..."
  sleep 2
done

if [ -z "$DATA_DEV" ] || [ ! -b "$DATA_DEV" ]; then
  echo "FATAL: Dedicated persistent EBS volume failed to attach within 60 seconds." >&2
  echo "Halting deployment to prevent initializing database on the root volume." >&2
  exit 1
fi

echo "Detected persistent block device: $DATA_DEV"

# Filesystem verification: Verify existing filesystem is strictly XFS before mounting
FS_TYPE=$(blkid -s TYPE -o value "$DATA_DEV" || true)
if [ -z "$FS_TYPE" ]; then
  echo "No existing filesystem detected on $DATA_DEV. Formatting with XFS (label: ZYVEN_DATA)..."
  mkfs.xfs -L ZYVEN_DATA "$DATA_DEV"
elif [ "$FS_TYPE" = "xfs" ]; then
  echo "Verified existing XFS filesystem on $DATA_DEV. Preserving existing database data."
else
  echo "FATAL: Block device $DATA_DEV has unsupported filesystem type '$FS_TYPE' (expected 'xfs'). Halting deployment to prevent data corruption." >&2
  exit 1
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

# Create directory tree & sentinel verification files
mkdir -p /mnt/data/postgres /mnt/data/backups
touch /mnt/data/.zyven_ebs_mounted
touch /mnt/data/postgres/.zyven_ebs_mounted
chown -R 70:70 /mnt/data/postgres
chmod 700 /mnt/data/postgres /mnt/data/backups

# 4. Docker Service Setup with Mount Ordering Dependency
# Prevent Docker daemon from starting if /mnt/data is not mounted
mkdir -p /etc/systemd/system/docker.service.d
cat <<'EOF' > /etc/systemd/system/docker.service.d/mount.conf
[Unit]
RequiresMountsFor=/mnt/data
EOF
systemctl daemon-reload
systemctl enable --now docker
usermod -aG docker ec2-user

# Install Docker Compose Plugin v2
DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
mkdir -p "$DOCKER_CONFIG/cli-plugins"
curl -SL https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-linux-aarch64 \
  -o "$DOCKER_CONFIG/cli-plugins/docker-compose"
chmod +x "$DOCKER_CONFIG/cli-plugins/docker-compose"

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

if [ ! -f /mnt/data/.zyven_ebs_mounted ] || [ ! -f /mnt/data/postgres/.zyven_ebs_mounted ]; then
  echo "FATAL: EBS mount sentinel (/mnt/data/.zyven_ebs_mounted) is missing! Halting deployment." >&2
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
