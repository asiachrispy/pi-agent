#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COUNTER="$ROOT/demands/.id-counter"
YEAR="$(date +%Y)"

if [[ ! -f "$COUNTER" ]]; then
  echo "$YEAR:0" > "$COUNTER"
fi

line="$(grep -E "^${YEAR}:" "$COUNTER" || true)"
if [[ -z "$line" ]]; then
  echo "$YEAR:0" >> "$COUNTER"
  n=0
else
  n="${line#*:}"
fi

next=$((n + 1))
sed -i '' "s/^${YEAR}:.*/${YEAR}:${next}/" "$COUNTER" 2>/dev/null || \
  sed -i "s/^${YEAR}:.*/${YEAR}:${next}/" "$COUNTER"

printf 'D-%s-%03d\n' "$YEAR" "$next"
