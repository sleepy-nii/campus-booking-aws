#!/usr/bin/env bash
# migrate-db.sh — Run schema.sql against the RDS instance
# Must be run from inside the VPC (e.g., an EC2 bastion or via AWS SSM Session Manager)
# Usage: ./scripts/migrate-db.sh <RDS_ENDPOINT> <DB_USER> <DB_PASSWORD>

set -euo pipefail

RDS_ENDPOINT="${1:?RDS endpoint required}"
DB_USER="${2:-admin}"
DB_PASSWORD="${3:?DB password required}"
SCHEMA_FILE="$(dirname "$0")/../app/database/schema.sql"

echo "==> Running schema migration against ${RDS_ENDPOINT}..."
mysql \
  --host="$RDS_ENDPOINT" \
  --user="$DB_USER" \
  --password="$DB_PASSWORD" \
  --ssl-mode=REQUIRED \
  < "$SCHEMA_FILE"

echo "==> Schema migration complete."
