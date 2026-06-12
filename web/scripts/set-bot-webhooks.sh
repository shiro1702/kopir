#!/usr/bin/env bash
# Register Telegram and MAX webhooks on the deployed Kopir instance.
# Usage: ADMIN_SECRET=xxx ./scripts/set-bot-webhooks.sh https://your-app.vercel.app

set -euo pipefail

BASE_URL="${1:-}"
ADMIN_SECRET="${ADMIN_SECRET:-}"

if [[ -z "$BASE_URL" || -z "$ADMIN_SECRET" ]]; then
  echo "Usage: ADMIN_SECRET=xxx $0 https://your-app.vercel.app"
  exit 1
fi

curl -sf -X POST "$BASE_URL/api/bots/set-webhooks" \
  -H "Authorization: Bearer $ADMIN_SECRET" | jq .
