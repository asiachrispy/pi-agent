# Livo 集成优化代办清单

> 来源：code-simplifier 审查 + `docs/multi-tenant-livo-v1.md` 方案二对齐  
> 状态：`[ ]` 待办 · `[~]` 进行中 · `[x]` 完成

## P0 — 数据隔离与路径一致性（必须先做）

- [x] **T1** 新增 `pi-app/lib/livo/config.ts`：统一 `resolveLivoWorkspaceRoot()`、`isLivoSsoEnabled()`、`isLivoIntegrationEnabled()`
- [x] **T2** 新增 `pi-app/lib/livo/path-utils.ts`：抽取 `pathBelongsToRoot()`，消除 3 处重复
- [x] **T3** 统一 workspace root 默认值：`livo-sso.ts`、`workspace/route.ts`、`summary/route.ts`、`session-reader.ts` 全部改用 `resolveLivoWorkspaceRoot()`
- [x] **T4** 租户化 `pi-web-preferences.ts`：存储路径改用 `currentAgentDir()`（非租户自动回退全局）
- [x] **T5** 租户化 `scene-overrides.ts`：同上
- [x] **T6** 修复 `agent-resource-loader.ts`：`defaultLivoPluginPaths(agentDir)` 传入租户目录
- [x] **T7** 给缺失 route 套 `withTenant`：`preferences`、`preferences/excluded`、`scene-overrides/*`、`skills`（GET/PATCH/install）
- [x] **T8** 修正 `global-config-guard.ts`：仅拦截**全局**模型配置写（models-config、default-model）；租户 preferences/scene/skills 写入租户 agentDir 后放行
- [x] **T9** 修复 `livo-workspace-display.ts`：展示逻辑基于 `resolveLivoWorkspaceRoot()` 而非硬编码路径

## P1 — 代码清理与一致性

- [x] **T10** 删除死代码 `hasLivoSessionCookie()`（`livo-sso.ts` 无调用方）
- [x] **T11** `livo-sso.ts` 开关函数 re-export 自 `livo/config.ts`，消除语义分散
- [x] **T12** `skills/route.ts` GET 改用 `currentAgentDir()` 替代裸 `getAgentDir()`

## P2 — 认证层收敛（本期最小化）

- [x] **T13** 新增 `lib/auth-decision.ts`：抽取 loopback/Bearer/Livo cookie 判定纯函数，`middleware-auth.ts` 共用

## P3 — 验证

- [x] **T14** 运行 `pi-app` 单测（vitest）392/392 全绿
- [x] **T15** 运行 `tsc --noEmit` 无类型错误
- [x] **T16** 更新根 `CHANGELOG.md` `[Unreleased]` 段

## SSO / Auth 中期优化（近期 + 中期 #1–#8）

> 来源：SSO/auth 第三轮审查（`wiki/adr/0002-edge-node-auth-layers.md`）

### 近期（S0 / A0）

- [x] **#1** 修复 `app/page.tsx` store 失效时 `returnTo` 硬编码丢 query（保留 `?session=` / `?workspace=`）
- [x] **#2** 新增 `lib/livo/workbench.ts`：收口 `PI_WORKBENCH_BASE_PATH`、`isWorkbenchEntry`、`buildSsoStartUrl` 等
- [x] **#3** 新增 ADR `wiki/adr/0002-edge-node-auth-layers.md`：两层 SSO + Edge/Node auth 契约
- [x] **#4** 删 `authorizeRequestEdge` 死代码；新增 `lib/request-auth-common.ts` 供 middleware / remote-auth 共用

### 中期（A1–A2 + 覆盖审计）

- [x] **#5** 新增 `lib/auth/principal.ts`（`AuthPrincipal`）；`requireApiAuth` 返回身份主体
- [x] **#6** `withTenant` 改从 `resolveLivoPrincipal` 取 tenant，消除 cookie 二次解析
- [x] **#7** 新增 `lib/livo/route-coverage.ts` + 单测（59 条 API route 覆盖清单断言）
- [x] **#8** `PI_WORKBENCH_BASE_PATH` 环境变量（默认 `/app/`）；`middleware` / `livo-sso` / `page.tsx` 改用 workbench helper

### 验证

- [x] vitest 399/399 全绿
- [x] `tsc --noEmit` 无类型错误

## 非本期（记录，不执行）

