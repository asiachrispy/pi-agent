# pi-agent 企业研发自动化工作区设计方案

> **当前权威版**：v5.1  
> **修订日期**：2026-06-16  
> **详版备份**：`docs/pi-agent-design-v5.1.md`  
> **范围**：pi-agent 工作区如何用 Pi / Pi.app 支撑中小型企业 IT 产品研发团队的协同、自动化与可追溯交付

## Summary

pi-agent 面向中小型企业 IT 产品研发团队，目标是用 Pi / Pi.app 连接产品、开发、测试、运维，形成可版本化、可追溯、可自动化推进的软件研发工作流。

v5.1 的核心取舍：

- 一个 `/team` 命令驱动交付。
- 一个 demand 文件追踪任务。
- 一个 `wiki/` 承载长期知识。
- 一个 `JTBD/` 管个人待办。
- 自动化默认推进；远端发布、删数、生产配置等高风险动作必须人工确认。

本版已根据 D-2026-002 到 D-2026-005 的 `/team` 实测结果修订，实际入口以 `.pi/extensions/team-entry/index.ts`、`.pi/APPEND_SYSTEM.md`、`.pi/agents/team.md` 为准，不再使用 `.pi/prompts/team.md` 作为用户入口。

## Key Design

### 用户只面对四个对象

| 对象 | 用户理解 | 权威路径 |
|---|---|---|
| `/team` | 提需求、续跑、验证、发版的唯一入口 | `.pi/extensions/team-entry/index.ts` + `.pi/agents/team.md` |
| demand | 一条团队任务的状态、契约、交付记录 | `demands/D-YYYY-NNN*.md` |
| wiki | 长期知识库：仓库索引、PRD、原型、数据库、数据字典、环境、规则 | `wiki/` |
| JTBD | 每个人自己的待办和跟进事项 | `JTBD/<user>-jtbd.md` |

### MECE 信息分层

| 层 | 放什么 | 不放什么 |
|---|---|---|
| 知识层 `wiki/` | 长期复用知识、项目地图、PRD、原型、数据库、数据字典、接口、环境、制度 | 单次任务流水账 |
| 工作项层 `demands/` | 任务状态、契约、交付摘要、验证、阻塞、批准、workflow_update | 长期规范全文 |
| 执行层 `.pi/` + `scripts/` | `/team` 协议、扩展入口、校验、快照、blocked digest | 业务知识正文 |
| 个人层 `JTBD/` | 个人待办、阻塞跟进、站会视角 | 团队交付事实的唯一来源 |

这个分层满足 MECE：知识、任务、执行协议、个人行动各有单一归属，互不替代。

### 系统性闭环

1. 用户通过 `/team` 表达目标。
2. team 读 `wiki/summary.md` 和最小必要 wiki。
3. team 创建或续跑 demand。
4. team 改代码、跑验证、写交付记录。
5. 需要人时转 `blocked`，明确 `owner` / `assignee` / 找谁 / 要做什么。
6. 完成后写 `workflow_update`，JTBD 扩展同步个人待办。
7. Pi.app 后续读取这些文件形成看板、待确认、发版状态，而不是另建一套源数据。

## Workflow

### `/team` 执行流

```text
用户输入 /team ...
  -> team-entry 注册命令，只把短命令送入会话
  -> APPEND_SYSTEM 引导到 .pi/agents/team.md
  -> team 读取 wiki/summary.md
  -> 按 wiki/agent-reading-map.md 选择最小文档集合
  -> 创建/续跑 demand
  -> clarify/build/verify/release
  -> 写交付、阻塞或完成状态
  -> 输出 workflow_update + JTBD-UPDATE
```

### 状态与步骤

| 字段 | 枚举 | 说明 |
|---|---|---|
| `status` | `active` / `blocked` / `done` | 当前任务状态 |
| `step` | `clarify` / `build` / `verify` / `release` | 当前阶段 |
| `weight` | `light` / `standard` / `strict` | 流程严格程度 |
| `outcome` | `delivered` / `partial` / `cancelled` / `duplicate` / `wont_do` / `blocked` | done 时的短结果 |

`outcome` 不写长总结。长总结放在 `## 交付`，便于 Pi.app 和脚本稳定解析。

### 责任字段

| 字段 | 规则 |
|---|---|
| `owner` | 必填，写真人或团队负责人，用于责任归属和看板过滤 |
| `assignee` | 仅 `blocked` 时必填真人；非阻塞默认空 |
| 禁止值 | `assignee: team`，因为它不能驱动个人待办和阻塞升级 |

## Public Interfaces

