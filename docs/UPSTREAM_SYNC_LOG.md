# Upstream Sync Changelog

记录每次从上游拉取合并的日志，按时间倒序排列。

---

## 2026-06-24 — pi v0.80.2（D-2026-010）

| 项目 | 值 |
|------|-----|
| 仓库 | `asiachrispy/pi` ← `earendil-works/pi` |
| commit 范围 | `2be6e670..927e9806`（tags: v0.80.1, v0.80.2） |
| 合并 commits | ~20 个 |
| 冲突文件 | 19 个（全部版本号/CHANGELOG/lockfile/publish.mjs） |
| push | ✅ `1509fd39d..7640c5683` |

### 主要内容

- **feat**: external editor 设置、installer lock、`get_entries`/`get_tree` RPC、orchestrator（实验性）
- **fix**: compaction 回归、interactive 状态指示器、provider error passthrough、Z.AI thinking、Codex SSE timeout
- **release**: v0.80.1、v0.80.2

### 冲突解决

全部采纳上游（版本号跟进、CHANGELOG 更新、lockfile 同步）。

---

## 2026-06-23 — pi v0.80.0（D-2026-009）

| 项目 | 值 |
|------|-----|
| 仓库 | `asiachrispy/pi` ← `earendil-works/pi` |
| commit 范围 | `8b97e75c..2be6e670`（tag: v0.80.0） |
| 合并 commits | 14 个 |
| 冲突文件 | 11 个 |
| push | ✅ `968fca64..4549dc35` |

### 主要内容

- **feat**: Models runtime 完整迁移（model-registry 合入，provider-owned auth 新架构）
- **feat**: compaction 事件新增 `reason` / `willRetry` 字段
- **fix**: OpenAI Responses 终止事件、scoped env 注入、session 名称标准化
- **fix**: custom provider stored auth、TUI 重绘修复、ctrl+j 换行绑定
- **fix**: shell-quote 安全更新（GHSA-w7jw-789q-3m8p）
- **release**: v0.79.10

### 冲突解决

全部采纳上游：版本号 0.79.9→0.79.10，models API 重构为上游新架构。本地定制（Agnes provider、retry 分类等）位于独立文件，无冲突。

---

## 2026-06-23 — pi-app upstream sync（D-2026-008）

| 项目 | 值 |
|------|-----|
| 仓库 | `asiachrispy/pi-app` ← `agegr/pi-web` |
| commit 范围 | `a7c5de3..3bf0d4a` |
| 合并 commits | 7 个 |
| 冲突文件 | 3 个 |
| push | ✅ `3605bb0..b5dfb02` |

### 主要内容

- **feat**: 自动滚动智能化（用户意图检测，防止中断手动滚动）
- **fix**: 项目会话树迭代处理（防止深度嵌套崩溃）
- **fix**: 树形压缩保留头尾节点（防 JSON.stringify 栈溢出）
- **fix**: 移动端新会话标题布局、Markdown 列表样式
- **chore**: pi-ai / pi-coding-agent 升级至 v0.79.0

### 冲突解决

采纳上游：`BranchNavigator.tsx`、`ChatWindow.tsx`、`useAgentSession.ts` 组件内部逻辑，本地无定制。

---

## 规则

每次拉取上游：
1. 建 demand（`demands/D-YYYY-NNN.md`，`requires_upstream_sync: true`）
2. 追加本文件日志
3. 更新 `demands/.id-counter`