- SSO 两层合并为单层：依赖 session store 外置（Redis/DB）后再做
- auth 三文件完全合并：依赖 Edge/Node 运行时差异，目标是 AuthPrincipal 而非单函数
- `next.config basePath:'/app'` 大迁移：需同步 Nginx + 全量 URL，单独 PR
- `notifyLivoPiStatus` 独立 token：运维配置项，不改

---

## 长期（路线 3 前置）#9–#12 — 审查完善方案（代码 + 配置对齐版）

> 审查基准：`pi-app` `main` @ `e7d31cc`；生产参考 `docs/piweb-install-tencent.md`（199 / `pi.gottao.com`）  
> 关联：`docs/multi-tenant-livo-v1.md` §路线 3 接缝、`wiki/adr/0002-edge-node-auth-layers.md`

### 一、生产现状（代码与 199 配置）

**部署形态（Pi Web 进程侧当前未接 Redis；Livo 基础设施已有 Redis，Pi 只需接线）：**

| 项 | 199 / 生产实际 | 代码落点 |
|----|----------------|----------|
| Pi Web 进程 | 单实例 systemd → `127.0.0.1:30141` | `server.js` standalone |
| **Redis（Livo Backend 已用）** | 见下表「Redis 拓扑」 | `livo-backend` `application-*.yml` |
| 全局 agent 根 | `PI_CODING_AGENT_DIR=/data/pi-agent` | `lib/agent-dir.ts` |
| Livo session 文件（Pi 侧，待迁 Redis） | `/data/pi-agent/auth/livo-sessions.json` | `livo-sso.ts` |
| ops 配置链 | `pi-app/.ops/_common.exp` → 读 `livo-backend/.ops/.env` | 同 SSH 主机 `43.138.130.199` |

**Redis 拓扑（来自 `livo-opc/livo-backend/src/main/resources/application-*.yml`）：**

| Profile | 默认 host | port | database | 用途（Livo 已有 key 前缀） |
|---------|-----------|------|----------|---------------------------|
| **dev** | `43.138.130.199`（199 本机） | 6379 | **0** | `livo_agent:login:*`、`livo:pi:sso:ticket:*`、`livo:pi:collaboration:*` |
| **test** | `43.138.130.199` | 6379 | **1** | 同上（测试隔离） |
| **prod** | `10.0.12.5`（VPC 内网） | 6379 | **2** | 生产 Livo Backend |

密码统一走环境变量 **`REDIS_PASSWORD`**（与 Livo Backend `.env` / systemd 一致，**勿写进 pi-app 仓库**）。

**Pi SSO 与 Redis 的关系（已部分在 Redis，但未打通 Pi Web）：**

- Livo Backend **SSO ticket** 已在 Redis：`RedisConstant.PI_SSO_TICKET_INFO = "livo:pi:sso:ticket:"`（单次消费、120s TTL，见 `docs/livo-pi-sso-release-log-2026-06-24.md`）
- Pi Web **登录后会话** 仍在 JSON：`livo-sessions.json`（#9 要迁的是这层，不是 ticket 层）
- 二者职责不同：ticket = 一次性换 cookie；session store = cookie sid → 用户态

**Pi Web #9 推荐接入（199 / dev 同机，不新装 Redis）：**

```bash
PI_SESSION_STORE_KIND=redis
# 与 Livo dev 同实例；password 从服务器 Livo Backend .env 的 REDIS_PASSWORD 读取
PI_SESSION_STORE_URL=redis://127.0.0.1:6379/3
PI_SESSION_STORE_PREFIX=pi:session:
```

- **database 用 3**（或空闲 db）：Livo 已占 0/1/2，避免与 `livo:pi:*` / `livo_agent:*` 键冲突（`docs/todo-8.md` P2-8 也要求跨环境键隔离）
- **key 前缀 `pi:session:`** 与 Livo 的 `livo:pi:sso:ticket:` 并列，不共用命名空间
- prod 若 Pi 与 Livo 同走 VPC Redis，则 `REDIS_HOST=10.0.12.5`、`REDIS_DB=3`（仍独立 logical db + 前缀）

| 项 | 补充 | 代码落点 |
|----|------|----------|
| Remote 配置 | `/data/pi-agent/pi-web-remote.json` | `remote-auth-store.ts` |
| Remote 审计 | `/data/pi-agent/pi-web-remote-audit.jsonl` | `remote-audit-log.ts` |
| 凭证/模型（全局） | `/data/pi-agent/auth.json`、`models.json` | `resolve-model.ts`（**不随租户切换**） |
| 租户数据 | `PI_WEB_LIVO_WORKSPACE_ROOT/users/{id}/.pi-agent/` | `tenant-context.ts` |
| S2S | `PI_WEB_REMOTE=1` + `PI_WEB_REMOTE_TOKEN` | 与 `livo.pi-agent.remote-token` 对齐 |
| SSO secret | `PI_LIVO_SESSION_SECRET` | 与 Livo `PI_SSO_VERIFY_TOKEN` 独立 |
| Terminal | `PI_WEB_TERMINAL_DISABLED=1` | Livo 场景已禁用 |

