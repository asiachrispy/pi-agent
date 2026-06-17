---
scope: team-decisions
owner: tech
status: current
read_when:
  - /team 遇到决策点
  - team 自动判断（weight / 越界 / upstream / 端口 / commit 串并行 / etc.）时
---

# Team 决策表

> 所有"反复出现"的决策点都在这里。team 读这张表决定如何处理，**不再询问用户**（除非是真正需要人判断的事项）。

## 1. weight 判定

| weight | 触发条件 | 跑什么 |
|---|---|---|
| `light` | 文案、样式、单点 bug、配置小改、字段重命名、纯 UI | `npx tsc --noEmit`（如果改动跨文件）+ `npx vitest run`；跳过 `qa-checklist` / `ship-checklist` 模板 |
| `standard` | 功能需求、需 AC、单仓主路径、API/数据层改动 | tsc + vitest + `/skill:qa-checklist` |
| `strict` | 权限、金额、库存、财务、跨仓、库表、发版 | tsc + vitest + `/skill:qa-checklist` + `/skill:ship-checklist` + 真人签批 |

升格条件：单点改动涉金额/权限/状态机/跨仓/库表 → 升 strict；其他保持。

## 2. 越界 diff（`git status` 出现不在当前 demand 范围的文件）

| 情况 | 决策 |
|---|---|
| 工作区出现 1+ 文件不在当前 demand 范围 | **A1（默认）**：开新 demand 拆出，与当前 demand 独立发版 |
| 同 release 序列多个 demand 共享工作区 | 每个 demand 单独 commit，commit message 标 `Ref: D-xxx` |
| 用户显式说"全部合一起" | A2：合并到当前 demand 范围（修改 demand `## 契约` 段） |
| 用户显式说"先 stash" | A3：`git stash` 暂存，发完当前 demand 再恢复 |

**不询问**：A1 是默认，team 自决；A2/A3 需用户显式触发。

## 3. upstream 同步

| 情况 | 决策 |
|---|---|
| `merge-base(HEAD, upstream/main) == upstream/main HEAD` | **不 merge**（本地 = upstream 的最远祖先 + 本地领先） |
| `merge-base(HEAD, upstream/main) != upstream/main HEAD` 且 upstream 领先 | 走 `git fetch upstream && git merge upstream/main`；冲突时 human_confirmation |
| `git fetch upstream` 失败 | 记 `blocking_reason: network`；不擅自切 ssh/https |
| 仓库 `git remote -v` 没 upstream | 走 B2（不要求 upstream 同步）；更新 `wiki/summary.md` 标注 `n/a (无 upstream)` |
| 仓库有 upstream | 走 B1：`git remote add upstream <URL>` 后按 B1 路径 |

**B1 / B2 选择**：用户显式给 URL → B1；用户说"无上游" → B2；默认按 `workspace.config.yaml` 实际配置。

## 4. 冷烟端口

| 情况 | 决策 |
|---|---|
| 冷烟默认端口 | **PORT=30142**（30141 是本地正式端口，不抢占） |
| 30142 被占 | `PORT += 1`，最多 5 次（30143→30147） |
| 5 次都占 | blocked，让用户决定是否杀进程 |
| 冷烟某端点非 200 | blocked；端点路径记入 demand `## 交付` |

**不杀用户进程**：冷烟只测自己启的 server.js；不碰 `/Applications/Pi.app` 等用户实例。

## 5. 拆 commit

| 数量 | 决策 |
|---|---|
| 1 commit | 直接 `git add . && git commit` |
| ≥ 2 commit | **串行**：每个 commit 用 `git add <files> && git commit`；不要并行 |
| commit 失败（lock 竞争） | `rm .git/index.lock` + reset + 重做（不要 amend） |
| commit 信息 | 必须含 `Ref: D-xxx`；中文 / 英文皆可，但保持仓库约定 |

**核心教训**：并发 `git add`/`git commit` 触发 `index.lock` 冲突 + 误合并；务必串行。

## 6. package-lock.json diff

