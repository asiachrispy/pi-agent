# Pi 多租户改造设计（Livo 场景，方案二：显式参数强制隔离）

> Status: 待审批（v3 — 方案二定稿，已并入三轮代码审查的全部修正）
> Scope: 主战场 pi-app（独立 repo）；pi 执行核默认不改源码，仅在调用处显式传参
> 关联: livo-pi-agent-integration（Livo 侧已打通 SSO + 工作区）
> 参考: Kocoro-lab/Shannon 的架构原则（身份贯穿 / 单一收口 / 工作区即边界 / 计量贯穿）

## 修订脉络（为何是方案二）

经三轮代码审查，否决了两条错误路线，确认方案二（显式参数强制）是单进程约束下唯一可靠的隔离方式：

- **否决 v1（ALS 隐式回退）**：把隔离建在 `getAgentDir()` 隐式回退上，route 漏套即静默回退全局目录，与原补丁同失败模式，"绕不过去"是口号。
- **否决"只切 agentDir 就够"**：审查发现 pi 库内部用**自己的** `config.ts:getAgentDir()`（读 `process.env.PI_CODING_AGENT_DIR`），**pi-app 的 ALS 版 getAgentDir 对 pi 库无效**。靠 ALS 改 agentDir 在 pi 库调用路径上根本不生效。
- **采纳方案二**：pi 库只认两样东西——**显式传参** 或 **进程级 env var**。单进程并发下 env var 不安全（被踏踏），故唯一安全入口是**显式传参**。这也天然满足"编译期强制"：漏传 = 类型错误。

## 三轮审查锁定的硬事实（均有代码证据）

1. **pi 库只认显式参数或 env var**：pi `session-manager.ts:20` 用自身 `config.ts:getAgentDir()`（读 `PI_CODING_AGENT_DIR`）。pi-app 的 ALS getAgentDir 不影响 pi 库。→ 隔离必须靠显式传参。
2. **session 落点是 agentDir × cwd 二维**：`getDefaultSessionDirPath(cwd, agentDir) = join(agentDir, "sessions", encode(cwd))`（session-manager.ts:439-443）。session 存到 `{agentDir}/sessions/{编码cwd}/`。
3. **`SessionManager.create(cwd, sessionDir?)` 第二参数是 sessionDir（非 agentDir）**：传 `undefined` 时走 `getDefaultSessionDir(cwd)` = pi 库 env 决定的默认 agentDir。当前 `rpc-manager.ts:349-350` 正是传 `undefined` → **执行路径现在根本没落到租户目录**。
4. **`listAll(x)` 的 x 是"直接含 jsonl 的 sessionDir"，单层不递归**（session-manager.ts:1527 + `listSessionsFromDir` :714）。传 agentDir 会返空（jsonl 在子目录）。无参 `listAll()` 才扫 `{agentDir}/sessions/` 下所有 cwd 子目录。→ 计量不能用 `listAll(agentDir)`。
5. **凭证/模型可显式钉死全局**：`AuthStorage.create(authPath?)` 与 `ModelRegistry.create(authStorage, modelsPath)` 接受显式路径 → 统一付费成立。
6. **preferences/scene/skills 是 `{agentDir}/` 下全局单文件**（pi-web-preferences.json、scene-overrides.json、product-sessions.json、skills/），cwd 不分它们。→ **这才是 per-tenant agentDir 的真正理由**（仅靠 cwd 子目录隔离不了它们）。
7. **全局缓存无租户键**：`globalThis.__piSessionPathCache`（sessionId→绝对路径，session-reader.ts:110）、`__piSessions`（生存会话 registry，rpc-manager.ts:299）、`__piStartLocks`、`__piSessionRefFilesCache` 进程级共享。
8. **现有 env hack 不安全**：`session-reader.ts:18-29` 临时改 `process.env.PI_CODING_AGENT_DIR` 再 `await`，并发踏踏。本期废弃。
9. **每条 assistant 消息带 `usage`**（input/output/cache token + cost），计量数据齐全；现有 `buildUsageSummary` 只算 runs 数，未聚合 token，需新写。
10. **middleware 在 Edge runtime 拿不到 userId**（解 userId 要读磁盘 store）→ 租户上下文解析须在 route handler 层（Node runtime）。
11. 文件隔离已较好（`cwdBelongsToLivoUser` + realpath 防逃逸）；末端 `rejectLivoCwdOutsideWorkspace` 按 cwd 兜底所有权。

## 方向决策（已确认）