**两套会话系统（#9 必须一起抽象，不能只迁 Livo）：**

1. **Livo**：`createLivoSession` / `readLivoSessionCookieValue` — key=`sid`，TTL **7 天**；含 `legacyStoreKey(sidHash)` 兼容逻辑  
2. **Remote**：`redeemPairingCode` / `sessionExists` — session 在 `pi-web-remote.json` 的 `sessions[]`，TTL **30 天**；`recordAuthorizedSessionTouch` **每次授权整文件 rewrite**（多实例竞态）

**Edge 硬约束（影响 #10/#11 形态）：**

- Next **16.2.6**；`nodeMiddleware` 已移除（`CHANGELOG`：会拖入 `pi-coding-agent` 阻塞 dev）
- `middleware.ts` / `middleware-auth.ts` 仅 **Web Crypto + env**；不能 `readFileSync`、不能 scrypt 验 `tokenHash`
- SessionStore 在 Edge 侧只能用 **REST Redis（Upstash）** 或 **subrequest 回 Node 内部校验接口**

---

### 二、现状诊断（对照真实代码路径）

| 痛点 | 代码事实 | 199 单实例 | 路线 3 多实例 |
|------|----------|------------|---------------|
| Livo store | Node fs JSON | 可用 | revoke/登出不一致 |
| SSO 两层 | Edge：`hasValidLivoSessionCookie` 只验 HMAC；Node：`page.tsx` + store | 正常 | Edge 仍无法验 store |
| API zombie cookie | **签名有效、store 已删** → middleware L73 `next()` → handler `401` | 可接受 | 需 Edge 挡 |
| Middleware bypass | `middleware.ts:67-75`：Bearer **前缀** / cookie **存在** / Livo **签名** → 盲 `next()` | handler 验 token | 扫描进 Node |
| 鉴权双读 | `requireApiAuth` = `rejectUnauthorizedRequest` + 再 `resolveAuthPrincipal` | 次要 | 应合并 |
| 计量 | `buildTenantTokenUsage` 扫 jsonl；**无** `recordUsage` 挂点 | 租户少时可接受 | O(n) 不可扩展 |
| 审计 | `RemoteAuditEvent` 无 `tenantId`；Livo logout 不写 audit | 合规不足 | 商业化阻塞 |
| Principal 未贯穿 | `global-config-guard.ts` 仍 `readLivoSession(req)` | 小债 | #12 需统一 |

**middleware 测试（`middleware.test.ts`）已验证：**

- 无效 Livo cookie → API **403**  
- 有效签名 Livo cookie → `/app/` **200**（**不验 store**）  
- `PI_WEB_REMOTE=""` 时匿名 `/api/sessions` → **403**

**已预留接缝（#1–#8，勿回退）：** `AuthPrincipal`、`withTenant`←`resolveLivoPrincipal`、`route-coverage` 59 routes、ADR-0002。

---

### #9 — Session Store 外置（按生产分两轨）

**目标**：统一 `readLivoSession` / `sessionExists` / `deleteLivoSession` / `touchSession`；默认 `file` 保持本地零配置。

**改造落点**：新增 `lib/auth/session-store.ts`；改 `livo-sso.ts`、`remote-auth.ts`；保留 `signed-session-cookie.ts`（Edge 兼容）。

**Redis 键设计：**

```
pi:session:livo:{sid}       TTL 7d
pi:session:remote:{sid}     TTL 30d
pi:session:legacy:{sidHash} 迁移 alias（livo legacyStoreKey）
```

**199 路径（复用现有 Redis，仅 Pi 侧接线 + 独立 key 前缀）：**

| 子阶段 | 内容 |
|--------|------|
| **9a** | `FileSessionStore` 包装现有 JSON |
| **9b** | 配置 `PI_SESSION_STORE_URL` 指向**已有** Redis（同机/VPC/腾讯云实例均可）+ 双写 |
| **9c** | Node 读切 Redis；callback/logout 写 Redis |
| **9d** | 停写 JSON；导入 `livo-sessions.json` |
| **9e** | Remote `sessions[]` 迁入 + debounce `touchSession`（199 可延后） |

