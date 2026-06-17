---
name: ship-checklist
description: 发版前审计清单。检查 diff 范围、测试、迁移、环境、回滚。使用场景：/team D-xxx 发版前检查、step release、合并主分支前。
---

# ship-checklist

`/team` 在 `step: release` 或用户说「发版」「上线」「合并主分支」时调用本 skill。

## 输入

- demand 文件与 `prd_ref`
- git diff / 改动仓库列表
- `wiki/environments.md`、`wiki/runbooks/`（若有）
- 开发阶段 `tests_run` / `tests_result`

## 必查项

1. git diff 是否在 demand / PRD 范围内（`prd_scope_match`）。
2. 测试、lint、build 是否充分（对照 `validation-rules.md`）。
3. 数据库迁移：有无、是否可回滚。
4. 环境变量 / 配置变更是否登记在 `wiki/environments.md`。
5. 破坏性 API 是否标注、是否有兼容策略。
6. 回滚方案是否可执行（`wiki/runbooks/` 或交付节说明）。
7. 是否存在未验证项或 open blocking。

## 输出格式

```text
ship_ready: true|false
required_checks:
passed_checks:
blocking_risks:
manual_steps:
prd_ref:
prd_scope_match: yes|no|partial
prd_scope_gaps:
```

## ship_ready: false 时

- `status: blocked` 或保持 `active` + `step: release`，写明 `## 阻塞`。
- 不执行生产部署脚本；仅列出 `manual_steps`。
