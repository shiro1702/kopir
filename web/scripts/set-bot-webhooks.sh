#!/usr/bin/env bash
# Register Telegram and MAX webhooks on the deployed Kopir instance.
# Usage: ./scripts/set-bot-webhooks.sh https://your-app.vercel.app
# ADMIN_SECRET is read from web/.env when not set in the environment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BASE_URL="${1:-}"
ADMIN_SECRET="${ADMIN_SECRET:-}"

if [[ -z "$ADMIN_SECRET" && -f "$WEB_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$WEB_ROOT/.env"
  set +a
  ADMIN_SECRET="${ADMIN_SECRET:-}"
fi

if [[ -z "$BASE_URL" || -z "$ADMIN_SECRET" ]]; then
  echo "Usage: ADMIN_SECRET=xxx $0 https://your-app.vercel.app"
  echo "       (or put ADMIN_SECRET in web/.env and omit the env var)"
  exit 1
fi

if [[ "$ADMIN_SECRET" == "..." ]]; then
  echo "Error: ADMIN_SECRET must be the real secret from web/.env or Vercel, not literal '...'"
  exit 1
fi

BASE_URL="${BASE_URL%/}"

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required (brew install jq)"
  exit 1
fi

HTTP_CODE="$(curl -sS -o /tmp/kopir-set-webhooks.json -w "%{http_code}" -X POST \
  "$BASE_URL/api/bots/set-webhooks" \
  -H "Authorization: Bearer $ADMIN_SECRET")"

if [[ "$HTTP_CODE" == "401" ]]; then
  echo "Error: HTTP 401 — wrong ADMIN_SECRET (check web/.env vs Vercel env)"
  cat /tmp/kopir-set-webhooks.json 2>/dev/null || true
  exit 1
fi

if [[ "$HTTP_CODE" -lt 200 || "$HTTP_CODE" -ge 300 ]]; then
  echo "Error: HTTP $HTTP_CODE"
  cat /tmp/kopir-set-webhooks.json 2>/dev/null || true
  exit 1
fi

jq . /tmp/kopir-set-webhooks.json

if jq -e '.max.ok == false or .telegram.ok == false' /tmp/kopir-set-webhooks.json >/dev/null; then
  echo ""
  echo "Warning: one or more webhooks failed — see errors above."
  exit 1
fi
