#!/usr/bin/env bash
set -euo pipefail

RELAY="${RELAY:-wss://relay.your-domain.com}"
ARCHIVE_DIR="${ARCHIVE_DIR:-$HOME/nostr-archive/agroecology-commons}"
ARCHIVE_FILE_DEFAULT="${ARCHIVE_FILE:-}"
LOG_FILE="${LOG_FILE:-$ARCHIVE_DIR/archive.log}"
DATE="$(date +%Y-%m-%d)"
TIMESTAMP="$(date +%Y-%m-%dT%H:%M:%S)"

log() {
  echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

mkdir -p "$ARCHIVE_DIR"

if [ -n "$ARCHIVE_FILE_DEFAULT" ]; then
  ARCHIVE_FILE="$ARCHIVE_FILE_DEFAULT"
elif [ -f "$ARCHIVE_DIR/inquiry.jsonl" ]; then
  ARCHIVE_FILE="$ARCHIVE_DIR/inquiry.jsonl"
else
  ARCHIVE_FILE="$ARCHIVE_DIR/inquiry_$(date +%Y).jsonl"
fi

touch "$ARCHIVE_FILE"

cd "$ARCHIVE_DIR" || exit 1

if ! command -v nak >/dev/null 2>&1; then
  log "ERROR: nak が見つかりません"
  echo "nak is required" >&2
  exit 1
fi

LAST_TS=0
if [ -s "$ARCHIVE_FILE" ]; then
  LAST_TS=$(tail -n 1 "$ARCHIVE_FILE" | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ try { const event = JSON.parse(d); process.stdout.write(String(event.created_at || 0)); } catch (error) { process.stdout.write('0'); } });" 2>/dev/null || echo 0)
fi

log "前回タイムスタンプ: $LAST_TS"

TMP_FILE="$(mktemp)"
trap 'rm -f "$TMP_FILE"' EXIT

nak req -k 1042 --since "$LAST_TS" "$RELAY" > "$TMP_FILE" 2>> "$LOG_FILE"

NEW_COUNT="$(wc -l < "$TMP_FILE")"
if [ "$NEW_COUNT" -eq 0 ]; then
  log "新規イベントなし。スキップ。"
  exit 0
fi

cat "$TMP_FILE" >> "$ARCHIVE_FILE"

node - "$ARCHIVE_FILE" <<'EOF'
const fs = require('fs');

const archiveFile = process.argv[2];
const lines = fs.readFileSync(archiveFile, 'utf8')
  .split('\n')
  .filter(line => line.trim() !== '');

const seen = new Set();
const unique = [];
for (const line of lines) {
  try {
    const event = JSON.parse(line);
    if (!event.id || seen.has(event.id)) {
      continue;
    }
    seen.add(event.id);
    unique.push(line);
  } catch {
    continue;
  }
}

fs.writeFileSync(archiveFile, `${unique.join('\n')}\n`);
console.log(`重複排除後の総イベント数: ${unique.length}`);
EOF

TOTAL="$(wc -l < "$ARCHIVE_FILE")"

if git -C "$ARCHIVE_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$ARCHIVE_DIR" add "$(basename "$ARCHIVE_FILE")"
  git -C "$ARCHIVE_DIR" commit -m "archive: $DATE +${NEW_COUNT} items added (total ${TOTAL} items)" >> "$LOG_FILE" 2>&1 || true
fi

log "完了: ${NEW_COUNT}件追加、累計 ${TOTAL}件"
