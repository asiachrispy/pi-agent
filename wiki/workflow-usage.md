---
scope: workflow-usage
owner: tech
status: current
---

# 工作流使用说明

## 用户面（只记一条）

```text
/team <意图 或 D-YYYY-NNN>
```

- 三态：`active` | `blocked` | `done`
- 四步：`clarify` | `build` | `verify` | `release`
- 重量：`light` | `standard` | `strict`
- 结果：`done` 时 `outcome` 必填短值，不写长句
- 责任：`owner` 必填；`assignee` 仅 blocked 时填真人，不写 `team`

## demand 文件

- 路径：`demands/D-YYYY-NNN-标题.md`
- 模板：`demands/template.md`
- 新 id：`bash scripts/next-demand-id.sh`

## workflow_update 块

agent 最终输出应包含（供扩展或人工读取）：

```yaml
workflow_update:
  demand: D-2026-001
  status: active|blocked|done
  outcome: delivered|partial|cancelled|duplicate|wont_do|blocked
  step: clarify|build|verify|release
  weight: light|standard|strict
  owner: "real-person-or-team-owner"
  assignee: "" # blocked 时填真人
  handoff: ""
  blocking_reason: ""
  verification:
    scope: targeted|module|full|env-dependent
    commands: []
    result: pass|fail|partial|not_run
  next_action: ""
  human_confirmation_required: true|false
```

首版由 `/team` 根据此块更新 demand 正文与 frontmatter。每个 demand 最多一个 `## workflow_update`，frontmatter 的 `status/step/weight` 必须与块内一致。

## 阻塞

`status: blocked` 时 `assignee`、`## 阻塞` 必填，`找谁` 为真人。续跑：`/team D-xxx` 或 demand `## 批准` 后续跑。

站会：`bash scripts/blocked-digest.sh`

## JTBD

个人待办：`JTBD/<git-user>-jtbd.md`；汇总：`JTBD/index.md`（`sync-jtbd-index.sh`）。

## 自动化层级（v5）

- L1：会话内 Pi agent loop（Phase 1）
- L2：demand + `workflow_update` 持久化（Phase 1）
- L3：`workflow-sync` 跨会话（Phase 4+，默认关闭）

不依赖 workflow `goal` / `loop` skill。
