#!/usr/bin/env bash
# Smoke test for Sprint 0 API (run after deploy).
# Usage: AGENT_API_KEY=xxx ADMIN_SECRET=yyy ./scripts/smoke-test.sh https://your-app.vercel.app

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
AGENT_API_KEY="${AGENT_API_KEY:-}"
ADMIN_SECRET="${ADMIN_SECRET:-}"

echo "==> GET /api/health"
curl -sf "$BASE_URL/api/health"
echo

if [[ -n "$AGENT_API_KEY" ]]; then
  echo "==> GET /api/agent/queue (expect 200, empty orders ok)"
  curl -sf -H "Authorization: Bearer $AGENT_API_KEY" \
    "$BASE_URL/api/agent/queue?pointId=point_dev_1"
  echo
else
  echo "Skip agent test (set AGENT_API_KEY)"
fi

if [[ -n "$ADMIN_SECRET" ]]; then
  echo "==> GET /api/admin/orders"
  curl -sf -H "Authorization: Bearer $ADMIN_SECRET" \
    "$BASE_URL/api/admin/orders?status=AWAITING_PAYMENT"
  echo
else
  echo "Skip admin test (set ADMIN_SECRET)"
fi

echo "Smoke test passed."
