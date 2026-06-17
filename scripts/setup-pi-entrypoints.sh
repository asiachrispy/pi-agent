#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPTS=()
EXTENSIONS=(subagent jtbd-sync team-entry)

# 从 workspace.config.yaml 读取 repos path（仅已存在目录）
projects=()
while IFS= read -r line; do
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  if [[ "$line" =~ path:[[:space:]]*(.+) ]]; then
    p="${BASH_REMATCH[1]}"
    p="${p//\"/}"
    p="$(echo "$p" | xargs)"
    [[ -d "$ROOT/$p" ]] && projects+=("$p")
  fi
done < <(awk '/^repos:/{f=1;next} f&&/^[^[:space:]#]/{exit} f{print}' "$ROOT/workspace.config.yaml" 2>/dev/null || true)

link_prompts() {
  local target_dir="$1"
  mkdir -p "$target_dir/.pi/prompts" "$target_dir/.pi/extensions"
  rm -f "$target_dir/.pi/settings.json"
  if ((${#PROMPTS[@]} > 0)); then
    for prompt in "${PROMPTS[@]}"; do
      rm -f "$target_dir/.pi/prompts/$prompt"
      ln -sf "$(realpath --relative-to="$target_dir/.pi/prompts" "$ROOT/.pi/prompts/$prompt" 2>/dev/null || python3 -c "import os.path; print(os.path.relpath('$ROOT/.pi/prompts/$prompt', '$target_dir/.pi/prompts'))")" "$target_dir/.pi/prompts/$prompt"
    done
  fi
  for ext in "${EXTENSIONS[@]}"; do
    rm -rf "$target_dir/.pi/extensions/$ext"
    ln -sf "$(python3 -c "import os.path; print(os.path.relpath('$ROOT/.pi/extensions/$ext', '$target_dir/.pi/extensions'))")" "$target_dir/.pi/extensions/$ext"
  done
}

# macOS realpath may lack --relative-to; use python fallback above
link_prompts_mac() {
  local target_dir="$1"
  mkdir -p "$target_dir/.pi/prompts" "$target_dir/.pi/extensions"
  rm -f "$target_dir/.pi/settings.json"
  if ((${#PROMPTS[@]} > 0)); then
    for prompt in "${PROMPTS[@]}"; do
      rm -f "$target_dir/.pi/prompts/$prompt"
      ln -s "../../../.pi/prompts/$prompt" "$target_dir/.pi/prompts/$prompt"
    done
  fi
  for ext in "${EXTENSIONS[@]}"; do
    rm -rf "$target_dir/.pi/extensions/$ext"
    ln -s "../../../.pi/extensions/$ext" "$target_dir/.pi/extensions/$ext"
  done
}

for project in "${projects[@]}"; do
  project_dir="$ROOT/$project"
  link_prompts_mac "$project_dir"
  if [[ -d "$project_dir/.git" ]]; then
    touch "$project_dir/.git/info/exclude"
    if ! grep -qxF ".pi/" "$project_dir/.git/info/exclude" 2>/dev/null; then
      printf "\n# pi-agent entrypoints from setup-pi-entrypoints.sh\n.pi/\n" >> "$project_dir/.git/info/exclude"
    fi
  fi
  echo "ok: $project/.pi -> workspace root .pi"
done

echo "ok: workspace root .pi (use Pi from $ROOT)"
