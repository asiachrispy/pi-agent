# Pi 多租户改造设计（Livo 场景，路线 2：显式参数强制隔离）

> Status: 待审批（v2，已根治 v1 的 ALS 名实不符问题）
> Scope: 主战场 pi-app（独立 repo）；pi 执行核默认不改，必须改时记入 UPSTREAM_SYNC_LOG
> 关联: livo-pi-agent-integration（Livo 侧已打通 SSO + 工作区）
> 参考: Kocoro-lab/Shannon 的架构原则（身份贯穿 / 单一强制网关 / 工作区即边界 / 计量贯穿）

## v1 → v2 修订说明（审查后根治的三处欠陷）

v1 把"单一强制网关"建立在 `AsyncLocalStorage`（ALS）+ `getAgentDir()` 隐式回退之上。审查发现这是**名实不符**：ALS 是"隐式环境变量"，route 漏套 `withTenant` 时会**静默回退到全局 agentDir**，与补丁方案"漏调 readLivoSession 就泄漏"是同构失败模式，并非"绕不过去"。三处确凿欠陷（均有代码证据）：

1. **欠陷1（强制力）**：`getAgentDir()` 被 54 处无参调用，隐式回退 = 漏套即泄漏，"绕不过去"是口号。
2. **欠陷2（缓存穿透）**：`globalThis.__piSessionPathCache` / `__piSessions` / `__piStartLocks` / `__piSessionRefFilesCache` 的键**不含 tenantId**，进程级共享缓存贯穿了目录分离（末端有 `rejectLivoCwdOutsideWorkspace` 按 cwd 兜底，故是"纵深防御缺一层 + 设计盲点"，非必然可利用）。
3. **欠陷3（并发）**：`listSessionsForAgentRoot` 临时改 `process.env.PI_CODING_AGENT_DIR` 再 `await`，进程全局 env 在 await 间隙会被并发请求踏踏；而 `SessionManager.listAll(sessionDir)` 本就有参数重载，env hack 从一开始就不必要。

v2 的根治方向：**ALS 只负责"运输"租户上下文，"强制"改由显式必传参数兑现**。碰租户数据的函数签名强制要求 `agentDir`，漏传 = 编译错误；缓存键加租户维度；废弃 env hack 改用参数重载。

## 背景与定位

当前 pi-app 是"伪多租户"：单进程 + 共享 `~/.pi/agent` + 每个 route 各自 `readLivoSession` 做路径过滤。隔离正确性依赖"每个 route 都记得校验"，这是补丁思路，迟早因为漏套而泄漏。

方向决策（已确认）：
- **服务对象**：先内部（租户 = Livo 用户），后对外（架构预留，本期不做）。
- **隔离强度**：逻辑隔离够用（同进程数据/路径隔离），不做进程/容器硬隔离。
- **运维**：尽量单进程，不引入 Temporal / 多服务 / 容器编排。
- **计费**：统一付费，凭证/模型全局共享；本期只计量、不拦截。
- **存量**：不迁移，从空开始（旧共享 session 留原处但不再展示给 Livo 用户）。

本设计借鉴 Shannon 的**架构原则**而非其技术栈：用"身份贯穿 + 单一强制网关"矫正补丁方案的根本缺陷，但保持单进程。

## 设计原则（源自 Shannon，按我们的约束裁剪）

1. **身份贯穿**：`TenantContext{tenantId, agentDir, …}` 在入口解析一次，用 ALS **运输**到下游；但凡碰租户数据的函数，仍要从上下文取出 `agentDir` 并**显式传参**，不依赖隐式读取。
2. **显式参数强制（真正的"绕不过去"）**：碰租户数据的函数（`listAllSessions` / `resolveSessionPath` / `recordUsage` / `SessionManager.*` 包装）签名**必须接收 `agentDir`**。漏传 = TypeScript 编译错误，而非静默回退。这是 v2 与 v1 的根本差别：v1 靠"记得套 withTenant"（运行时、可漏），v2 靠"类型系统强制"（编译期、不可漏）。
3. **无隐式回退**：禁止"租户上下文缺失 → 静默用全局 agentDir"。`getAgentDir()` 保留给非租户路径（CLI/loopback/Bearer）；租户路径一律走显式参数。若代码在"已认证 Livo 请求"中却拿不到租户上下文，立即 throw（fail-closed），不 fall-open。
4. **工作区即边界**：沿用 pi 已做好的 cwd + realpath，边界判定收进 `TenantGate` 统一执行。
5. **缓存按租户隔离**：所有 `globalThis.*` 进程级缓存（session path / 生存会话 registry / start locks / ref files）键前置 `tenantId`，杜绝跨租户缓存穿透。
6. **计量贯穿**：每次 agent 执行记一笔带 `tenantId` 的 token 账，"恰好一次"。
7. **执行核纯净**：`createAgentSession` 不改，agentDir/凭证由调用方显式注入——这是将来抽成独立 runner（路线 3）的接缝。

