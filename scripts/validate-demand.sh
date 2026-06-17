#!/usr/bin/env bash
set -u

file="${1:-}"

if [[ -z "$file" || ! -f "$file" ]]; then
  printf 'error: usage: validate-demand.sh <demand.md>\n'
  exit 1
fi

python3 - "$file" <<'PY'
import os
import re
import sys

path = sys.argv[1]
text = open(path, encoding="utf-8").read()
name = os.path.basename(path)
is_template = name == "template.md"
errors = []


def fail(message):
    errors.append(message)


def clean_value(raw):
    value = raw.strip()
    quoted = re.match(r"""^(['"])(.*?)\1(?:\s+#.*)?$""", value)
    if quoted:
        return quoted.group(2).strip()
    if "#" in value:
        value = value.split("#", 1)[0].strip()
    return value.strip()


lines = text.splitlines()
frontmatter = {}

if not lines or lines[0].strip() != "---":
    fail("frontmatter missing opening ---")
else:
    end = None
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end = index
            break
    if end is None:
        fail("frontmatter missing closing ---")
    else:
        for line in lines[1:end]:
            match = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$", line)
            if match:
                frontmatter[match.group(1)] = clean_value(match.group(2))


def require_field(key):
    value = frontmatter.get(key, "")
    if value == "":
        fail(f"frontmatter missing {key}")
    return value


demand_id = require_field("id")
status = require_field("status")
step = require_field("step")
weight = require_field("weight")
outcome = frontmatter.get("outcome", "")
owner = frontmatter.get("owner", "")
assignee = frontmatter.get("assignee", "")

allowed_status = {"active", "blocked", "done"}
allowed_step = {"clarify", "build", "verify", "release"}
allowed_weight = {"light", "standard", "strict"}
allowed_outcome = {"", "delivered", "partial", "cancelled", "duplicate", "wont_do", "blocked"}

if is_template:
    if demand_id != "D-YYYY-NNN":
        fail("template id should be D-YYYY-NNN")
elif not re.match(r"^D-\d{4}-\d{3}$", demand_id):
    fail("id must match D-YYYY-NNN")

if status not in allowed_status:
    fail("invalid status; allowed: active|blocked|done")
if step not in allowed_step:
    fail("invalid step; allowed: clarify|build|verify|release")
if weight not in allowed_weight:
    fail("invalid weight; allowed: light|standard|strict")
if outcome not in allowed_outcome:
    fail("invalid outcome; allowed: delivered|partial|cancelled|duplicate|wont_do|blocked")

if not is_template and not owner:
    fail("owner is required and should be a real person/team owner")
if assignee == "team":
    fail("assignee must not be team; use a real person only when blocked, otherwise leave empty")
if status == "blocked" and not assignee:
    fail("blocked demand must have assignee")
if status == "done" and not is_template and not outcome:
    fail("done demand must have outcome")

if status == "blocked":
    if not re.search(r"^## 阻塞\s*$", text, re.MULTILINE):
        fail("blocked demand must have ## 阻塞 section")
    if "找谁" not in text:
        fail("blocked demand must mention 找谁")

if weight in {"standard", "strict"} and not re.search(r"^## 契约\s*$", text, re.MULTILINE):
    fail("standard/strict demand should have ## 契约")

workflow_headings = re.findall(r"^## workflow_update\s*$", text, re.MULTILINE)
if len(workflow_headings) > 1:
    fail("only one ## workflow_update section is allowed")
if status == "done" and not is_template and len(workflow_headings) == 0:
    fail("done demand must include one ## workflow_update section")

workflow_match = re.search(r"^## workflow_update\s*$(.*?)(?=^## |\Z)", text, re.MULTILINE | re.DOTALL)
if workflow_match:
    workflow_text = workflow_match.group(1)

    def workflow_value(key):
        match = re.search(rf"^\s+{re.escape(key)}:\s*(.+?)\s*$", workflow_text, re.MULTILINE)
        return clean_value(match.group(1)) if match else ""

    for key, expected in (("status", status), ("outcome", outcome), ("step", step), ("weight", weight)):
        actual = workflow_value(key)
        if actual and actual != expected:
            fail(f"workflow_update {key}={actual} does not match frontmatter {expected}")
        if key == "outcome" and status == "done" and not actual:
            fail("done demand workflow_update must include outcome")

    result = workflow_value("result")
    if status == "done" and result == "pending":
        fail("done demand cannot keep workflow_update verification.result: pending")

if errors:
    for message in errors:
        print(f"error: {message}")
    sys.exit(1)

print(f"ok: {path}")
PY
