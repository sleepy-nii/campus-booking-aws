#!/usr/bin/env bash
# security-test.sh — Basic security validation for Part E of Assignment 2
# Run against the deployed ALB DNS name from an external machine.
# Tools required: nmap, curl
# Usage: ./scripts/security-test.sh <ALB_DNS_OR_IP>

set -euo pipefail

TARGET="${1:?Target ALB DNS or IP required}"
REPORT_FILE="security-test-report-$(date +%Y%m%d-%H%M%S).txt"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$REPORT_FILE"; }

log "========================================================"
log "  Campus Booking — Security Validation Report"
log "  Target: ${TARGET}"
log "========================================================"

# ── Test 1: Port Scan ────────────────────────────────────────────────────────
log ""
log "TEST 1: Port scan (nmap) — only 443 and 80 should be open"
if command -v nmap &>/dev/null; then
  nmap -Pn -p 80,443,22,3306,3000 "$TARGET" 2>&1 | tee -a "$REPORT_FILE"
else
  log "SKIP: nmap not installed"
fi

# ── Test 2: HTTP → HTTPS redirect ───────────────────────────────────────────
log ""
log "TEST 2: HTTP to HTTPS redirect"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${TARGET}/")
if [ "$HTTP_STATUS" -eq 301 ] || [ "$HTTP_STATUS" -eq 302 ]; then
  log "PASS: HTTP redirects to HTTPS (status ${HTTP_STATUS})"
else
  log "FAIL: Expected 301/302, got ${HTTP_STATUS}"
fi

# ── Test 3: TLS version ─────────────────────────────────────────────────────
log ""
log "TEST 3: TLS version check — TLS 1.2+ required"
if openssl s_client -connect "${TARGET}:443" -tls1_1 </dev/null 2>&1 | grep -q "Cipher"; then
  log "WARN: TLS 1.1 accepted (should be disabled)"
else
  log "PASS: TLS 1.1 rejected"
fi
if openssl s_client -connect "${TARGET}:443" -tls1_2 </dev/null 2>&1 | grep -q "Cipher"; then
  log "PASS: TLS 1.2 accepted"
fi

# ── Test 4: SQL Injection attempt through login (WAF should block) ───────────
log ""
log "TEST 4: SQL injection attempt — WAF should block or return 400/403"
SQLI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k \
  -X POST "https://${TARGET}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mmu.edu.my'\'' OR 1=1--","password":"test"}')
if [ "$SQLI_STATUS" -eq 403 ]; then
  log "PASS: WAF blocked SQLi attempt (403)"
elif [ "$SQLI_STATUS" -eq 400 ]; then
  log "PASS: Application rejected SQLi input (400)"
else
  log "WARN: SQLi attempt returned ${SQLI_STATUS} — review WAF rules"
fi

# ── Test 5: Security headers ─────────────────────────────────────────────────
log ""
log "TEST 5: Security response headers"
HEADERS=$(curl -s -I -k "https://${TARGET}/" 2>&1)
for HEADER in "Strict-Transport-Security" "X-Frame-Options" "X-Content-Type-Options" "Content-Security-Policy"; do
  if echo "$HEADERS" | grep -qi "$HEADER"; then
    log "PASS: ${HEADER} present"
  else
    log "WARN: ${HEADER} missing"
  fi
done

# ── Test 6: Rate limiting ─────────────────────────────────────────────────────
log ""
log "TEST 6: Rate limiting — send 20 rapid requests, expect some 429/403"
BLOCKED=0
for i in $(seq 1 20); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "https://${TARGET}/api/auth/me")
  [ "$CODE" -eq 429 ] || [ "$CODE" -eq 403 ] && BLOCKED=$((BLOCKED+1))
done
if [ "$BLOCKED" -gt 0 ]; then
  log "PASS: Rate limiting triggered (${BLOCKED}/20 requests blocked)"
else
  log "INFO: No rate limiting triggered at 20 requests (threshold is 1000/5min)"
fi

log ""
log "========================================================"
log "  Report saved to: ${REPORT_FILE}"
log "========================================================"
