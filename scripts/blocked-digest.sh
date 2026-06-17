#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEMANDS="$ROOT/demands"

printf '== blocked digest ==\n'
printf 'generated: %s\n\n' "$(date -Iseconds)"

found=0
for f in "$DEMANDS"/D-*.md; do
  [[ -f "$f" ]] || continue
  if ! grep -q '^status: blocked' "$f"; then
    continue
  fi
  found=1
  id="$(grep '^id:' "$f" | head -1 | sed 's/id: //')"
  title="$(grep '^title:' "$f" | head -1 | sed 's/title: //' | tr -d '"')"
  assignee="$(grep '^assignee:' "$f" | head -1 | sed 's/assignee: //' | tr -d '"')"
  echo "---"
  echo "$id $title"
  echo "file: $f"
  echo "assignee: ${assignee:-（未填）}"
  awk '/^## 阻塞/{p=1} p{print} /^## [^阻]/{if(p&&NR>1) exit}' "$f" | head -20
  echo ""
done

if [[ "$found" -eq 0 ]]; then
  echo "（无 blocked demand）"
fi
