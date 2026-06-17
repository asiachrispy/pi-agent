---
scope: agent-reading-map
owner: tech
status: current
read_when:
  - 任何 agent 需要判断该读哪些 wiki 文档
depends_on:
  - project-overview.md
  - project-map.md
---

# Agent 读取路由

本文是 `wiki/` 的**读取路由表**。**所有 /team 入口先读 `summary.md`**（快查表，≈3KB），再按本文选最小必要文档；避免一次性读完整 wiki。

## 总原则

1. **先读 `wiki/summary.md`**（快查表，决策树 + 关键命令 + 已知陷阱）
2. 再按本文按任务类型选最小必要文档
3. 只读必需文档；大文件按索引检索
4. `archive/` 只供人工追溯，agent 默认禁止读取
5. `raw/database/*.sql` 只按表名检索，不全文读取
6. 规则冲突时以更具体的业务规则为准；仍冲突则 blocked 并写明 `找谁`

## 读取路由表


| 任务类型 | 必读 | 按需读 | 禁止默认读 |
|---|---|---|---|
| 判断需求归属 | `project-overview.md`, `project-map.md` | `README.md`（本目录） | `archive/` |
| 普通实现（前端/后端） | `project-overview.md`, `project-map.md`, `validation-rules.md` | 领域规则文档、`api-contracts/` | `archive/`, SQL 全文 |
| 数据库字段确认 | `raw/database/table-index.md` | 按表名检索 `raw/database/*.sql` | SQL 全文 |
| QA 验收 | `workflow-usage.md`, `validation-rules.md` | demand 契约、PRD AC | `archive/` |
| 上线审计 | `workflow-usage.md`, `validation-rules.md`, `project-map.md` | `environments.md`, `runbooks/` | `archive/` |
| 产品需求 / PRD | `prd/README.md`, `prd/template.md`, `project-overview.md` | `prototypes/`, 历史 PRD | `archive/` |
| PRD 驱动开发 | 指定 PRD, `exec-specs/template.md`, `project-map.md`, `validation-rules.md` | 领域规则 | `archive/` |
| skill 使用 | `.pi/skills/shared-prd-template/SKILL.md` 等 | 见各 skill 说明 | `archive/` |
| 发版（`step: release`） | `.pi/protocols/release.md`, `wiki/decisions/team-decisions.md`, `validation-rules.md`, `AGENTS.md` | — | `archive/` |

## Source of truth

| 信息类型 | 权威来源 |
|---|---|
| 仓库 / 模块归属 | `project-map.md` + `workspace.config.yaml` |
| 业务与技术总览 | `project-overview.md` |
| 正式产品需求 | `wiki/prd/` |
| 任务执行状态 | `demands/D-*.md` |
| 个人待办 | `JTBD/<user>-jtbd.md` |
| 验证策略 | `validation-rules.md` |
| 环境脚本 | `environments.md`, `runbooks/` |

## 与 demand 的关系

- demand 的 `## 契约` 引用 wiki，不复制长期知识。
- agent 更新 demand 的 `## 交付` / `## 阻塞`，不代替 PRD。