**接入前确认（运维，非新装 Redis）：** 实例地址/密码、逻辑库号（建议独立 `db` 或至少 `PI_SESSION_STORE_PREFIX=pi:`）、是否与 Livo Backend 共用实例（可共用，**key 必须前缀隔离**）。

**Edge 可达（#10 前置）：**

- **轨 A**：`PI_SESSION_STORE_UPSTASH_*` + `@upstash/redis`（middleware 可用）
- **轨 B（199）**：`GET /api/internal/session/exists`（仅 loopback + `PI_INTERNAL_VERIFY_TOKEN`）；middleware fetch；**matcher 排除该 path**

**环境变量：**

```bash
PI_SESSION_STORE_KIND=file|redis          # 默认 file；9c 切 redis
PI_SESSION_STORE_DUAL_WRITE=1             # 9b/9c 双写（file+redis）
PI_SESSION_STORE_URL=redis://127.0.0.1:6379/3   # 199/dev 同 Livo 实例，独立 logical db
PI_SESSION_STORE_PREFIX=pi:session:
PI_SESSION_STORE_PASSWORD=                # 可选；默认可读 REDIS_PASSWORD 或 URL 内嵌
```

**明确不动**：租户 session **jsonl** 仍在 `{workspace}/users/{id}/.pi-agent/sessions/`。

---

### #10 — SSO 单层化（依赖 #9c + Edge 轨 A/B）

| 层 | 当前 | #10 后 |
|----|------|--------|
| Edge | 仅 HMAC | HMAC + `SessionStore.get(sid)` |
| `page.tsx` | store 失效 → redirect | **仅** `initialDefaultCwd` |
| deep link | middleware 已保留 query | 不变 |

**199 分期：** 无 Edge store 时 **不可** 删 `page.tsx` redirect（会回退 zombie cookie UX）。10-Y 需 9c + 轨 B。

---

### #11 — Middleware 收紧（11a 可先于 Redis）

**问题**：`middleware.ts:67-75` 在 `authorizeMiddlewareRequest` **之前**盲放行，`decideMiddlewareAuth.hasValidBearer` 对带 Bearer 前缀的 API **从不执行**。

| 阶段 | 改动 | 199 |
|------|------|-----|
| **11a** | 删 `hasBearerPrefix` 盲放行；Edge 验 `PI_WEB_REMOTE_TOKEN` | ✅ 可立即 |
| **11b** | Livo：签名 + store | 需 9c + 轨 B |
| **11c** | Remote：签名 + store | ✅（`hasValidRemoteSessionWithStore` + `kind=remote`） |
| **11d** | 删 cookie 存在性放行 | ✅（middleware 仅 HMAC + store） |

**注意**：scrypt `tokenHash` **永不在 Edge 验**；199 已用 env token。

---

### #12 — Usage / 预算 / 审计

**代码 gap：**

- `rpc-manager.ts` `agent_end` 无 usage 写入；仅 `useAgentSession.ts` 客户端读 usage
- `/api/usage` 混用 `buildUsageSummary` + `buildTenantTokenUsage`
- `notifyLivoPiStatus` 已有 S2S 回调 → 可扩展为 usage 上报 Livo DB（199 无 PG 时备选）

**12a 审计（可先做）**：扩展 `RemoteAuditEvent` 加 `tenantId`/`principalKind`；挂 `livo/logout`、sso callback、global-config 403。

**12b 计量（分阶段，Pi 不直连 Supabase）**：

1. **M3**：`recordUsage(principal, …)` 挂 `rpc-manager` inner.subscribe（assistant 带 `usage` 时）；写入租户 jsonl 或内存增量聚合
2. **M4 / 路线 3**：扩展 `notifyLivoPiStatus` 同类 S2S，由 **Livo Backend 落 Supabase** `token_usage`（单一计费真相源）

**不推荐**：Pi Web 直连 Supabase 做全量计量（重复建设、多一套凭证与 RLS；组织/预算维度归 Livo 域）。

**12c 预算**：`checkBudget` 在 prompt 前；Livo 内网 **warn-only**；`global-config-guard` 改读 `AuthPrincipal`。

---

### 七、排期（199 重排）

| 里程碑 | 内容 | 199 依赖 |
|--------|------|----------|
| **M0** | 11a + 9a + 12a | 无 |
| **M1** | 9b–9c + 接入现有 Redis + 轨 B | 确认 `PI_SESSION_STORE_URL` |
| **M2** | 10 + 11b | M1 |
| **M3** | 12b jsonl recordUsage | ✅ |
| **M4** | 12c warn-only + Livo usage 回调（Pi 侧） | ✅；Livo 端点 + Supabase 由后端接 |