| 情况 | 决策 |
|---|---|
| dev 依赖新增（typescript、vitest 等） | 单做 `chore(deps): regenerate package-lock` commit |
| 锁文件格式调整（lockfile v3、bin/libc 字段） | 同上，单做 `chore(deps)` commit |
| 实际依赖树变化 | 跟随功能 commit，不单做 |
| 整个 lockfile 重生成 | 单做 `chore(deps): regenerate package-lock (npm 11 lockfile v3 format)` |

## 7. DMG / 冷烟基线

| 产物 | 基线 | 偏离处理 |
|---|---|---|
| Pi.app | ≤ 224M ± 5%（即 213-235M） | 偏离 +20% → blocked；+5%~+20% → warn |
| DMG | ≈ 93M（90-96M） | 偏离 +20% → blocked；+5%~+20% → warn |
| 冷烟 3 端点 | `/`、`/api/health`、`/api/sessions` 均 200 | 任一非 200 → blocked |
| `/api/health` body `version` 字段 | 必须等于 `package.json` version | 不等 → blocked（可能打到错版本实例） |

## 8. push / tag / gh release

| 节点 | 决策 |
|---|---|
| `git push origin main` | human_confirmation 必问；不可逆 |
| `git push origin <tag>` | human_confirmation 必问；tag 推后引用持久 |
| `gh release create` | human_confirmation 必问；公开 release 不可删除（只能 unpublish） |
| `release_scope` 字段含 `push` | 视为已授权，不重复问 |
| 用户消息 "选 X" / "已经手动执行" | 视为已授权对应 scope |
| push 失败（网络） | 记 blocking；本地 DMG 仍可做；用户网络恢复后补 |

## 9. status 转换

| 当前 | 转换 | 触发 |
|---|---|---|
| `active` → `blocked` | `## 阻塞` 必填；`找谁` 是真人 | 高风险 / 缺信息 / 缺授权 |
| `active` → `done` | `## 交付` 必填；AC 全部 pass | 实施 + 验证完成 |
| `blocked` → `active` | `## 阻塞` 清空 | 用户给信息 / 障碍解除 |
| `blocked` → `done` | ❌ 不允许 | 必须先 → active |

## 10. 询问判定

| 情况 | 决策 |
|---|---|
| 信息可从 `wiki/` 或源码推断 | **不询问** |
| 信息可从 `git remote -v`、`ls`、`curl` 等基础命令获取 | **不询问** |
| 决策有清晰默认（A1 / B2 / 端口 +=1） | **不询问** |
| 决策涉及高风险（删数据 / 改生产 / 发版 push） | **必询问**（除非 `release_scope` 已含） |
| 决策涉及多仓、多协议、URL 缺失 | **必询问** |
| 决策 2 次相同反馈 | **不询问**（按已有信息自决） |

## 11. 不要做的（反模式）

- ❌ 不要并行 `git commit`
- ❌ 不要 `git push --force` 到 main / master
- ❌ 不要擅自切 SSH / HTTPS 协议
- ❌ 不要 `git reset --hard` 已有 commit
- ❌ 不要擅杀用户进程（包括 `/Applications/Pi.app`）
- ❌ 不要把 `package-lock.json` 跟功能 commit 一起（应单做 `chore(deps)`）
- ❌ 不要 amend 别人的 commit
- ❌ 不要改 `AGENTS.md` / `wiki/agent-reading-map.md` 的"强制"条款
- ❌ 不要把 secret / token 写到 demand 或 commit message

## 12. 改进流程

发现新决策点（反复出现的同款问题）：
1. 加到本表
2. 关联到 `.pi/protocols/release.md`（如果是 release 相关）
3. 在 D-xxx 提一个"流程优化"子任务

## 关联

- `wiki/summary.md` —— 工作区摘要
- `wiki/agent-reading-map.md` —— 读路由
- `wiki/validation-rules.md` —— 验证门禁
- `AGENTS.md` —— 强制条款
- `.pi/protocols/release.md` —— release 9 步模板
- `.pi/agents/team.md` —— team agent 协议
