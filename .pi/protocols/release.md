---
scope: release-protocol
owner: tech
status: current
read_when:
  - team `step: release` 时
  - 用户说「发版」/「release」/「合并主分支」/「打 tag」
  - demand frontmatter `requires_release: true` 时
---

# Release Protocol (Standard)

> 9 步模板 + human_confirmation_required 节点 + 自动化决策点。
> 触发条件：`step: release` 或 `requires_release: true` 或用户显式说发版。

## 触发判定

| 信号 | 进入 release 流程 |
|---|---|
| `/team D-xxx release` | ✅ |
| `/team D-xxx` 且 `step: release` | ✅ |
| demand frontmatter `requires_release: true` | ✅ |
| 用户在 message 里说「发版」/「release」/「合并主分支」/「打 tag」 | ✅ |

## 9 步标准流程

| # | 步骤 | human_confirmation | 自动化内容 |
|---|---|---|---|
| 1 | 拆 commit（按 demand 边界；与同 release 的其他 demand 拆开） | ❌ | 串行执行（避免 index.lock 冲突）；commit message 含 `Ref: D-xxx` |
| 2 | tsc + vitest + （若 pi-app 改 macos/）swift build/test | ❌ | 全量；不通过则 blocked |
| 3 | `npm version patch --no-git-tag-version` | ❌ | 自动 |
| 4 | `chore(release): vX.Y.Z` commit | ❌ | 串行 |
| 5 | `git push origin main` | ✅ **必需** | — |
| 6 | `git tag vX.Y.Z` + `git push origin vX.Y.Z` | ✅ **必需** | — |
| 7 | `npm run package:macos` | ❌ | 自动（验证通过后执行；若写入生产路径或覆盖已安装 App，另行确认） |
| 8 | `hdiutil create -format UDZO` + 冷烟（动态端口） | ❌ | 体积基线 Pi.app ≤ 224M ± 5% / DMG ≈ 93M；冷烟 3 端点 200 |
| 9 | `gh release create vX.Y.Z` + 根 `CHANGELOG.md` | ✅ **必需** | — |

**3 步需 human_confirmation**（5/6/9 = push / tag / gh-release）。**1-4, 7-8 完全自动化**（基于 `validation-rules.md` 与本协议）。

## `release_scope` 字段（demand frontmatter）

用户在 `/team D-xxx release` 时可以显式给出 `release_scope` 子集，让 team 跳过未列出的步骤。例如：

```yaml
release_scope: ["commit","verify","version","push","tag","package","dmg","cold_smoke"]
```

→ 跳过 gh_release（用户说"今天只发到 origin + DMG，不上 GitHub Release"）。

合法值（按步骤 #）：
- `commit`, `verify`, `version`, `push`, `tag`, `package`, `dmg`, `cold_smoke`, `gh_release`

未列出的步骤标 `skipped: <reason>`；scope 决定是否在 release 序列里执行该步。

## 自动化决策点

> 这些**完全自动**，team 不询问：

| 触发条件 | 动作 |
|---|---|
| `weight: light` | 跳过 `qa-checklist` / `ship-checklist` 模板，只跑 `verify` + `cold_smoke` |
| `merge-base(HEAD, upstream/main) == upstream/main HEAD` | **不 merge** |
| `git fetch upstream` 失败 | 记 `blocking_reason: network/github.com:443 不通`；不擅自换协议（ssh vs https） |
| 冷烟端口冲突 | 默认用 `PORT=30142`（不抢正式端口 30141），冲突时 `PORT += 1` 最多 5 次 |
| 拆 commit 数 ≥ 2 | 串行执行 |
| 同一 release 有多个 demand | 每个 demand 单独 commit，commit message 标 `Ref: D-xxx` |
| DMG 体积超基线 + 20% | 警告 + blocked（让用户决策是否继续） |

## human_confirmation_required 节点

| 节点 | 必确认原因 |
|---|---|
| `git push origin main` | 不可逆；推错会污染 origin/main |
| `git push origin <tag>` | 不可逆；tag 一旦推送，引用关系持久 |
| `gh release create` | 不可逆；公开 release 不可删除（只能 unpublish） |
| `npm run package:macos` 写入工作区外路径或覆盖本机已安装 App | 可能影响用户本机应用状态；默认写 `dist/macos/Pi.app` 时不需要确认 |
| 发版前 `merge upstream/main`（有冲突时） | 冲突解决策略影响产物正确性 |
| 删除数据 / 改生产配置 | 一律 `human_confirmation_required: true` |

**授权模式**：
- 用户在 `/team D-xxx release` 时**显式给 `release_scope`** → 视为一次性授权 scope 内所有节点
- 未给 `release_scope` → 走默认 9 步 + 逐项 confirm
- 用户说「选 2」/「选 X」等 → 按用户消息授权（**team 应识别**）

## 失败模式

| 失败 | 处理 |
|---|---|
| 步骤 1-4 失败 | 改代码 / 改 demand，重新跑该步；不上跳 |
| 步骤 5 push 失败（网络） | 记 blocking，跳过 6/9；DMG 仍可本地做；用户网络恢复后补 5/6/9 |
| 步骤 7 package:macos 失败 | 改 package.json / next.config.ts，重跑；不上跳 |
| 步骤 8 冷烟某端点非 200 | blocked；改 server.js 或路由，重跑 |
| 步骤 9 gh release 失败 | 记 blocking；产物（DMG、tag）已就绪，用户网络恢复后补 |

## 复盘（按 demand 写入）

每个 release demand 的 `## 交付` 段应记录：
- 实际跑的步骤（含跳过的 + 原因）
- 各步命令 + 结果
- 冷烟端点状态码 + body 关键字段
- DMG 体积
- 剩余手工步骤（push / tag / gh release）显式列出

## 关联文档

- `wiki/summary.md` —— 决策树与命令速查
- `wiki/validation-rules.md` —— 验证门禁
- `wiki/decisions/team-decisions.md` —— 决策表
- `AGENTS.md` —— 强制 upstream 同步、cold smoke 基线
