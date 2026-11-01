# ZYVEN AWS Production Deployment Architecture

## Network Design

* **VPC Configuration**: Use the default AWS VPC. Do **not** provision a NAT Gateway (saves ~$35/month in fixed AWS infrastructure costs).
* **Database Isolation (RDS PostgreSQL)**:
  * **Public Access**: `No` (private database instance).
  * **Security Group Ingress**: Port `5432` allowed **only** from the EC2 Security Group using security-group-to-security-group referencing (`sg-xxxxxxxx`). Never expose port 5432 to `0.0.0.0/0`.
* **Application Host (EC2)**:
  * **Ingress**: Ports `80` (HTTP) and `443` (HTTPS) restricted to Cloudflare IP ranges only (or Cloudflare Tunnel).
  * **Access Management**: No public SSH (port 22). Remote shell administration is performed securely via AWS Systems Manager (SSM) Session Manager with IAM role credentials.
* **Database Migrations Execution**:
  * Because RDS is private, database migrations cannot run from external CI/CD runners (e.g. GitHub Actions).
  * Migrations are executed directly on the EC2 instance inside the VPC using the dedicated one-off migrator container:
    ```bash
    docker run --rm -e DATABASE_URL="$DATABASE_URL" <ECR_REGISTRY>/zyven:migrator
    ```
  * Once the migration completes successfully, start or update the web application container (`zyven:latest`).
* **Schema Governance**:
  * **Never run `prisma db push` or `prisma migrate reset` in production.**
  * Only `prisma migrate deploy` (executed by `zyven:migrator`) is permitted.
