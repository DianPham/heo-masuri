#!/usr/bin/env bash
# Upload the pre-written Chinese tracks in scripts/routine/zh-backfill-data/
# to an app, then voice every lesson (both tracks) until no audio is missing.
#
# Usage: scripts/routine/upload_zh_backfill.sh https://heo-masuri.vercel.app
#
# Auth: sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set;
# otherwise relies on a Claude cloud-environment network secret for the host.
# Needs the Chinese-track code deployed and migration 021/022 applied there.
# Safe to re-run: lessons that already have a Chinese track answer 409.
set -euo pipefail
APP="${1:?usage: $0 <app url>}"; APP="${APP%/}"
DIR="$(cd "$(dirname "$0")" && pwd)/zh-backfill-data"
AUTH=(); [ -n "${CRON_SECRET:-}" ] && AUTH=(-H "Authorization: Bearer $CRON_SECRET")

ok=0; skipped=0; failed=0
for f in "$DIR"/*.json; do
  code=$(curl -sS -o /tmp/zh-upload-resp.json -w "%{http_code}" --max-time 90 -X POST \
    "$APP/api/notebook/routine/zh-backfill" "${AUTH[@]}" \
    -H "Content-Type: application/json" --data-binary @"$f")
  case "$code" in
    200) ok=$((ok+1)); echo "ok       $(basename "$f")";;
    409) skipped=$((skipped+1)); echo "exists   $(basename "$f")";;
    *)   failed=$((failed+1)); echo "FAILED   $(basename "$f") → $code $(head -c 300 /tmp/zh-upload-resp.json)";;
  esac
done
echo "uploaded=$ok already_there=$skipped failed=$failed"

# Voice everything. Each POST voices up to 2 lessons (~60s budget per call).
for i in $(seq 1 40); do
  resp=$(curl -sS --max-time 90 -X POST "$APP/api/notebook/routine/audio?limit=2" "${AUTH[@]}" || true)
  missing=$(printf '%s' "$resp" | python3 -c "import json,sys; print(json.load(sys.stdin).get('missing','?'))" 2>/dev/null || echo "?")
  echo "audio pass $i: missing=$missing"
  [ "$missing" = "0" ] && break
done
curl -sS --max-time 30 "$APP/api/notebook/routine/audio" "${AUTH[@]}"; echo
