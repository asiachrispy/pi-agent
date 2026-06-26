# ADR-0002：Edge/Node 双层 SSO 与 API 认证契约

> Status: 已采纳  
> 关联: [ADR-0001 Livo SSO ticket auth](./0001-livo-sso-ticket-auth.md)、`docs/multi-tenant-livo-v1.md`

## 背景

Pi Web 同时服务：

- **本地 loopback**（桌面 bundle / dev）
- **远程 Bearer S2S**（Livo 后端派发）
- **Livo SSO 浏览器用户**（`pi_livo_session`）

Edge middleware 与 Node route handler 运行在不同 runtime，能力不同。

## 决策

### 1. SSO：两层门禁（不合并）

| 层 | 位置 | 校验 | 职责 |
|----|------|------|------|
| Edge | `middleware.ts` | cookie **签名 + 过期** | 未登录快速 307 → Livo |
| Node | `app/page.tsx` | 签名 + **磁盘 store** | 残留 cookie 再登录；注入 `initialDefaultCwd` |

**原因**：Edge 无法读 `livo-sessions.json`；RSC 需确认 store 存在，避免用户落到「需要远程认证」UI（见 CHANGELOG Fixed）。

**契约**：

- 正常无 cookie：仅 Edge 一次重定向（保留 query）
- 签名有效但 store 缺失：Edge 放行 → page 再 redirect（须保留 query，见 `buildSsoStartUrl`）

### 2. API Auth：乐观 Edge + 严格 Node

| 层 | 行为 |
|----|------|
| Edge middleware | Bearer 前缀 / cookie 名 / Livo 签名 → `next()` |
| Node `requireApiAuth` | `resolveAuthPrincipal` → 完整 disk auth |

Handler **必须**调用 `requireApiAuth`；不得假设 middleware 已完整鉴权。

### 3. AuthPrincipal（路线 3 预留）

`lib/auth/principal.ts` 定义统一身份：

- `loopback` / `bearer` / `remote` / `livo` / `open`
- Livo 的 `tenantId` 现等于 `livoUserId`；对外开放时可换为组织维度

`withTenant` 从 `resolveLivoPrincipal` 取 tenant，不二次读 cookie。

### 4. 工作台路径

- 默认 `/app/`，可由 `PI_WORKBENCH_BASE_PATH` 覆盖
- prod 依赖 Nginx 反代 + `X-Pi-Workbench-Entry`；**尚未**启用 `next.config basePath`
- 常量收口于 `lib/livo/workbench.ts`

### 5. 非目标（本期）

- 合并 SSO 单层（需 session store 外置 Redis/DB 后评估）
- middleware 在 Edge 读磁盘 remote config（保持 `PI_WEB_REMOTE=1` env 为准）
- 完全删除 optimistic API bypass（路线 3 对外 SaaS 时再收紧）

## 后果

- 新增 auth 分支须同时考虑 Edge 信号收集与 Node `resolveAuthPrincipal`
- 修改 returnTo / 工作台 URL 须走 `lib/livo/workbench.ts`
- route 租户化变更须更新 `lib/livo/route-coverage.ts`