- **服务对象**：先内部（租户 = Livo 用户），后对外（架构预留，本期不做）。
- **隔离强度**：逻辑隔离够用（同进程数据/路径隔离），不做进程/容器硬隔离。
- **运维**：尽量单进程，不引入 Temporal / 多服务 / 容器编排。
- **计费**：统一付费，凭证/模型全局共享；本期只计量、不拦截。
- **存量**：不迁移，从空开始（旧共享 session 留原处但不再展示给 Livo 用户）。

## 设计原则

1. **身份贯穿**：`TenantContext{tenantId, agentDir}` 入口解析一次，用 ALS **仅运输**到下游；碰租户数据的函数从上下文取出 agentDir/sessionDir 后**显式传参**。
2. **显式参数强制**：碰租户数据的函数签名**必须接收 agentDir/sessionDir**，漏传 = TypeScript 编译错误。这是"绕不过去"的真正落点——编译期，而非运行时自觉。
3. **无隐式回退（fail-closed）**：租户上下文缺失绝不静默回退全局；已认证 Livo 请求取不到上下文立即 throw。`getAgentDir()` 仅服务非租户路径（CLI/loopback/Bearer）。
4. **执行核纯净 + 显式注入**：pi 库不改源码，但**所有调用处显式传 agentDir 和 sessionDir**——尤其 `SessionManager.create(cwd, tenantSessionDir)` 必须传，不能靠 pi-app ALS。
5. **缓存按租户隔离**：所有 `globalThis.*` 缓存键前置 tenantId。
6. **工作区即边界**：沿用 cwd + realpath，边界判定收进 `TenantGate`。
7. **计量贯穿**：每次 agent 执行记一笔带 tenantId 的 token 账。

## 目录布局

```
全局共享（统一付费，所有租户共用）:
  ~/.pi/agent/auth.json          # 凭证
  ~/.pi/agent/models.json        # 模型配置

per-tenant（每个 Livo 用户独立）:
  /data/pi-agent/workspaces/livo/users/{userId}/
    .pi-agent/                   # ← 该租户的 agentDir（隔离 preferences/scene/skills/memory）
      sessions/{编码cwd}/        # ← session 落点（agentDir × cwd 二维）
      pi-web-preferences.json
      scene-overrides.json / product-sessions.json
      skills/
      memory
    meetings/{meetingId}/...      # 已有工作区文件（不变）
```

agentDir per-tenant 的真正理由是隔离 preferences/scene/skills/memory（全局单文件）；session 则在该 agentDir 内按 cwd 自然分目录。

## 分层架构（全部在 pi-app 单进程内）

```
┌─ 入口层 (Node runtime route 包装器 withTenant) ──────────────┐
│  解析 Livo session → TenantContext{tenantId, agentDir}       │
│  fail-closed: 已认证 Livo 但解析不出 userId → throw           │
│  ALS 仅运输上下文（不作强制依据）                              │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌─ 网关层 TenantGate（单一收口，取 ctx 后显式传参）─────────────┐
│  gate.agentDir / gate.sessionDir(cwd) → 租户目录              │
│  assertOwnsCwd / assertOwnsSession    → 归属强制（realpath）  │
│  recordUsage(tenantId,sid,tok)        → 计量（本期写本地）    │
│  checkBudget(tenantId)                → 预留接口（下期拦截）  │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌─ 执行层 (pi 库，不改源码，调用处显式传参)─────────────────────┐
│  createAgentSession({ agentDir: gate.agentDir, ... })        │
│  SessionManager.create(cwd, gate.sessionDir(cwd))  ← 必传    │
│  SessionManager.open(file, gate.sessionDir(cwd))   ← 必传    │
│  计量遍历: listAll()全扫 + cwdBelongsToLivoUser 过滤          │
│  凭证/模型 → 全局共享路径（钉死，不受租户影响）              │
└───────────────────────────────────────────────────────────────┘
```

> ALS 仅"运输"。真正阻止跨租户的是：函数签名必传 agentDir/sessionDir + 缓存键含 tenantId + fail-closed。ALS 为空不静默回退，而是 throw。

## 实施步骤（按依赖排序）

### Step 1 — 租户上下文与网关骨架
- `lib/livo/tenant-context.ts`：`AsyncLocalStorage<TenantContext>`（`tenantId`、`agentDir`）；`runWithTenant` / `getTenantContext`；`requireTenantContext()`（取不到即 throw）。
- `lib/livo/tenant-gate.ts`：`TenantGate`，提供 `agentDir`、`sessionDir(cwd)`（= `join(agentDir,"sessions",encode(cwd))`）、`assertOwnsCwd`、`assertOwnsSession`、`recordUsage`、（预留）`checkBudget`。
- `lib/livo/with-tenant.ts`：route 包装器，解析 Livo session → 构造 context → `runWithTenant`。已认证 Livo 但解析不出 userId → throw；非 Livo 请求透传（仍走全局 `getAgentDir()`）。

