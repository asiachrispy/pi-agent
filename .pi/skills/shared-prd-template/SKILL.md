---
name: shared-prd-template
description: PRD 模板与 frontmatter 校验工具。生成 / 校验 PRD 的 frontmatter、Definition of Ready、章节结构和命名规范。使用场景：/team 生成或更新 PRD、/team 读取 PRD 前的结构校验、/team 与 /team 校验 PRD 完整性。
---

# shared-prd-template

PRD 是产品-研发-QA-上线审计之间的唯一契约。本 skill 维护 PRD 模板、frontmatter 规范和章节结构。

## 适用场景

- `/team` 生成或更新 PRD 时，必须按本 skill 输出的模板写入。
- `/team`、`/team`、`/team` 读取 PRD 时，必须按本 skill 校验 frontmatter。
- 人工编写或 review PRD 时调用。

## PRD 命名规范

```text
wiki/prd/<domain>/REQ-YYYY-NNN-<slug>.md
```

`<domain>` 必须是以下之一：

```text
purchase
warehouse
inventory
logistics
product
supplier
finance
system
data-analysis
```

`<slug>` 使用小写连字符或中文简短描述，例如 `REQ-2026-001-采购订单批量审核.md`。

## PRD frontmatter 规范

PRD 必须以以下 frontmatter 开头：

```yaml
---
id: "REQ-YYYY-NNN"
title: "<需求标题>"
domain: "<domain>"
status: draft
ready_for_dev: false
affected_projects:
  - mk-web-business
  - mkerp
modules_touched:
  - mk-web-business:purchase-orders
  - mkerp:maike-erp-pms
risk: low
owner: ""
adr_refs: []
created_at: "YYYY-MM-DD"
updated_at: "YYYY-MM-DD"
---
```

字段含义：

| 字段 | 必填 | 含义 |
|---|---|---|
| `id` | 是 | REQ 编号，必须与文件名一致 |
| `title` | 是 | 需求标题 |
| `domain` | 是 | 业务域，参考上面的 domain 列表 |
| `status` | 是 | draft / review / ready / implemented / validated / shipped |
| `ready_for_dev` | 是 | true 表示 Definition of Ready 已满足 |
| `affected_projects` | 是 | 受影响项目列表，可包含 `mk-web-business`、`mk-web-logistics`、`mk-web-supplier`、`mkerp` |
| `risk` | 是 | low / medium / high |
| `owner` | 是 | 产品负责人，未确认时填空字符串 |
| `modules_touched` | 是 | 本次触及的模块，格式 `项目名:模块名`。不同于 `affected_projects`（仓库级），此字段描述仓库内的具体模块 |
| `adr_refs` | 否 | 本次触发的 ADR 编号列表，如 `["0001-batch-audit-idempotency"]`。无触发时填 `[]` |
| `created_at` | 是 | 创建日期 |
| `updated_at` | 是 | 最近更新日期 |

## 章节结构

PRD 必须包含以下章节，编号固定：

```text
0. Definition of Ready
1. 背景
2. 目标
3. 适用项目与领域语言
4. 用户角色
5. 业务流程
6. 功能范围
7. 交互说明 / 原型草图
8. 接口 / 数据要求
9. 验收标准（必须编号化 AC-001、AC-002）
10. 风险点
11. 相关文档
12. 待确认问题
```

### 第 3 章：适用项目与领域语言

除勾选适用项目外，必须列出本次需求涉及或引入的领域术语：

| 术语 | 含义 | 避免用 | 本次是否变更 |
|---|---|---|---|
| 采购单 | 采购员发起的内部采购请求单 | 采购订单、采购申请 | 是/否 |

术语变更时，必须同步更新 `wiki/project-overview.md` 的"领域语言"小节。

## ADR 触发条件

PRD 中任一条件满足时，必须在 `adr_refs` 中引用对应的架构决策记录：

1. 引入新的技术栈或中间件（如新 MQ、新缓存、新数据库类型）
2. 改变已有数据流向（如同步调用 → 异步消息）
3. 影响 ≥ 2 个 `maike-erp-*` 模块的接口契约变更
4. 引入新的权限模型或数据可见性规则
5. 替换核心框架库（如路由器、ORM、状态管理）

ADR 文件位于 `wiki/adr/0001-<slug>.md`，格式由 `shared-adr` skill 定义。

## 使用方式

### 在 /team 中使用

生成或更新 PRD 时，按本 skill 输出完整 frontmatter 和章节。命名规则：

- 检索 `wiki/prd/` 中所有 REQ 文件，取当年最大编号 +1。
- 如果无法可靠编号，使用 `REQ-YYYY-XXX-需求简称.md` 并在 `open_questions` 标注。

### 在 /team / /team / /team 中使用

读取 PRD 后必须校验：

1. frontmatter 完整且字段值合法。
2. 至少 3 条编号化 AC。
3. `affected_projects` 非空。
4. `risk` 为 low / medium / high 之一。

校验失败时输出 `prd_gaps` 并停止后续处理。

## 维护规则

- 本 skill 的更新必须同步更新 `wiki/prd/template.md`。
- 新增 domain 必须同步更新本 skill 的 domain 列表。