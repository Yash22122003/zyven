# AWS Systems Manager Parameter Store Layout

All parameters are stored under the `/zyven/prod/` hierarchy using `SecureString` (KMS-encrypted with default `alias/aws/ssm` or customer managed key).

> [!CRITICAL]
> Under no circumstances should real secret values be committed to Git. The administrator enters these values via the AWS Console or AWS CLI.

## Production Parameter Inventory

| Parameter Name | Type | Description |
| :--- | :--- | :--- |
| `/zyven/prod/DATABASE_URL` | `SecureString` | PostgreSQL connection string: `postgresql://zyven_app:<password>@db:5432/zyven_prod` |
| `/zyven/prod/POSTGRES_USER` | `SecureString` | PostgreSQL application user (e.g. `zyven_app`) |
| `/zyven/prod/POSTGRES_PASSWORD` | `SecureString` | High-entropy random database password (32+ chars) |
| `/zyven/prod/POSTGRES_DB` | `String` | PostgreSQL database name (`zyven_prod`) |
| `/zyven/prod/JWT_SECRET` | `SecureString` | Cryptographically random 64-char string for session signing |
| `/zyven/prod/RAZORPAY_KEY_ID` | `SecureString` | Razorpay API Key ID (`rzp_test_...` or `rzp_live_...`) |
| `/zyven/prod/RAZORPAY_KEY_SECRET` | `SecureString` | Razorpay API Key Secret |
| `/zyven/prod/RAZORPAY_WEBHOOK_SECRET`| `SecureString` | Razorpay Webhook HMAC secret |
| `/zyven/prod/CLOUDFLARE_TUNNEL_TOKEN`| `SecureString` | Secret token generated in Cloudflare Zero Trust for the EC2 tunnel |
| `/zyven/prod/BACKUP_ENCRYPTION_KEY` | `SecureString` | Passphrase/key for `age` or `gpg` client-side backup encryption |
| `/zyven/prod/BACKUP_S3_ACCESS_KEY` | `SecureString` | Cloudflare R2 / Backblaze B2 S3-compatible Access Key ID |
| `/zyven/prod/BACKUP_S3_SECRET_KEY` | `SecureString` | Cloudflare R2 / Backblaze B2 S3-compatible Secret Key |
| `/zyven/prod/APP_TAG` | `String` | Immutable app tag (e.g., `app-58d2dff` or full digest) |
| `/zyven/prod/MIGRATOR_TAG` | `String` | Immutable migrator tag (e.g., `migrator-58d2dff` or full digest) |
| `/zyven/prod/DATA_VOLUME_ID` | `String` | Dedicated EBS persistent volume ID (e.g. `vol-0123456789abcdef0`) |

---

## Out-of-Band Super Admin Provisioning Workflow

`SUPER_ADMIN_PASSWORD` is **never stored permanently** in AWS Parameter Store, environment files, or Docker container layers. 

### One-Off Bootstrap Runbook:
1. Connect to the EC2 instance via **AWS SSM Session Manager**:
   ```bash
   aws ssm start-session --target <instance-id> --region ap-south-1
   ```
2. Run an ephemeral, interactive container connected to the internal database network:
   ```bash
   read -s -p "Enter Super Admin Password: " ADMIN_PASS
   echo ""

   docker run --rm -it \
     --network zyven_zyven-internal \
     -e DATABASE_URL="postgresql://zyven_app:<password>@db:5432/zyven_prod" \
     -e SUPER_ADMIN_EMAIL="admin@zyven.me" \
     -e SUPER_ADMIN_PASSWORD="$ADMIN_PASS" \
     -e SUPER_ADMIN_NAME="Platform Administrator" \
     532787445442.dkr.ecr.ap-south-1.amazonaws.com/zyven:app-58d2dff \
     node -e '
       const { PrismaClient } = require("@prisma/client");
       const bcrypt = require("bcryptjs");
       const prisma = new PrismaClient();
       async function main() {
         const hash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 12);
         const user = await prisma.user.upsert({
           where: { email: process.env.SUPER_ADMIN_EMAIL },
           update: { passwordHash: hash, role: "SUPER_ADMIN", isActive: true },
           create: {
             email: process.env.SUPER_ADMIN_EMAIL,
             fullName: process.env.SUPER_ADMIN_NAME,
             passwordHash: hash,
             role: "SUPER_ADMIN",
             isActive: true
           }
         });
         console.log("Super Admin provisioned successfully:", user.email);
       }
       main().finally(() => prisma.$disconnect());
     '
   unset ADMIN_PASS
   ```
3. Log into `https://zyven.me/login` as Super Admin and verify access to `/admin`.