### 9d 会话 JSON 双写：建议保留（非必须停写）

| 阶段 | 建议 |
|------|------|
| **199 当前** | **保留** `PI_SESSION_STORE_DUAL_WRITE=1`（Redis 主读 + JSON 备份） |
| **何时停 JSON** | Redis 稳定运行、确认无回滚需求、多实例不再依赖文件时再设 `DUAL_WRITE=0` 或删 JSON 写入 |
| **不必急于 9d** | JSON 体量小（仅登录会话 sid）；双写是灾备/人工排查手段，与 M3 计量 jsonl 无关 |

- [x] **#12b** `recordUsage` + `token-usage.jsonl` + `/api/usage` 去重聚合

### 八、决策定稿（199 / 当前阶段，已确认）

| 决策 | 定稿 | 理由 |
|------|------|------|
| **#9 会话 store** | **复用现有 Redis**（db=3 + `pi:session:`） | 热路径键值语义；不新装 Redis；与 Livo ticket 职责分离 |
| **#9 会话 store** | ❌ 不用 Supabase 替代 Redis | 不解决 Edge 读 store；每请求 PG 延迟；TTL 不自然 |
| **#10 Edge 验 session** | **轨 B** loopback internal verify | 199 自建；禁 nodeMiddleware；不必 Upstash |
| **#11 Remote pairing** | 9e 延后 | Bearer S2S；terminal 已禁 |
| **#12 计量** | M3 jsonl → M4 Livo 回调写 Supabase | Pi 保持薄；计费真相源在 Livo |
| **#12 预算** | warn-only | 设计文档非本期目标 |

### 九、方案对比（为何选 A）

| 方案 | 会话 | 计量/审计 | 评价 |
|------|------|-----------|------|
| **A（定稿）** | Redis 复用实例 | jsonl → Livo→Supabase | ✅ 职责清晰、改动面小、与现有 Livo 栈一致 |
| **B** | 全会话进 Supabase | Pi 直连 PG | ❌ Edge 问题照旧；Pi 多一套 DB 凭证；会话热路径打 PG |
| **C** | 维持 JSON 文件 | 仅计量进 Supabase | ❌ #9 不解决；多实例/revoke/SSO 二层仍在 |

**一句话**：Redis 只管 Pi 登录后会话；Supabase 继续服务 Livo Backend；Pi 计量在路线 3 经 Livo 写入，不单独建 PG。

### 十、明确不做

- 恢复 `nodeMiddleware`
- 租户 jsonl / agentDir 迁 DB
- 未外置 store 时删 `page.tsx` SSO redirect
- Edge 验 scrypt `tokenHash`

### 十一、待办状态与落地顺序

**推荐实现顺序**：M0（11a + 9a + 12a）→ M1（9b–9c Redis）→ M2（#10 + 11b）→ M3（12b jsonl）→ M4（Livo 回调 + 12c）

- [x] **#9a** `FileSessionStore` 抽象（`lib/auth/session-store.ts`；`livo-sso` 已接入）
- [x] **#9b–#9c** Redis 双写 + Node 读切（`redis` 包 + 进程内缓存；`PI_SESSION_STORE_*`；`instrumentation` warm）
- [x] **#10** SSO 单层（Edge HMAC + internal verify；`page.tsx` 在 `PI_INTERNAL_VERIFY_TOKEN` 配置时不再做 store redirect）
- [x] **#11b** Livo cookie：签名 + store（`hasValidLivoSessionWithStore` + `/api/internal/session/exists`）
- [x] **#11c** Remote cookie：签名 + store（`hasValidRemoteSessionWithStore` + `?kind=remote`）
- [x] **#11d** 删 cookie 存在性放行（middleware 不再盲放行 `pi_web_session`）
- [x] **#12a** 审计 `tenantId`/`principalKind` + logout / SSO callback / global-config 挂点
- [x] **#12c** `checkBudget` warn-only（`PI_LIVO_TENANT_BUDGET_USD`；prompt 前日志）
- [x] **#12 M4** Livo usage 回调（Pi `notifyLivoTokenUsage` + Livo Backend `POST /pi-agent/callbacks/usage` → Supabase `token_usage`）
- [ ] **#9** SessionStore 其余（**9d 停 JSON 非必须**；9e Remote 会话迁入可延后）