## 关键事实（已核实）

1. `createAgentSession` / `SessionManager` / `ResourceLoader` 都接受**显式 `agentDir` 参数**；pi 执行路径不在内部重新读全局 env。`startRpcSession` 已显式传 `agentDir`。
2. **`SessionManager.listAll(sessionDir?)` 有参数重载**（pi `session-manager.ts:1520`）；无参时才读 `process.env.PI_CODING_AGENT_DIR`。→ 可全程显式传参，不需要 env hack。
3. `AuthStorage.create(authPath?)` 与 `ModelRegistry.create(authStorage, modelsPath)` 都接受**显式路径** → 凭证/模型可钉死全局共享，sessions/preferences 走 per-user，两者可拆开。
4. 每条 assistant 消息带 `usage`（input/output/cache token + cost）→ 计量数据齐全；但现有 `buildUsageSummary` 只算 runs 数，**未聚合 token**，需新写。
5. middleware 的 `hasValidLivoSessionCookie` 在 Edge runtime **只验签、拿不到 userId**（解 userId 要读磁盘 store）→ 租户上下文解析须在 route handler 层（Node runtime）。
6. `getAgentDir()` 现为无参全局函数，被 ~25 文件 ~54 处调用；pi 库内部 `config.ts` 另有同名全局函数（读 `PI_CODING_AGENT_DIR`）。
7. **现有 env hack 不安全**：`session-reader.ts:18-29` 临时改 `process.env.PI_CODING_AGENT_DIR` 再 `await`，进程全局 env 在 await 间隙会被并发请求踏踏。
8. **全局缓存无租户键**：`globalThis.__piSessionPathCache`（sessionId→绝对路径，:110）、`__piSessions`（生存会话 registry，rpc-manager.ts:299）、`__piStartLocks`、`__piSessionRefFilesCache` 均进程级共享。`listAllSessions` 在 :82 无条件填充 path 缓存。
9. 文件隔离已较好（`cwdBelongsToLivoUser` + realpath 防逃逸）；末端 `rejectLivoCwdOutsideWorkspace` 按 cwd 兜底所有权。session/preferences/skills/scene/memory 仍是共享单份。

## 分层架构（全部在 pi-app 单进程内）

```
┌─ 入口层 (Node runtime route 包装器 withTenant) ─────────┐
│  解析 Livo session → 构造 TenantContext{tenantId,agentDir}│
│  fail-closed: 已认证 Livo 请求但解析不出租户 → throw      │
│  用 ALS 运输上下文（仅运输，不作强制依据）                 │
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─ 网关层 TenantGate（单一收口，从 ALS 取 ctx 后显式传参）──┐
│  gate.agentDir                  → per-tenant 数据目录     │
│  listAllSessions(agentDir)      → 必传，漏传=编译错误      │
│  resolveSessionPath(id,agentDir)→ 必传 + 租户键缓存       │
│  assertOwnsCwd / assertOwnsSession → 归属强制（realpath） │
│  recordUsage(tenantId,sid,tok)  → 计量（本期写本地）      │
│  checkBudget(tenantId)          → 预留接口（下期拦截）    │
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─ 执行层 (pi 库，不改) ───────────────────────────────────┐
│  createAgentSession({ agentDir, ... })  显式注入          │
│  SessionManager.listAll(agentDir)       用参数重载        │
│  凭证/模型 → 全局共享路径（统一付费，钉死不受租户影响）   │
└──────────────────────────────────────────────────────────┘
```

