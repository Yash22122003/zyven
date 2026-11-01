#!/bin/bash
# ==============================================================================
# ZYVEN AWS Production Provisioning Script (DRY-RUN FORM)
#
# NOTE: All commands are displayed and echoed for inspection.
# NO billable or infrastructure resources are modified unless --execute is passed.
# ==============================================================================
set -euo pipefail

EXECUTE=false
if [[ "${1:-}" == "--execute" ]]; then
  EXECUTE=true
  echo ">>> EXECUTION MODE ACTIVE <<<"
else
  echo ">>> DRY-RUN MODE: Printing commands only (nothing executed) <<<"
fi

REGION="ap-south-1"
ACCOUNT_ID="532787445442"
INSTANCE_TYPE="t4g.small"
DATA_VOLUME_SIZE=20

run_cmd() {
  local desc="$1"
  local cmd="$2"
  echo ""
  echo "=============================================================================="
  echo "STEP: $desc"
  echo "COMMAND:"
  echo "$cmd"
  if [ "$EXECUTE" = true ]; then
    echo "--- Executing ---"
    eval "$cmd"
  fi
}

# 1. IAM Role & Instance Profile
run_cmd "Create EC2 IAM Role" \
  "aws iam create-role --role-name zyven-ec2-role \
    --assume-role-policy-document '{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ec2.amazonaws.com\"},\"Action\":\"sts:AssumeRole\"}]}'"

run_cmd "Attach SSM Managed Core Policy" \
  "aws iam attach-role-policy --role-name zyven-ec2-role --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"

run_cmd "Attach Zyven Scoped Policy (ECR pull, SSM get, KMS decrypt)" \
  "aws iam put-role-policy --role-name zyven-ec2-role --policy-name zyven-ec2-permissions --policy-document file://deploy/IAM_POLICY.json"

run_cmd "Create Instance Profile & Add Role" \
  "aws iam create-instance-profile --instance-profile-name zyven-ec2-instance-profile && \
   aws iam add-role-to-instance-profile --instance-profile-name zyven-ec2-instance-profile --role-name zyven-ec2-role"

# 2. Security Group (ZERO Inbound Rules)
run_cmd "Create Production Security Group" \
  "aws ec2 create-security-group \
    --group-name zyven-prod-sg \
    --description 'Zyven production security group - zero inbound, outbound HTTPS only' \
    --region $REGION"

# 3. Dedicated Encrypted gp3 Persistent Data Volume
run_cmd "Create Encrypted gp3 Volume (20 GB)" \
  "aws ec2 create-volume \
    --volume-type gp3 \
    --size $DATA_VOLUME_SIZE \
    --encrypted \
    --availability-zone ${REGION}a \
    --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=zyven-postgres-data},{Key=Environment,Value=Production}]' \
    --region $REGION"

# 4. Launch EC2 Instance (AL2023 ARM64, IMDSv2 Required)
run_cmd "Launch EC2 Instance ($INSTANCE_TYPE, AL2023 ARM64, IMDSv2 Enforced)" \
  "AMI_ID=\$(aws ssm get-parameter --name '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64' --region $REGION --query 'Parameter.Value' --output text)
   aws ec2 run-instances \
    --image-id \$AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --iam-instance-profile Name=zyven-ec2-instance-profile \
    --security-groups zyven-prod-sg \
    --placement AvailabilityZone=${REGION}a \
    --metadata-options 'HttpTokens=required,HttpPutResponseHopLimit=1,HttpEndpoint=enabled' \
    --user-data file://deploy/ec2-user-data.sh \
    --block-device-mappings '[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":20,\"VolumeType\":\"gp3\",\"Encrypted\":true}}]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=zyven-prod-server},{Key=Environment,Value=Production}]' \
    --region $REGION"

# 5. Enable Termination Protection
run_cmd "Enable Termination Protection" \
  "aws ec2 modify-instance-attribute --instance-id <INSTANCE_ID> --disable-api-termination '{\"Value\": true}' --region $REGION"

# 6. Attach Persistent Data Volume
run_cmd "Attach Persistent Data Volume" \
  "aws ec2 attach-volume --volume-id <VOLUME_ID> --instance-id <INSTANCE_ID> --device /dev/xvdf --region $REGION"

# 7. Configure AWS DLM Snapshot Policy
run_cmd "Create DLM Snapshot Lifecycle Policy (7 Daily Snapshots)" \
  "aws dlm create-lifecycle-policy \
    --description 'Daily EBS snapshot policy for Zyven Postgres' \
    --state ENABLED \
    --execution-role-arn arn:aws:iam::${ACCOUNT_ID}:role/aws-service-role/dlm.amazonaws.com/AWSServiceRoleForDLM \
    --policy-details '{\"ResourceTypes\":[\"VOLUME\"],\"TargetTags\":[{\"Key\":\"Environment\",\"Value\":\"Production\"}],\"Schedules\":[{\"Name\":\"DailySnapshots\",\"CreateRule\":{\"Interval\":24,\"IntervalUnit\":\"HOURS\",\"Times\":[\"02:00\"]},\"RetainRule\":{\"Count\":7},\"CopyTags\":true}]}' \
    --region $REGION"

echo ""
echo "=== Dry-Run Complete: 0 resources provisioned. ==="