| 接口 | 消费方 | 规则 |
|---|---|---|
| `demands/template.md` | `/team`、Pi.app、校验脚本 | 所有 demand 继承该 frontmatter |
| `demands/D-*.md` | 团队、Pi.app、JTBD sync | 单个任务的权威记录 |
| `wiki/summary.md` | `/team` | 每次先读的快查表 |
| `wiki/agent-reading-map.md` | `/team` | 决定增量读取哪些 wiki |
| `.pi/agents/team.md` | Pi agent runtime | `/team` 的完整行为协议 |
| `.pi/protocols/release.md` | release 流程 | 发版自动化与人工确认边界 |
| `scripts/validate-demand.sh` | 人和 CI | demand 协议校验 |

每个 demand 至少包含：

- frontmatter：`id/title/weight/status/outcome/step/owner/assignee/project/repos/risk`
- `## 意图`
- `## 契约`：`standard` / `strict` 必填
- `## 交付`
- `## 阻塞`
- `## 批准`
- 最多一个 `## workflow_update`

## Automation Rules

### 默认自动

| 场景 | 自动动作 |
|---|---|
| 新建需求 | `scripts/next-demand-id.sh` 取号，复制 `demands/template.md` |
| 读取知识 | 先 summary，再 reading map，避免全文读 wiki |
| 普通验证 | 按 `wiki/validation-rules.md` 跑最小充分验证 |
| demand 校验 | `scripts/validate-demand.sh demands/D-xxx.md` |
| blocked 汇总 | `scripts/blocked-digest.sh` |
| 发版本地产物 | `npm run package:macos`、DMG、冷烟默认自动 |

### 默认需要人工确认

| 场景 | 原因 |
|---|---|
| `git push origin main` | 远端主线不可逆影响 |
| `git push origin <tag>` | tag 一旦推送会形成长期引用 |
| `gh release create` | 公开 release 影响用户获取路径 |
| merge upstream 有冲突 | 冲突解决策略影响产物正确性 |
| 删除数据 / 改生产配置 / 生产部署 | 高风险，不允许静默执行 |

### 校验脚本硬规则

`scripts/validate-demand.sh` 应阻止：

- `status/step/weight/outcome` 非枚举值。
- done demand 没有 `outcome`。
- 非模板 demand 没有 `owner`。
- `assignee: team`。
- blocked demand 没有 `assignee` 或 `## 阻塞` 找谁。
- `workflow_update` 超过一个。
- `workflow_update.status/outcome/step/weight` 与 frontmatter 不一致。
- done demand 的 `verification.result` 仍为 `pending`。

## Implementation Phases

### Phase 1：协议收敛（已落地）

- `/team` 入口统一为 extension + agent protocol。
- `summary.md` 作为唯一第一跳。
- release protocol 纠正打包确认边界。
- demand template 明确 owner/outcome/assignee 语义。
- validate-demand 增强为协议校验。

### Phase 2：Pi.app 工作台

- 读取 `demands/D-*.md` 展示团队任务列表。
- 支持按 `owner/status/step/project/risk` 过滤。
- 展示 blocked 待确认队列。
- 展示 release scope、手工步骤、冷烟结果。

### Phase 3：知识库治理

- 补齐 `wiki/project-map.md`、`wiki/prd/`、`wiki/prototypes/`、`wiki/data-dictionary/` 的企业模板。
- 让 PRD、原型、数据字典只在 wiki 长期维护，demand 仅引用。
- 增加 wiki lint，检查断链、空壳文档、过期 owner。

### Phase 4：自动化升级

- 将 `validate-demand.sh` 接入 pre-commit 或 CI。
- 增加 `scripts/validate-wiki.sh`。
- 增加 release dry-run 汇总。
- 修复 subagent 渲染层问题后，把 planner / QA / ship-checklist 隔离到 L2 agent。

## Test Plan

| 类型 | 命令 | 期望 |
|---|---|---|
| demand 模板 | `bash scripts/validate-demand.sh demands/template.md` | pass |
| 已完成 demand | `bash scripts/validate-demand.sh demands/D-2026-002.md` 等 | pass |
| 重复 workflow_update | 构造两个 `## workflow_update` | fail |
| done + pending | done demand 的 result 写 pending | fail |
| assignee team | `assignee: team` | fail |
| release protocol | 搜索第 7 步确认规则 | package 默认不要求确认 |
| reading map | 搜索路由表重复 summary | 只在总原则保留 summary |

## Assumptions

- 当前工作区只把 `pi` 和 `pi-app` 作为核心工程仓；`pi-web` 已移除，不再维护。
- 业务仓库可以继续放在 pi-agent 根目录下，但作为独立 Git 仓库由 `.gitignore` 忽略。
- `owner` 暂以现有团队/用户标识维护；后续可接入企业成员目录。
- Pi.app 后续只读 Git 文件形成工作台，不新建独立数据库作为任务真源。
- release 远端发布动作仍需人工授权；本地打包、DMG、冷烟属于可自动执行的验证/产物步骤。