> ALS 的定位：v2 中 ALS 只是"把入口解析出的 `agentDir` 带到深层调用栈"的运输工具。真正阻止跨租户的是**函数签名要求 `agentDir` 必传** + **缓存键含 tenantId** + **fail-closed**，而非 ALS 本身。即便某处 ALS 为空，也不会静默回退——取不到上下文就 throw。

### 目录布局

```
全局共享（统一付费，所有租户共用）:
  ~/.pi/agent/auth.json          # 凭证
  ~/.pi/agent/models.json        # 模型配置

per-tenant（每个 Livo 用户独立）:
  /data/pi-agent/workspaces/livo/users/{userId}/
    .pi-agent/                   # ← 该租户的 agentDir
      sessions/
      pi-web-preferences
      scene-overrides / scene-metadata
      skills/
      memory
    meetings/{meetingId}/...      # 已有工作区文件（不变）
```

per-user agentDir 放在该用户工作区根下的 `.pi-agent/`，复用现有 `livoUserWorkspaceRoot(userId)` + realpath 边界。

### 与 v1（ALS 隐式）的关键差别

| 维度 | v1（已否决） | v2（本设计） |
|------|------|------|
| 强制时机 | 运行时（漏套 withTenant 才暴露） | **编译期**（漏传 agentDir = 类型错误） |
| 上下文缺失 | 静默回退全局 agentDir（fail-open，泄漏） | **throw（fail-closed）** |
| ALS 角色 | 强制依据（隐式读取） | 仅运输（取出后显式传参） |
| 缓存 | 进程级共享，无租户键 | 键前置 tenantId |
| pi 库 agentDir | env hack 临时改 env（并发不安全） | `listAll(agentDir)` 参数重载 |

核心：v1 的失败模式（"忘了某个调用 → 静默不隔离"）与原补丁同构；v2 把"忘"变成编译器拦截 + 运行时 fail-closed，才是真正的"绕不过去"。

## 实施步骤（按依赖排序）

### Step 1 — 租户上下文与网关骨架
- `lib/livo/tenant-context.ts`：`AsyncLocalStorage<TenantContext>`（含 `tenantId`、`agentDir`）；`runWithTenant` / `getTenantContext`；**`requireTenantContext()`：取不到即 throw（fail-closed），供需要租户身份的代码调用**。
- `lib/livo/tenant-gate.ts`：`TenantGate`，从上下文取出 `agentDir` 后**显式传参**给下游；封装 `assertOwnsCwd`、`assertOwnsSession`、`recordUsage`、（预留）`checkBudget`。
- `lib/livo/with-tenant.ts`：route 包装器，解析 Livo session → 构造 context → `runWithTenant`。**已认证 Livo 请求但解析不出 userId → throw**；非 Livo 请求（CLI/loopback/Bearer）透传，仍走全局 `getAgentDir()`。

### Step 2 — 存储函数改显式参数（根治欠陷1/3）
- 改造碰租户数据的函数签名为**必传 agentDir**：`listAllSessions(agentDir)`、`resolveSessionPath(id, agentDir)`、`buildSessionContext(id, agentDir)` 等。漏传 = 编译错误。
- pi 库调用全部走参数重载：`SessionManager.listAll(agentDir)`、`SessionManager.open(file, agentDir)`、`createAgentSession({ agentDir })`。
- **废弃 `listSessionsForAgentRoot` 的 env hack**（不再临时改 `process.env`）。
- `getAgentDir()` **不接 ALS、不加隐式回退**：保持原语义，仅服务非租户路径。租户路径不调用它。
- `lib/resolve-model.ts`：显式传全局 `auth.json` / `models.json` 绝对路径（统一付费，钉死全局）。

### Step 3 — 缓存键加租户维度（根治欠陷2）
- `globalThis.__piSessionPathCache` / `__piSessions` / `__piStartLocks` / `__piSessionRefFilesCache` 的键前置 `tenantId`（或改为 `Map<tenantId, Map<...>>`）。
- 缓存读写 API 增加 `tenantId` 参数；非租户路径用固定哨兵键（如 `"__global__"`）。
- `listAllSessions` 填充 path 缓存时带上当前 `tenantId`。

