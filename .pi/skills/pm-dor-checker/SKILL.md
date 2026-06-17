---
name: pm-dor-checker
description: Definition of Ready 门禁检查。校验 PRD 是否满足交给研发的条件。使用场景：/team 生成或更新 PRD 后、/team 接到 PRD 后、/team 与 /team 审计 PRD 时。
---

# pm-dor-checker

PRD 是否可以交给研发，由 Definition of Ready（DoR）门禁决定。本 skill 是一份可执行清单，用于：

1. `/team` 自检刚生成或更新的 PRD。
2. `/team` 在开发前再次校验，避免基于不完整 PRD 开工。
3. `/team`、`/team` 审计 PRD 完整性。

## DoR 10 项硬清单

PRD 必须全部满足以下 10 项才能进入 `ready_for_dev: true`：

1. frontmatter 完整，字段值合法（参考 `shared-prd-template`）。
2. `status: ready` 或接近 ready，`ready_for_dev: true`。
3. 第 1 章背景清楚，说明业务问题和触发来源。
4. 第 2 章目标 + 不做范围明确。
5. 第 3 章适用项目明确，至少 1 项；领域语言表至少 1 行（新需求必须，小修改可填"本次无变更"）。
6. 第 4 章用户角色明确，至少 1 行表格。
7. 第 5 章业务流程至少 3 步，且包含异常流程。
8. 第 8 章接口 / 数据要求明确，或显式标注"待研发确认"。
9. 第 9 章 AC 至少 3 条，且至少 1 条反向用例（参考 `shared-ac-patterns`，包括行为级自检清单）。
10. 第 10 章风险点至少 3 条，覆盖权限 / 数据一致性 / 发布回滚之一。

### 扩展项（不改变 10 项编号）

以下 2 项必须同时满足：

- **X-1 modules_touched**：frontmatter `modules_touched` 非空，且每项与 `affected_projects` 中的项目一致（所属仓库必须在 `affected_projects` 中）。
- **X-2 ADR 存在性**：如果 PRD 满足 ADR 触发条件（参考 `shared-prd-template`），则 frontmatter `adr_refs` 必须非空且引用文件存在。未触发时填 `[]` 视为通过。

## 输出格式

```text
dor_result: pass/fail
missing_items:
  - "<第 N 章 / 第 N 项 / 扩展项 X-1/X-2 未满足的原因>"
warnings:
  - "<非阻断但建议补强项>"
recommendation: "<建议下一步>"
```

## fail 时的处理（补充）

扩展项 X-1、X-2 任一 fail 等同于 10 项内 fail，`ready_for_dev` 必须为 `false`。

`/team` 收到 `dor_result: fail` 时：

1. 不要把 `ready_for_dev` 设为 `true`。
2. 在 `prd_path` 的 frontmatter 中保持 `ready_for_dev: false`。
3. 把 `missing_items` 写入 PRD 第 12 章"待确认问题"。
4. 不调用 `/team`，只输出 PRD 路径和待确认问题。

`/team` 收到 `dor_result: fail` 时：

1. 输出 `prd_gaps`，列出具体缺失项。
2. 不要擅自补需求，停止实现并请求产品确认。

## pass 但带 warning 时的处理

`/team` 可以选择：

1. 直接设 `ready_for_dev: true` 并接力 `/team`，warning 项写到 PRD 第 12 章。
2. 继续补充 PRD 直到无 warning，再接力。

## 使用方式

### /team 调用

```text
/skill:pm-dor-checker <prd_path>
```

要求输出 `dor_result`、`missing_items`、`warnings`、`recommendation`。

### /team 调用

```text
/skill:pm-dor-checker <prd_path>
```

如果 fail，输出 `prd_gaps` 并停止。

### /team 调用

```text
/skill:pm-dor-checker <prd_path>
```

如果 fail，在 `blocking_issues` 中标注"PRD 未通过 DoR"。

### /team 调用

```text
/skill:pm-dor-checker <prd_path>
```

如果 fail，`ship_ready` 必须为 `false`，`blocking_risks` 标注"PRD 未通过 DoR"。

## 维护规则

- DoR 10 项清单是硬规则，修改需要团队 review。
- 扩展项 X-1、X-2 可独立调整，不改变 10 项编号。
- DoR 清单变动必须同步更新本文档和 `wiki/prd/template.md`。