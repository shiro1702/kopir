#!/usr/bin/env bash
# Deploy checklist for Sprint 0 on Vercel + Neon.
# Usage: ./scripts/deploy-checklist.sh https://your-app.vercel.app

set -euo pipefail

BASE_URL="${1:-}"
ADMIN_SECRET="${ADMIN_SECRET:-}"

if [[ -z "$BASE_URL" ]]; then
  echo "Usage: ADMIN_SECRET=xxx $0 https://your-app.vercel.app"
  exit 1
fi

echo "==> Health check"
curl -sf "$BASE_URL/api/health" | jq .

if [[ -n "$ADMIN_SECRET" ]]; then
  echo "==> Set Telegram + MAX webhooks"
  curl -sf -X POST "$BASE_URL/api/bots/set-webhooks" \
    -H "Authorization: Bearer $ADMIN_SECRET" | jq .
else
  echo "Skip webhooks (set ADMIN_SECRET to run)"
fi

echo "Done. Next: run agent with SERVER_URL=$BASE_URL"
