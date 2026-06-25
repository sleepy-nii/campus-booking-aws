#!/usr/bin/env bash
# deploy.sh — Deploy Campus Booking to AWS (Learner Lab / us-east-1)
# Usage: ./scripts/deploy.sh <TEMPLATES_BUCKET> <ALERT_EMAIL>
# Example: ./scripts/deploy.sh my-cfn-templates admin@mmu.edu.my

set -euo pipefail

REGION="us-east-1"
TEMPLATES_BUCKET="${1:?S3 bucket name for templates required}"
ALERT_EMAIL="${2:?Alert email required}"
ENV_NAME="campus-booking"
TEMPLATES_DIR="$(dirname "$0")/../infrastructure/cloudformation"

echo "==> [1/4] Creating S3 bucket for CloudFormation templates..."
aws s3 mb "s3://${TEMPLATES_BUCKET}" --region "$REGION" 2>/dev/null || true

echo "==> [2/4] Uploading CloudFormation templates..."
aws s3 sync "$TEMPLATES_DIR" "s3://${TEMPLATES_BUCKET}/${ENV_NAME}/" \
  --include "*.yaml" --region "$REGION"

TEMPLATES_URL="https://s3.amazonaws.com/${TEMPLATES_BUCKET}/${ENV_NAME}"

echo "==> [3/4] Deploying master CloudFormation stack..."
aws cloudformation deploy \
  --region "$REGION" \
  --stack-name "${ENV_NAME}-master" \
  --template-file "${TEMPLATES_DIR}/00-main.yaml" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    EnvironmentName="$ENV_NAME" \
    TemplatesBucketUrl="$TEMPLATES_URL" \
    AlertEmail="$ALERT_EMAIL" \
  --no-fail-on-empty-changeset

echo "==> [4/4] Fetching outputs..."
aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "${ENV_NAME}-master" \
  --query "Stacks[0].Outputs" \
  --output table

echo ""
echo "==> Deployment complete!"
echo "==> To tear down everything: aws cloudformation delete-stack --stack-name ${ENV_NAME}-master --region ${REGION}"
