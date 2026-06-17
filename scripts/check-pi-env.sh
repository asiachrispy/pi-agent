#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/workspace.config.yaml"
ERRORS=0
WARNINGS=0

ok() { printf 'ok: %s\n' "$*"; }
warn() { printf 'warn: %s\n' "$*"; WARNINGS=$((WARNINGS + 1)); }
fail() { printf 'error: %s\n' "$*"; ERRORS=$((ERRORS + 1)); }

printf '== pi-agent environment check ==\n'
printf 'root: %s\n\n' "$ROOT"

printf '== Pi ==\n'
if [[ -d "/Applications/Pi.app" ]]; then
  ok "Pi App found: /Applications/Pi.app"
else
  fail "Pi App not found at /Applications/Pi.app"
fi

if command -v pi >/dev/null 2>&1; then
  ok "optional pi CLI: $(command -v pi)"
else
  ok "optional pi CLI not found (Pi.app is enough)"
fi

printf '\n== Tools ==\n'
for cmd in git node npm; do
  if command -v "$cmd" >/dev/null 2>&1; then ok "$cmd found"; else warn "$cmd not found"; fi
done
if command -v swift >/dev/null 2>&1; then ok "swift found"; else warn "swift not found (needed for pi-app macOS shell)"; fi

printf '\n== pi-agent workspace resources ==\n'
for path in \
  "workspace.config.yaml" \
  ".pi/agents/team.md" \
  ".pi/APPEND_SYSTEM.md" \
  ".pi/extensions/subagent/index.ts" \
  ".pi/extensions/jtbd-sync/index.ts" \
  ".pi/extensions/team-entry/index.ts" \
  "demands/template.md" \
  "wiki/agent-reading-map.md" \
  "wiki/project-map.md" \
  "wiki/validation-rules.md" \
  "wiki/workflow-usage.md"; do
  if [[ -f "$ROOT/$path" || -d "$ROOT/$path" ]]; then ok "$path"; else fail "missing $path"; fi
done

printf '\n== business repositories (workspace.config.yaml) ==\n'
while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  dir="$ROOT/$name"
  if [[ ! -d "$dir" ]]; then
    fail "$name directory missing — run ./scripts/bootstrap-workspace.sh"
    continue
  fi
  if [[ ! -d "$dir/.git" ]]; then
    fail "$name is not a git repository"
    continue
  fi
  ok "$name git repo ($(git -C "$dir" rev-parse --short HEAD 2>/dev/null || echo '?'))"
done < <(grep -E '^[[:space:]]+path:' "$CONFIG" | sed 's/.*path:[[:space:]]*//' | tr -d '"' | tr -d "'")

printf '\n== summary ==\n'
printf 'errors: %d warnings: %d\n' "$ERRORS" "$WARNINGS"
[[ "$ERRORS" -eq 0 ]]
