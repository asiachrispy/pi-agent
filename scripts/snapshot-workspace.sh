#!/usr/bin/env bash
# scripts/snapshot-workspace.sh
# 刷新 wiki/summary.md 中 `<!-- snapshot-* -->` 段的业务仓元数据。

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/_snapshot_block.py" "wiki/summary.md"