### Step 2 — 执行路径显式传 agentDir + sessionDir（根治硬事实 1/2/3）
- `rpc-manager.ts`：`SessionManager.create(cwd, gate.sessionDir(cwd))`、`SessionManager.open(file, gate.sessionDir(cwd))`——**把现在的 `undefined` 改成租户 sessionDir**；`createAgentSession({ agentDir: gate.agentDir })`。
- pi-app 存储函数签名改**必传 agentDir**：`listAllSessions(agentDir)`、`resolveSessionPath(id, agentDir)`、`buildSessionContext(id, agentDir)` 等。漏传 = 编译错误。
- 废弃 `listSessionsForAgentRoot` 的 env hack（硬事实 8）。
- `getAgentDir()` 不接 ALS、不加隐式回退，仅服务非租户路径。
- `lib/resolve-model.ts`：显式传全局 `auth.json` / `models.json` 路径（统一付费钉死）。

### Step 3 — 缓存键加租户维度（根治硬事实 7）
- `globalThis.__piSessionPathCache` / `__piSessions` / `__piStartLocks` / `__piSessionRefFilesCache` 键前置 tenantId（或 `Map<tenantId, Map<...>>`）。
- 缓存读写 API 增加 tenantId 参数；非租户路径用哨兵键 `"__global__"`。
- 列全读写点清单，避免漏改导致 miss（不泄漏但退化性能）。

### Step 4 — Livo 可达 route 套 withTenant + 走网关
- 给 sessions、sessions/[id]、agent/new、agent/[id]、files、preferences、skills、usage、scene 等套 `withTenant`。
- route 内不裸调 `getAgentDir()` / `SessionManager`，改经 `TenantGate` 取目录后显式下传。
- `agent/new` 现有 `realCwdBelongsToLivoUser` 校验改由 `gate.assertOwnsCwd` 统一执行。
- 列出所有 `/api/*` route，逐个标注"租户/非租户"，确保租户路径全部套上。

### Step 5 — per-tenant 计量（根治硬事实 4）
- `lib/livo/tenant-usage.ts`：token 聚合——**`listAll()` 全扫所有 session，再用 `cwdBelongsToLivoUser(s.cwd, tenantId)` 过滤**当前租户（不能用 `listAll(agentDir)`，会返空）。遍历 assistant 消息累加 `usage.{input,output,cacheRead,cacheWrite}` 与 `cost.total`。
- `app/api/usage/route.ts`：在租户上下文返回该租户 token/cost + runs 汇总。
- 本期只展示，不拦截（`checkBudget` 留接口位）。

### Step 6 — 全局配置只读保护 + cwd 校正 + 运行时兜底
- Livo 租户上下文下，`models-config` / `default-model` 写接口返回 403（防互改全局模型配置）；读保持可用。
- 确认新目录生效后，session 列表/文件树落租户目录；旧共享 session 不再出现在 Livo 视图。
- 运行时兜底断言：共享存储入口若发现"当前是 Livo 租户请求却走到全局路径"，记 error 并 throw（编译期必传之外的第二道防线）。

## 路线 3 接缝（对外开放时启用，本期仅预留）

- `recordUsage` 现写本地，将来换写 PostgreSQL `token_usage` 表，调用方零改。
- 执行层已全程显式传 agentDir/sessionDir → 将来要硬隔离时，把"传参 + 同进程调用"换成"子进程 env var + IPC"即可（子进程内 env 干净，无并发踏踏）。网关接口不变。
- `tenantId` 现 = `livoUserId`，对外开放时换成组织/API key 维度，贯穿逻辑不变。
- `checkBudget` 预留位将来接 per-tenant 硬预算 + 自动降级。

## 代码组织与上游同步策略

仓库是嵌套 fork 结构，`pi`(执行核) 与 `pi-app`(Web) 各自有 `origin`(asiachrispy fork) + `upstream`(earendil-works/pi、agegr/pi-web)，有成熟的定期上游同步流程（见 `docs/UPSTREAM_SYNC_LOG.md`，原则："采纳上游 + 本地定制放独立文件避免冲突"）。

### 改动归属
- **pi-app 为主战场**：多租户改造几乎全落在 pi-app。
- **pi 执行核不改源码**：只在 pi-app 调用处显式传参，不动 pi 库本身。若确有必须改，记入 `UPSTREAM_SYNC_LOG.md`。

