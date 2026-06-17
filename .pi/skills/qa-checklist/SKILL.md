---
name: qa-checklist
description: 测试验收清单。对照 PRD/AC 与 demand 契约做 verify。使用场景：/team 验收 D-xxx、strict 需求 verify 步骤、needs_qa 为 true 时内部复核。
---

# qa-checklist

`/team` 在 `step: verify` 或用户说「验收」时调用本 skill。

## 输入

- `demands/D-*.md`（契约、交付节）
- `wiki/prd/` 中 `prd_ref` 指向的 PRD（若有）
- `wiki/validation-rules.md`
- 业务仓 git diff（由 agent 代查）

## 检查项

1. demand `weight` 与验证深度匹配（strict 须逐条 AC）。
2. PRD `ready_for_dev: true` 且 DoR 已通过（若有 prd_ref）。
3. 每条 AC 编号可映射到实现或测试证据。
4. 权限、金额、库存、状态机等高风险点有反向用例。
5. `validation-rules.md` 中要求的命令已执行且结果可引用。
6. 未验证项写入 `## 交付` 的「未验证项」小节。

## 输出格式

```text
qa_result: pass|fail|blocked
covered_cases:
risk_cases:
blocking_issues:
suggested_fixes:
prd_ref:
prd_ac_passed:
prd_ac_failed:
```

## fail / blocked 时

- 更新 demand `status: blocked`，填写 `## 阻塞`，`找谁` 为开发 owner 或产品 owner（按问题类型）。
- 在 `## 交付` 追加「验收记录」表格。
- 输出 `workflow_update`，`step: verify`，`human_confirmation_required` 按是否需要人工确认。
