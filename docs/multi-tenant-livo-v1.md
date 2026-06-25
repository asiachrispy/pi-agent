# Pi 多租户改造设计（Livo 场景，路线 2：进程内强制网关）

> Status: 待审批
> Scope: 主战场 pi-app（独立 repo）；pi 执行核默认不改，必须改时记入 UPSTREAM_SYNC_LOG
> 关联: livo-pi-agent-integration（Livo 侧已打通 SSO + 工作区）
> 参考: Kocoro-lab/Shannon 的架构原则（身份贯穿 / 单一强制网关 / 工作区即边界 / 计量贯穿）

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

1. **身份贯穿**：`TenantContext{tenantId, …}` 在入口注入一次，贯穿到每次存储访问与每笔计量；route 不再各自解析 cookie。
2. **单一强制网关**：所有"碰租户数据"的操作（session 读写、文件、agent 启动、计量）收口到一个 `TenantGate`。route 只能通过网关拿资源句柄，**漏套从"会泄漏"变成"绕不过去"**。
3. **工作区即边界**：沿用 pi 已做好的 cwd + realpath，但边界判定收进网关统一执行。
4. **计量贯穿**：每次 agent 执行记一笔带 `tenantId` 的 token 账，"恰好一次"。
5. **执行核纯净**：`createAgentSession` 不改，agentDir/凭证由网关注入——这是将来抽成独立 runner（路线 3）的接缝。

## 关键事实（已核实）

1. `createAgentSession` / `SessionManager` / `ResourceLoader` 都接受**显式 `agentDir` 参数**；pi 执行路径不在内部重新读全局 env。`startRpcSession` 已显式传 `agentDir`。
2. `AuthStorage.create(authPath?)` 与 `ModelRegistry.create(authStorage, modelsPath)` 都接受**显式路径** → 凭证/模型可钉死全局共享，sessions/preferences 走 per-user，两者可拆开。
3. 每条 assistant 消息带 `usage`（input/output/cache token + cost）→ 计量数据齐全；但现有 `buildUsageSummary` 只算 runs 数，**未聚合 token**，需新写。
4. middleware 的 `hasValidLivoSessionCookie` 在 Edge runtime **只验签、拿不到 userId**（解 userId 要读磁盘 store）→ 租户上下文注入须在 route handler 层（Node runtime）。
5. `getAgentDir()` 现为无参全局函数，被 ~25 文件 ~54 处调用；pi 库内部 `config.ts` 另有同名全局函数（读 `PI_CODING_AGENT_DIR`）。
6. 文件隔离已较好（`cwdBelongsToLivoUser` + realpath 防逃逸）；session/preferences/skills/scene/memory 仍是共享单份。

## 分层架构（全部在 pi-app 单进程内）

```
┌─ 入口层 (middleware + 解析器) ──────────────────────────┐
│  解析 Livo session → 构造 TenantContext{tenantId,...}    │
│  Node runtime route 层解析（Edge 拿不到 userId）          │
│  以 AsyncLocalStorage 承载，供下游隐式读取                 │
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─ 网关层 TenantGate（新增，单一收口）─────────────────────┐
│  resolveAgentDir(tenant)        → per-user 数据目录       │
│  assertOwnsCwd / assertOwnsSession → 归属强制（realpath） │
│  recordUsage(tenant, sid, tok)  → 计量（本期写本地）      │
│  checkBudget(tenant)            → 预留接口（下期拦截）    │
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─ 执行层 (pi 库，不改) ───────────────────────────────────┐
│  createAgentSession({ agentDir: gate.agentDir, ... })    │
│  凭证/模型 → 全局共享路径（统一付费）                     │
└──────────────────────────────────────────────────────────┘
```

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

### 与上一版"withTenant 补丁"的关键差别

上一版让每个 route 自己 `withTenant`，漏套就泄漏。本版升级为**网关**：route 不再直接调 `SessionManager` / `fs` / 全局 `getAgentDir()`，只能通过 `TenantGate` 取资源。这就是 Shannon "单一强制网关"的落地——把隔离正确性从"靠自觉"变成"结构上绕不过"。

## 实施步骤（按依赖排序）

### Step 1 — 租户上下文与网关骨架
- `lib/tenant-context.ts`：`AsyncLocalStorage<TenantContext>`，`runWithTenant / getTenantContext / getTenantAgentDir`。
- `lib/tenant-gate.ts`：`TenantGate`，封装 `resolveAgentDir`、`assertOwnsCwd`、`assertOwnsSession`、`recordUsage`、（预留）`checkBudget`。
- `lib/with-tenant.ts`：route 包装器，读 Livo session → 构造 context → `runWithTenant`。非 Livo 请求透传（保持 CLI / loopback / Bearer 行为不变）。