### 文件物理隔离
| 类型 | 例子 | 落点 | 同步冲突 |
|------|------|------|---------|
| 纯新增 Livo 模块 | `livo/tenant-context.ts`、`livo/tenant-gate.ts`、`livo/with-tenant.ts`、`livo/tenant-usage.ts` | 集中 `pi-app/lib/livo/`（与现有 `livo-sso.ts` 呼应） | 零 |
| 改上游文件的接缝 | route 套 `withTenant`、存储函数加 agentDir 参数、rpc-manager 传 sessionDir、缓存键加 tenantId、resolve-model 钉死全局 | 改动多为"加参数"而非"改逻辑"，新逻辑全在 `lib/livo/` | 低-中 |

核心权衡：方案二用显式参数换编译期保证，代价是改若干上游函数签名（加参数）；上游重构时冲突多为机械的参数补齐。缓存键改造需同步多个 `globalThis.*` 读写点，列为 Step 3 重点。

> 现有 Livo 代码（`livo-sso.ts`、`livo-session-guard.ts`）分散在 `lib/` 根下；新增代码统一进 `lib/livo/`，存量不强制搬迁。

### 分支策略
- fork `main` = 上游 + Livo 定制；上游同步走 `git merge upstream/main`。
- 每个 Livo 需求开 feature 分支（如 `feat/multi-tenant-livo`），完成合回 `main`。
- 不另起长期平行主干（推送只到 asiachrispy fork，上游不受影响）。

## 测试计划

- 类型层：删掉某调用的 agentDir/sessionDir 传参 → **应编译失败**（验证强制力真实存在）。
- 单测：`requireTenantContext()` 无上下文时 throw；`with-tenant` 对"有 Livo cookie 但解析不出 userId"throw（fail-closed）。
- 单测：`TenantGate.sessionDir(cwd)` 返回 `{租户agentDir}/sessions/{encode(cwd)}`；`assertOwnsCwd/Session` 拒绝跨租户。
- 单测：缓存键含 tenantId——租户A填充后租户B同 sessionId 查询不命中。
- 单测：per-tenant usage 聚合用"全扫 + cwd 过滤"，两用户 fixture 不串；验证不会误用 `listAll(agentDir)` 返空。
- 并发：两租户请求交错执行 `listAllSessions`，各自只拿到自己的 session（验证废弃 env hack 后无 race）。
- 集成：两个 Livo userId 的请求，sessions / files / preferences 互不可见；凭证共享（都能调模型）。
- 端到端：租户首次发消息 → session 落到 `users/{userId}/.pi-agent/sessions/` 而非默认 `~/.pi/agent`（验证硬事实 3 的修复）。
- 回归：非 Livo（loopback / Bearer）路径仍走全局 `getAgentDir()`，行为不变。
- 安全：用户 A 带 cookie 访问用户 B 的 sessionId → 403。

## 非目标（本期不做）

- 预算超额拦截（只计量）。
- 存量 session 迁移（从空开始）。
- per-tenant 凭证 / 独立计费。
- 进程级 / 容器 / microVM 硬隔离。
- Temporal / 多服务拆分 / 对外多租户 SaaS（路线 3）。
- 团队 / 共享工作区权限模型。

## 风险

- **route 套用覆盖面**：仍需人工保证每个租户 route 套 `withTenant`。但漏传 agentDir/sessionDir 会编译失败兜底；Step 6 运行时断言 + fail-closed 作第二道防线。残留：完全没套且内部也没碰租户数据的纯只读 route——不泄漏。
- **sessionDir 传参遗漏**：方案二的关键在每个 `SessionManager.create/open` 都传租户 sessionDir。漏一处 → session 落到默认目录（泄漏 + 列表看不到）。Step 2 须列全 `SessionManager.create/open` 调用点清单逐一改。
- **ALS 边界**：跨 `setTimeout`/事件回调（idle timer、notify、destroy）ALS 上下文会丢。必须在进入回调前把 agentDir/sessionDir/tenantId **闭包捕获**，不能在回调内 `getTenantContext()`。重点检查 rpc-manager 的 idle/destroy 回调与 notify-agent-end。
- **pi 库内部 getAgentDir**：pi 库 `config.ts` 全局函数读 env，pi-app 不控制；本期不依赖它（全走显式传参），仅需确认无遗漏的库内全局调用落到敏感数据。
- **缓存键迁移**：改 `globalThis.*` 键结构需同步所有读写点，漏改导致 miss（不泄漏但退化）。Step 3 列全清单。
- **terminal**：Livo 场景已 `PI_WEB_TERMINAL_DISABLED=1`，本期保持禁用。
