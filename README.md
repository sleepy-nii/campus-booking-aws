# Campus Resource Booking — AWS Migration (Assignment 2)

Secure migration of the on-premises Campus Resource Booking system to AWS.

## Architecture Overview

```
Internet
   │  HTTPS (443)
   ▼
[AWS WAF] ── blocks SQLi, XSS, rate limits
   │
[Application Load Balancer]  ← public subnets (AZ1 + AZ2)
   │  HTTP (3000) — internal only
   ▼
[EC2 Auto Scaling Group]     ← private app subnets (AZ1 + AZ2)
   │  MySQL (3306) — internal only
   ▼
[Amazon RDS MySQL Multi-AZ]  ← private DB subnets (AZ1 + AZ2)
```

**Security controls:** IAM least-privilege · KMS encryption at rest · SSL/TLS in transit · CloudTrail · CloudWatch alarms · Security Groups · NACLs · Secrets Manager · Helmet.js headers

## Project Structure

```
campus-booking-aws/
├── app/
│   ├── frontend/          # HTML/CSS/JS (unchanged from Assgm 1)
│   ├── backend/           # Node.js/Express — adapted for MySQL + AWS
│   └── database/
│       └── schema.sql     # MySQL schema (migrated from MSSQL)
├── infrastructure/
│   └── cloudformation/
│       ├── 00-main.yaml           # Master (nested) stack
│       ├── 01-vpc.yaml            # VPC, subnets, NAT, route tables
│       ├── 02-security-groups.yaml # ALB / App / RDS security groups
│       ├── 03-iam.yaml            # EC2 role, CloudTrail role
│       ├── 04-rds.yaml            # RDS MySQL Multi-AZ + Secrets Manager
│       ├── 05-ec2-alb.yaml        # ALB + Launch Template + ASG
│       ├── 06-s3.yaml             # Backup + CloudTrail log buckets
│       └── 07-waf-cloudtrail.yaml # WAF v2 + CloudTrail + CloudWatch alarms
├── security/
│   ├── iam-policies/
│   │   ├── ec2-role-policy.json   # Least-privilege EC2 policy
│   │   └── deny-non-mfa.json     # Enforce MFA for IAM users
│   └── waf-rules/
│       └── custom-rules.json     # Custom WAF rules (scanner blocking)
├── scripts/
│   ├── deploy.sh           # Deploy all stacks via AWS CLI
│   ├── migrate-db.sh       # Run schema.sql against RDS
│   └── security-test.sh   # Part E — automated security validation
├── .env.example
├── .gitignore
└── README.md
```

## Quick Start (Local Development)

```bash
cd app/backend
npm install
cp ../../.env.example ../../.env   # fill in local DB credentials
node app.js
# Open http://localhost:3000
```

## Deployment to AWS

### Prerequisites
- AWS CLI configured (`aws configure`)
- ACM certificate issued for your domain
- S3 bucket for CloudFormation templates

### Steps

```bash
# 1. Make scripts executable
chmod +x scripts/*.sh

# 2. Deploy all stacks
./scripts/deploy.sh \
  ap-southeast-1 \
  my-cfn-templates-bucket \
  arn:aws:acm:ap-southeast-1:123456789:certificate/xxx \
  youremail@example.com

# 3. After RDS is up — run schema migration (from inside VPC or SSM session)
./scripts/migrate-db.sh <RDS_ENDPOINT> admin <DB_PASSWORD>

# 4. Security validation (Part E)
./scripts/security-test.sh <ALB_DNS_NAME>
```

## Key Differences from Assignment 1

| Aspect | Assgm 1 (On-Premises) | Assgm 2 (AWS) |
|---|---|---|
| Database | SQL Server (MSSQL) | Amazon RDS MySQL 8.0 Multi-AZ |
| DB credentials | `.env` file | AWS Secrets Manager (auto-rotation) |
| Encryption at rest | TDE (SQL Server) | KMS-encrypted RDS + S3 |
| Encryption in transit | Optional `encrypt=true` | Enforced SSL on RDS + HTTPS ALB |
| Access control | SQL Server RLS + DB roles | Security Groups + IAM least-privilege |
| Monitoring | Windows Event Log | CloudTrail + CloudWatch + WAF logs |
| Infrastructure | Manual setup | CloudFormation IaC |
| Availability | Single server | Multi-AZ RDS + Auto Scaling EC2 |
| DDoS / WAF | None | AWS WAF v2 + Managed Rules |

## Default Credentials (change immediately)

| Role | Email | Password |
|---|---|---|
| Admin | admin@mmu.edu.my | Admin@123 |
| Faculty | faculty@mmu.edu.my | Faculty@123 |