### Step 4 — Livo 可达 route 套 withTenant + 走网关
- 给 sessions、sessions/[id]、agent/new、agent/[id]、files、preferences、skills、usage、scene 等套 `withTenant`。
- route 内不再裸调 `getAgentDir()` / `SessionManager`，改为经 `TenantGate`（拿到 agentDir 再显式下传）。
- `agent/new` 现有 `realCwdBelongsToLivoUser` 校验改由 `gate.assertOwnsCwd` 统一执行。
- **清单核对**：列出所有 `/api/*` route，逐个标注"租户路径 / 非租户路径"，确保租户路径全部套上（配合 Step 6 的运行时断言双保险）。

### Step 5 — per-tenant 计量
- `lib/livo/tenant-usage.ts`：token 聚合——`listAllSessions(gate.agentDir)` 后遍历 assistant 消息，累加 `usage.{input,output,cacheRead,cacheWrite}` 与 `cost.total`。
- `app/api/usage/route.ts`：在租户上下文中返回该租户 token/cost 汇总 + 现有 runs 汇总。
- 本期只展示，不拦截（`checkBudget` 留接口位）。

### Step 6 — 全局配置只读保护 + cwd 校正 + fail-closed 兜底
- Livo 租户上下文下，`models-config` / `default-model` 等写接口返回 403（防互改全局模型配置）。读保持可用。
- 确认新 agentDir 生效后，session 列表/文件树落在租户目录内；旧共享 session 不再出现在 Livo 视图（"从空开始"）。
- **运行时兜底断言**：在共享存储入口（如 `getAgentDir()` 或 session 读取）加断言——若 ALS 显示当前是 Livo 租户请求却走到了全局路径，记 error 日志并 throw。这是对"漏套 withTenant"的运行时第二道防线（第一道是编译期必传参数）。

## 路线 3 接缝（对外开放时启用，本期仅预留）

- `TenantGate.recordUsage` 现写本地，将来换写 PostgreSQL `token_usage` 表（Shannon 同款），调用方零改。
- 执行层只吃注入的 agentDir；将来要硬隔离时，把这层换成"调远程 pi runner 子进程/容器"，网关接口不变。
- `TenantContext.tenantId` 现 = `livoUserId`；对外开放时换成真正的组织/API key 维度，贯穿逻辑不变。
- `checkBudget` 预留位将来接 per-tenant 硬预算 + 自动降级（Shannon budget.go 思路）。

## 代码组织与上游同步策略

仓库是嵌套 fork 结构，`pi`(执行核) 与 `pi-app`(Web) 各自有 `origin`(asiachrispy fork) + `upstream`(开源原项目 earendil-works/pi、agegr/pi-web)，并有成熟的定期上游同步流程（见 `docs/UPSTREAM_SYNC_LOG.md`，原则："采纳上游 + 本地定制放独立文件避免冲突"）。本设计遵循同一原则，降低未来同步成本。

### 改动归属

- **主战场 pi-app**：多租户改造几乎全部落在 pi-app。
- **pi 执行核**：默认不改（也最利于同步 + 符合"执行核纯净"原则）。若确有必须改的接缝（目前核实不需要），允许改，但**必须记入 `UPSTREAM_SYNC_LOG.md`**，且改动压缩到最小 hook。

### 文件物理隔离（关键）

| 类型 | 例子 | 落点 | 同步冲突 |
|------|------|------|---------|
| 纯新增 Livo 模块 | `livo/tenant-context.ts`、`livo/tenant-gate.ts`、`livo/with-tenant.ts`、`livo/tenant-usage.ts` | **集中在 `pi-app/lib/livo/`**（与现有 `livo-sso.ts` 等呼应） | 零（上游无此文件） |
| 必须改上游文件的接缝 | route 套 `withTenant`、存储函数加 `agentDir` 参数、`resolve-model.ts` 钉死全局、`globalThis.*` 缓存键加租户维度 | 改动**最小化、且多为加参数而非改逻辑**；新逻辑全在 `lib/livo/` | 低-中（加参数易解冲突；缓存键改动需同步多点） |

