---
scope: project-map
owner: tech
status: current
---

# 项目地图

> 与 `workspace.config.yaml` 对齐。业务仓仅 `pi` 与 `pi-app`。

## 工作区根

| 路径 | 说明 |
|---|---|
| `pi-agent/`（本仓库） | agent 配置、wiki、demands、脚本；**在 Pi 中打开此目录** |
| `pi/` | Pi 引擎 monorepo（独立 git，gitignore） |
| `pi-app/` | Web UI + macOS 桌面（独立 git，gitignore） |

## 业务仓库

| 仓库 id | 路径 | 类型 | origin | upstream（pi 引擎） | 常用命令 |
|---|---|---|---|---|---|
| `pi` | `pi/` | engine | `asiachrispy/pi` | `earendil-works/pi` | `npm run check`、`npm test` |
| `pi-app` | `pi-app/` | app | `asiachrispy/pi-app` | — | `npx tsc --noEmit`、`npx vitest run`、`swift build`、`swift test` |

### pi（引擎）主要包

| 包路径 | 职责 |
|---|---|
| `packages/coding-agent` | CLI、扩展、会话、RPC |
| `packages/agent` | Agent loop |
| `packages/ai` | LLM provider |
| `packages/tui` | 终端 UI |

### pi-app（产品）主要路径

| 路径 | 职责 |
|---|---|
| `app/` | Next.js 路由与 API |
| `components/` | Web / 桌面 UI |
| `macos/` | Swift 壳与原生桥 |
| `scripts/package-macos-app.sh` | macOS 打包（standalone） |

## 归属规则

| 改动类型 | 目标仓 |
|---|---|
| Agent runtime、工具、扩展、RPC、provider、会话协议 | `pi` |
| Web UI、PWA、Next API、macOS 壳、`piNative`、打包发布 | `pi-app` |
| 工作区规范、demands、wiki、`.pi/` 配置 | `pi-agent`（本仓） |
| 跨仓需求 | demand 标明两仓；先引擎后产品或按依赖顺序 |

## subagent `project` 别名

```text
auto          # 按任务/cwd 推断
root / pi-agent / workspace   # 工作区根（wiki、demands、脚本）
pi / engine / cli             # pi/
pi-app / app / web / desktop  # pi-app/
```

## 环境入口

见 `wiki/environments.md`。打包发版前须按 `AGENTS.md` 同步上游并验证全绿。

## Pi 入口

- 打开 **pi-agent 根目录**（不是单独打开 `pi/` 或 `pi-app/`）
- `/reload` → `/team <意图或 D-xxx>`
