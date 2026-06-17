---
scope: project-overview
owner: tech
status: current
---

# 项目总览

本工作区维护 **Pi 生态**两条产品线 + 交付协作层。

## 业务域

- **Pi 引擎**（`pi`）：本地/远程可运行的 coding agent runtime，含 CLI、扩展、多 provider、会话持久化。
- **Pi 产品**（`pi-app`）：面向用户的 Web UI 与 macOS 桌面应用，依赖引擎 npm 包，不重复实现 agent 内核。
- **pi-agent 工作区**：`/team` 单命令交付、`demands/` 任务卷宗、`wiki/` 长期知识。

## 架构摘要

```text
earendil-works/pi (upstream)
        ↓ merge
asiachrispy/pi (pi/) ──npm 依赖──► asiachrispy/pi-app (pi-app/)
        ↑                                    ↑
   agent / tools / RPC              Next.js + Swift 壳
```

共享数据目录：`~/.pi/agent/`（`auth.json`、`settings.json`、`sessions/`、`models.json`）。

## 领域语言

| 术语 | 含义 | 避免用 |
|---|---|---|
| Pi / 引擎 | `pi` 仓库产物，`@earendil-works/pi-*` 包 | 把整个桌面叫「pi」 |
| Pi.app | `pi-app` 打包的 macOS 应用 | `pi-app` 桌面版 |
| demand | `demands/D-*.md` 任务卷宗 | 用 wiki 代替执行状态 |
| `/team` | 唯一日常交付命令 | mk-dev / mk-pm 等历史命令 |
| upstream | 引擎只读上游 `earendil-works/pi` | 与 origin fork 混淆 |

## 高风险点

- **跨仓**：`pi-app` 锁定的 `pi-coding-agent` 版本与本地 `pi` 开发版本不一致。
- **打包发布**：须先 merge upstream、`check`/`test` 全绿，再走 `package:macos`（standalone）。
- **会话数据**：测试产生的 `--var-folders-*` 孤儿 session 须清理（见 `AGENTS.md`）。
- **fork 冲突**：`pi` 合并 upstream 时 package-manager 等长期差异需按 README 归属处理。

## 协作边界

| 问什么 | 去哪 |
|---|---|
| 工具怎么实现、扩展怎么写 | `pi` |
| 页面/API/桌面体验 | `pi-app` |
| 需求状态、AC、验收记录 | `demands/` |
| PRD、验证策略 | `wiki/` |
