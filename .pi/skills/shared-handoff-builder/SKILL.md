---
name: shared-handoff-builder
description: PRD → 研发任务的桥接器。生成 `/team` 可直接消费的任务字符串。使用场景：/team 在 PRD ready 后生成 dev_task、/team 解析 dev_task。
---

# shared-handoff-builder

PRD 通过 DoR 后，需要打包成 `/team` 可消费的 dev_task。本 skill 定义打包格式与解析规则。

## dev_task 结构

dev_task 是给 `/team` 的字符串，必须包含以下字段：

```text
prd_ref: <PRD 路径>
affected_projects: <项目列表>
acceptance_criteria_summary:
  - AC-001: <一句话描述>
  - AC-002: <一句话描述>
  ...
risks:
  - <风险点 1>
  - <风险点 2>
dor_result: pass
context: <可选，产品补充的上下文>
```

## 生成规则

### 1. prd_ref

必须是 `wiki/prd/<domain>/REQ-YYYY-NNN-需求简称.md`。

### 2. affected_projects

取自 PRD frontmatter `affected_projects`，必须非空。

### 3. acceptance_criteria_summary

取自 PRD 第 9 章 AC 列表，每条 AC 转成一行：

```text
- AC-001: 给定采购主管选择 1-50 条待审核采购单，当点击批量审核，则批量审核成功并提示。
- AC-002: 给定选择 51 条，当点击批量审核，则提示"单次最多支持 50 条"。
```

最多列前 10 条 AC；超过 10 条时在末尾追加 `- ... 等 N 条` 并指明完整 PRD 路径。

### 4. risks

取自 PRD 第 10 章风险点列表。

### 5. dor_result

必须为 `pass`，否则不生成 dev_task。

## 完整 dev_task 示例

```text
prd_ref: wiki/prd/purchase/REQ-2026-001-采购订单批量审核.md
affected_projects: mk-web-business, mkerp
acceptance_criteria_summary:
  - AC-001: 给定采购主管选择 1-50 条待审核采购单，当点击批量审核，则批量审核成功。
  - AC-002: 给定选择超过 50 条，当点击批量审核，则提示"单次最多支持 50 条"。
  - AC-003: 给定采购员（非采购主管），当尝试批量审核，则提示"无操作权限"。
  - AC-004: 给定后端接口超时，当重试，则按幂等规则保证不重复审核。
  - ... 等 4 条
risks:
  - 状态流转一致性（已审核后回滚）
  - 权限校验（前端按钮权限 + 后端接口权限双重校验）
  - 接口幂等（重复提交防重）
dor_result: pass
context: 业务端采购订单列表增加"批量审核"按钮，要求 1.5 秒内响应。
```

## 在各 agent 中的使用

| agent | 使用方式 |
|---|---|
| `/team` | DoR 通过后调用本 skill 生成 dev_task |
| `/team` | 接收 task 时解析 dev_task，提取 `prd_ref` 并优先读取 PRD |
| `/team` | 用 `prd_ref` 反查 PRD，对照 AC 验收 |
| `/team` | 用 `prd_ref` 反查 PRD，审计实现范围 |

## 维护规则

- dev_task 字段变动必须同步更新本文档和 `/team` 输出规范。
- 新增字段时保持向后兼容，旧字段必须保留。