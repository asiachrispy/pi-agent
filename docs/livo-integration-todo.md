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
