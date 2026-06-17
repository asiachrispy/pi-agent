---
id: D-YYYY-NNN
title: ""
weight: light
status: active
outcome: "" # done 时必填短值：delivered|partial|cancelled|duplicate|wont_do|blocked
step: clarify
owner: "" # 必填：真人或团队负责人
assignee: "" # 仅 blocked 时必填真人；不要填 team
project: ""
repos: []
risk: low
prd_ref: ""
prototype_ref: ""
exec_spec_ref: ""
# === release / release-adjacent metadata (D-2026-004 起) ===
# 默认全 false。team 读这些字段自动决定是否走对应流程，不再问。
requires_release: false
requires_upstream_sync: false
requires_gh_release: false
cold_smoke_required: true
visual_qa_required: false
# 发版授权范围（仅 step: release 时生效）：
#   ["commit","verify","version","push","tag","package","dmg","cold_smoke","gh_release"]
# 用户在 /team D-xxx release 时显式给出；team 按此范围执行，避免中途反复确认。
release_scope: []
created_at: ""
updated_at: ""
---

# D-YYYY-NNN 需求标题

## 意图

用户原始意图、澄清结论、业务背景。

## 契约

`weight` 为 `standard` 或 `strict` 时必填：范围、不做范围、AC、风险、关联 PRD/原型/接口/数据。

## 交付

实现摘要、改动仓库、验证命令、结果、AC 覆盖、未验证项、既有阻断。

## 阻塞

`status: blocked` 时必填：

```markdown
- 原因：
- 找谁：
- 你要做什么：
- 续做：/team D-YYYY-NNN
- 自：YYYY-MM-DDTHH:MM:SS+08:00
- 已升级：false
```

非 `blocked` demand 默认保持 `assignee: ""`，避免把执行责任模糊地挂给 `team`。

## 批准

人工批准记录：时间、批准人、事项。