核心权衡：v2 用"显式必传参数"换取真正的强制力，代价是要改若干上游函数签名（加 `agentDir` 参数）——这比 v1 的"一行 hook"改动面大。但收益是**编译期保证**，且改动多为"加参数"而非"改逻辑"，上游若重构这些函数，冲突也通常是机械的参数补齐。真正的隔离逻辑全部沉淀在 `lib/livo/`，与上游解耦。缓存键改造是例外（需同步多个 `globalThis.*` 读写点），列为 Step 3 的重点核对项。

> 注：现有 Livo 代码（`livo-sso.ts`、`livo-session-guard.ts` 等）分散在 `lib/` 根下。本期新增代码统一进 `lib/livo/`；存量文件不强制搬迁，但新引用尽量经由 `lib/livo/` 收口。

### 分支策略

- fork 的 `main` = 上游 + Livo 定制，持续演进；上游同步走 `git merge upstream/main`。
- 每个 Livo 需求开 feature 分支（如 `feat/multi-tenant-livo`），完成合回 `main`。
- 不另起长期平行主干——现有 fork 模式已足够隔离开源项目（推送只到 asiachrispy fork，上游不受影响）。

## 测试计划

- 类型层：删掉某 route 的 agentDir 传参 → **应编译失败**（验证"漏传=编译错误"这一强制力真实存在）。
- 单测：`requireTenantContext()` 在无上下文时 throw；`with-tenant` 对"有 Livo cookie 但解析不出 userId"的请求 throw（fail-closed）。
- 单测：`TenantGate.assertOwnsCwd/Session` 拒绝跨租户；per-tenant usage 聚合（两用户 fixture 不串）。
- 单测：缓存键含 tenantId——租户A填充 `__piSessionPathCache` 后，租户B同 sessionId 查询**不命中**A的路径。
- 并发：两个不同租户请求交错执行 `listAllSessions`，断言各自只拿到自己的 session（验证 env hack 废弃后无 race）。
- 集成：两个不同 Livo userId 的请求，sessions / files / preferences 互不可见；凭证共享（都能调模型）。
- 回归：非 Livo（loopback / Bearer）路径 agentDir 仍走全局 `getAgentDir()`，行为不变。
- 安全：用户 A 带 cookie 访问用户 B 的 sessionId → 403（编译期必传 + 缓存隔离 + cwd 兜底三重）。

## 非目标（本期不做）

- 预算超额拦截（只计量）。
- 存量 session 迁移（从空开始）。
- per-tenant 凭证 / 独立计费。
- 进程级 / 容器 / microVM 硬隔离。
- Temporal 工作流 / 多服务拆分 / 对外多租户 SaaS（路线 3）。
- 团队 / 共享工作区权限模型。

## 风险

- **route 套用覆盖面**：仍需人工保证每个租户 route 套 `withTenant`。但与 v1 不同，即便套了 withTenant 却漏传 agentDir 也会编译失败；且 Step 6 运行时断言 + fail-closed 作第二道防线。残留风险：route 完全没套 withTenant 且内部也没碰需要 agentDir 的函数（纯只读非敏感）——这类不泄漏。
- **pi 库内部 getAgentDir**：pi 库 `config.ts` 全局函数不受 pi-app 控制；但执行路径都走显式 agentDir 参数（已核实），仅需确认无遗漏的库内全局调用落到敏感数据。
- **terminal**：Livo 场景已 `PI_WEB_TERMINAL_DISABLED=1`，本期保持禁用。
- **ALS 边界**：跨 `setTimeout`/事件回调（idle timer、notify）ALS 上下文会丢。因 v2 计量/归属判定都要求显式参数，异步回调里若需租户身份，**必须在进入回调前把 agentDir/tenantId 闭包捕获**，不能在回调内 `getTenantContext()`。这条要在代码评审中重点检查 rpc-manager 的 idle/destroy 回调与 notify-agent-end。
- **缓存键迁移**：改 `globalThis.*` 缓存键结构需同步所有读写点，漏改一处会缓存 miss（不泄漏，但性能退化）。Step 3 需列全读写点清单。
