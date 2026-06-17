#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-all}"

touch "$ROOT/wiki/raw/database/table-index.md" 2>/dev/null || true

if [[ ! -f "$ROOT/wiki/raw/database/table-index.md" ]]; then
  cat > "$ROOT/wiki/raw/database/table-index.md" <<'EOF'
# 数据库表索引

> 按表名维护索引；agent 禁止全文读取 *.sql。

| 表名 | 库 | 说明 |
|---|---|---|
EOF
fi

echo "ok: wiki sync ($TARGET) — table-index ensured"
