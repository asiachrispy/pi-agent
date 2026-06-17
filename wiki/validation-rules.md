---
scope: validation-rules
owner: tech
status: current
---

# 验证规则

> agent 只执行本节登记的命令。合并/打包/发布前还须满足根目录 `AGENTS.md` 上游同步约定。

## 原则

1. 改动范围 → 最小充分验证（targeted / module / full）。
2. 失败则修复；同一问题 3 次仍失败 → demand `blocked`。
3. 结果写入 demand `## 交付` 与 `workflow_update.verification`。
4. 结束前运行 `scripts/validate-demand.sh`，确保 frontmatter、责任人、`workflow_update` 一致。

## 工作区自检

```bash
bash scripts/check-pi-env.sh
bash scripts/validate-demand.sh demands/template.md
bash scripts/validate-demand.sh demands/D-YYYY-NNN.md
```

## pi（引擎）

在 `pi/` 目录执行：

| 范围 | 命令 | 说明 |
|---|---|---|
| 类型检查（推荐） | `npm run check` | 含 biome、tsgo、边界检查等 |
| 仅类型 | `npx tsgo --noEmit`（或仓库约定） | 快速类型门禁 |
| 单测 | `npm test` | workspaces 测试 |
| 单包 | `npm test -w @earendil-works/pi-coding-agent` | 按需缩小范围 |

引擎改动涉及发布时：按 `pi/README` 与 `AGENTS.md` 先 `git fetch upstream && git merge upstream/main`。

## pi-app（Web + 桌面）

在 `pi-app/` 目录执行：

| 范围 | 命令 | 说明 |
|---|---|---|
| 类型 | `npx tsc --noEmit` | 合并/打包前必跑 |
| 单测 | `npx vitest run` | 合并/打包前必跑 |
| Swift | `swift build`、`swift test` | macOS 壳改动时 |
| 构建 | `npm run build` | 发版路径 |
| 打包 | `npm run package:macos` | **仅** upstream 同步且验证全绿后 |
| Lint | `npm run lint` | 按需 |

冷烟（打包后）：bundle 内嵌 Node 跑 `server.js`，确认 `/`、`/api/health`、`/api/sessions` 均 200。

## 跨仓改动

1. 先验证 `pi` 侧（若动引擎 API/协议）。
2. 再验证 `pi-app`（`tsc` + `vitest`；涉及壳则 `swift test`）。
3. demand `## 交付` 分列两仓命令与结果。

## strict 附加项

- `/skill:qa-checklist` 对照 AC
- `/skill:ship-checklist` 发版前（含 upstream 同步、迁移、回滚）

## 禁止

- 未在 `environments.md` / `runbooks/` 登记的生产运维命令
- 落后 upstream 直接 `package:macos` 或发 Release
- 全量无关格式化（除非用户明确要求）
