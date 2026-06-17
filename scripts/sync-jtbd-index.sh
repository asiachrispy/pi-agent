#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/JTBD/index.md"
TMP="$(mktemp)"

{
  echo "# JTBD 站会索引"
  echo ""
  echo "> 由 \`scripts/sync-jtbd-index.sh\` 生成于 $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "| 成员 | 文件 | 活跃项（## 当前活跃 下 - [ ] 行数） |"
  echo "|---|---|---|"
} > "$TMP"

shopt -s nullglob
for f in "$ROOT/JTBD"/*-jtbd.md; do
  base="$(basename "$f")"
  member="${base%-jtbd.md}"
  active="$(grep -c '^- \[ \]' "$f" 2>/dev/null || echo 0)"
  echo "| $member | \`$base\` | $active |" >> "$TMP"
done

mv "$TMP" "$OUT"
echo "ok: $OUT"