### Step 2 — getAgentDir 接 ALS，凭证钉死全局
- `lib/agent-dir.ts`：`getAgentDir()` 优先返回 `getTenantAgentDir()`，否则回退现有逻辑。
- `lib/resolve-model.ts`：显式传全局 `auth.json` / `models.json` 绝对路径，**不受 ALS 影响**（统一付费）。
- 清点 54 处调用：sessions/preferences/scene/skills/memory 跟随租户；terminal/files 的 `roots.add(getAgentDir())` 收紧为租户 agentDir。

### Step 3 — Livo 可达 route 走网关
- 给 sessions、sessions/[id]、agent/new、agent/[id]、files、preferences、skills、usage、scene 等套 `withTenant`。
- 存储访问改为经 `TenantGate`，而非直接 `getAgentDir()` / `SessionManager`。
- `agent/new` 已有 `realCwdBelongsToLivoUser` 校验，改由网关 `assertOwnsCwd` 统一执行。

### Step 4 — per-tenant 计量
- `lib/usage.ts` 新增 token 聚合：遍历当前租户 agentDir 下 session 的 assistant 消息，累加 `usage.{input,output,cacheRead,cacheWrite}` 与 `cost.total`。
- `app/api/usage/route.ts`：在租户上下文中返回该租户 token/cost 汇总 + 现有 runs 汇总。
- 本期只展示，不拦截（`checkBudget` 留接口位）。

### Step 5 — 全局配置只读保护
- Livo 租户上下文下，`models-config` / `default-model` 等写接口返回 403（防一个用户改全局模型配置影响他人）。读保持可用。

### Step 6 — cwd 行为校正与验证
- 确认新 agentDir 生效后，session 列表/文件树落在租户目录内；旧共享 session 自然不再出现在 Livo 视图（满足"从空开始"）。

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
| 纯新增 Livo 模块 | `tenant-context.ts`、`tenant-gate.ts`、`with-tenant.ts`、per-tenant usage 聚合 | **集中在 `pi-app/lib/livo/`**（与现有 `livo-sso.ts` 等呼应） | 零（上游无此文件） |
| 必须改上游文件的接缝 | `agent-dir.ts` 的 `getAgentDir()`、route 套 wrapper、`resolve-model.ts` 钉死全局 | 改动**最小化为一行 hook**，逻辑全在 `lib/livo/` | 低（一行易解冲突） |

核心技巧：**把"改上游文件"压缩成"一行 hook 调用"**。例如 `getAgentDir()` 不写隔离逻辑，只改成 `return getTenantAgentDir() ?? <原逻辑>`，真正逻辑在 `lib/livo/`。上游即便重写该函数，冲突也只有一行。

> 注：现有 Livo 代码（`livo-sso.ts`、`livo-session-guard.ts` 等）分散在 `lib/` 根下。本期新增代码统一进 `lib/livo/`；存量文件不强制搬迁，但新引用尽量经由 `lib/livo/` 收口。

### 分支策略

- fork 的 `main` = 上游 + Livo 定制，持续演进；上游同步走 `git merge upstream/main`。
- 每个 Livo 需求开 feature 分支（如 `feat/multi-tenant-livo`），完成合回 `main`。
- 不另起长期平行主干——现有 fork 模式已足够隔离开源项目（推送只到 asiachrispy fork，上游不受影响）。

## 测试计划

- 单测：`getAgentDir()` 在 ALS 命中/未命中分别返回租户/全局路径；`resolve-model` 始终用全局凭证路径。
- 单测：`TenantGate.assertOwnsCwd/Session` 拒绝跨租户；per-tenant usage 聚合（两用户 fixture 不串）。
- 集成：两个不同 Livo userId 的请求，sessions / files / preferences 互不可见；凭证共享（都能调模型）。
- 回归：非 Livo（loopback / Bearer）路径 agentDir 仍走全局，行为不变。
- 安全：用户 A 带 cookie 访问用户 B 的 sessionId → 403。

## 非目标（本期不做）

- 预算超额拦截（只计量）。
- 存量 session 迁移（从空开始）。
- per-tenant 凭证 / 独立计费。
- 进程级 / 容器 / microVM 硬隔离。
- Temporal 工作流 / 多服务拆分 / 对外多租户 SaaS（路线 3）。
- 团队 / 共享工作区权限模型。

## 风险

- **网关覆盖面**：任何 Livo 可达 route 漏走网关 → fallback 全局 agentDir → 泄漏。缓解：Step 3 逐一清点 + 集成测试 + "有 Livo cookie 但无租户上下文"的运行时断言告警。
- **pi 库内部 getAgentDir**：pi 库自身 `config.ts` 全局函数不受 pi-app ALS 影响；但执行路径都走显式 agentDir 参数（已核实），仅需确认无遗漏的库内全局调用落到敏感数据。
- **terminal**：Livo 场景已 `PI_WEB_TERMINAL_DISABLED=1`，本期保持禁用，避免 terminal 路径的 agentDir 复杂度。
- **ALS 边界**：跨 `setTimeout`/事件回调时 ALS 上下文可能丢失（如 session idle timer、notify 回调）。需确认计量/归属判定都在请求同步链路内完成，异步回调里若要用租户身份须显式传参。
