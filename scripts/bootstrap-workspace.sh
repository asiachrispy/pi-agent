#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/workspace.config.yaml"
PULL=0
[[ "${1:-}" == "--pull" ]] && PULL=1

if ! command -v git >/dev/null 2>&1; then
  echo "error: git is required." >&2
  exit 1
fi

cd "$ROOT"

paths=()
urls=()
while IFS= read -r line; do
  p="${line#*path:}"
  p="$(echo "$p" | tr -d ' "'\''')"
  [[ -n "$p" ]] && paths+=("$p")
done < <(grep -E '^[[:space:]]+path:' "$CONFIG" || true)

while IFS= read -r line; do
  u="${line#*url:}"
  u="$(echo "$u" | tr -d ' "'\''')"
  [[ -n "$u" ]] && urls+=("$u")
done < <(grep -E '^[[:space:]]+url:' "$CONFIG" || true)

if [[ ${#paths[@]} -eq 0 ]]; then
  echo "error: no repos.path in workspace.config.yaml" >&2
  exit 1
fi

if [[ ${#urls[@]} -ne ${#paths[@]} ]]; then
  echo "error: repos path/url count mismatch in workspace.config.yaml" >&2
  exit 1
fi

for i in "${!paths[@]}"; do
  name="${paths[$i]}"
  url="${urls[$i]}"
  dir="$ROOT/$name"

  if [[ -d "$dir/.git" ]]; then
    echo "ok: $name already exists"
    if [[ "$PULL" == "1" ]]; then
      echo "pull: $name"
      git -C "$dir" pull --ff-only
    fi
  elif [[ -e "$dir" ]]; then
    echo "warn: $dir exists but is not a git repo; skip clone" >&2
  else
    echo "clone: $name"
    git clone "$url" "$dir"
  fi
done

"$ROOT/scripts/setup-pi-entrypoints.sh"
echo "done: pi-agent workspace initialized (repos: ${paths[*]})"
echo "next: ./scripts/check-pi-env.sh, open Pi at $ROOT, /reload, /team"
