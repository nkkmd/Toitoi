#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_DIR="${ARCHIVE_DIR:-$HOME/nostr-archive/agroecology-commons}"
ARCHIVE_FILE="${ARCHIVE_FILE:-$ARCHIVE_DIR/inquiry.jsonl}"
LOG_FILE="${LOG_FILE:-$ARCHIVE_DIR/archive.log}"
TIMESTAMP="$(date +%Y-%m-%dT%H:%M:%S)"

log() {
  echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

cd "$ARCHIVE_DIR" || exit 1

if [ ! -f "$ARCHIVE_FILE" ]; then
  echo "❌ inquiry.jsonl が見つかりません" >&2
  exit 1
fi

SIZE_MB="$(du -m "$ARCHIVE_FILE" | cut -f1)"
echo "現在のファイルサイズ: ${SIZE_MB}MB"
echo "年別分割を開始します..."

node - "$ARCHIVE_FILE" <<'EOF'
const fs = require('fs');

const archiveFile = process.argv[2];
const lines = fs.readFileSync(archiveFile, 'utf8')
  .split('\n')
  .filter(line => line.trim() !== '');

const yearLines = {};
for (const line of lines) {
  try {
    const event = JSON.parse(line);
    const createdAt = typeof event.created_at === 'number' ? event.created_at : Number(event.created_at);
    if (!Number.isFinite(createdAt)) {
      continue;
    }
    const year = new Date(createdAt * 1000).getUTCFullYear().toString();
    (yearLines[year] ??= []).push(line);
  } catch {
    continue;
  }
}

let total = 0;
for (const [year, yearEntries] of Object.entries(yearLines).sort()) {
  const fileName = `inquiry_${year}.jsonl`;
  fs.writeFileSync(fileName, `${yearEntries.join('\n')}\n`);
  console.log(`  ✅ ${fileName}: ${yearEntries.length}件`);
  total += yearEntries.length;
}

console.log(`\n合計 ${total} 件を分割しました`);
EOF

rm "$ARCHIVE_FILE"
echo "inquiry.jsonl を削除しました"

if git -C "$ARCHIVE_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$ARCHIVE_DIR" add -A
  git -C "$ARCHIVE_DIR" commit -m "archive: Split inquiry.jsonl into yearly files" || true
fi

log "inquiry.jsonl を年別ファイルへ分割しました"
