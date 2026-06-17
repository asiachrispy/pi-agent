#!/usr/bin/env python3
"""scripts/_snapshot_block.py — 替换 wiki/summary.md 中 snapshot 块。"""
import sys, pathlib, subprocess
from datetime import datetime

if len(sys.argv) < 2:
    print("usage: _snapshot_block.py <summary.md path>", file=sys.stderr)
    sys.exit(1)

path = pathlib.Path(sys.argv[1])
text = path.read_text()

start, end = ">>>SNAPSHOT_START<<<", ">>>SNAPSHOT_END<<<"
i = text.index(start)
j = text.index(end, i) + len(end)

def git_cwd(cwd, *args, default="n/a"):
    try:
        out = subprocess.check_output(["git", "-C", cwd, *args], stderr=subprocess.DEVNULL).decode().strip()
        return out if out else default
    except Exception:
        return default

now = datetime.now().strftime("%Y-%m-%d %H:%M:%S %z")

def row(field, p, a):
    return f"| {field} | `{p}` | `{a}` |"

rows = [
    row("当前 HEAD",       git_cwd("pi", "rev-parse", "--short", "HEAD"),           git_cwd("pi-app", "rev-parse", "--short", "HEAD")),
    row("当前分支",        git_cwd("pi", "branch", "--show-current"),                git_cwd("pi-app", "branch", "--show-current")),
    row("最新 tag",        git_cwd("pi", "describe", "--tags", "--abbrev=0"),         git_cwd("pi-app", "describe", "--tags", "--abbrev=0")),
    row("upstream/main",   git_cwd("pi", "rev-parse", "--short", "upstream/main", default="n/a (无 upstream)"),
                            git_cwd("pi-app", "rev-parse", "--short", "upstream/main", default="n/a (无 upstream)")),
]

new_block = (
    f"{start}\n"
    f"> 自动生成于 {now}。手工编辑此段会被下次运行覆盖。\n\n"
    "| 字段 | pi | pi-app |\n"
    "|---|---|---|\n"
    + "\n".join(rows) + "\n"
    f"{end}"
)

path.write_text(text[:i] + new_block + text[j:])
print(f"OK: {path} snapshot block updated")
