# pi-agent — Pi 工作区维护说明

本目录用于维护 Pi 生态相关仓库的本地协作规范。

> 本 README 是「工作区说明书」，由我们自己维护，**不属于任何上游仓库**。

---

## 1. 仓库总览

活跃维护两条主线：

| 目录 | 角色 | origin | upstream |
|------|------|--------|----------|
| `pi` | 引擎 / CLI | `asiachrispy/pi` | `earendil-works/pi` |
| `pi-app` | Web + macOS 桌面主线 | `asiachrispy/pi-app` | 以仓库当前 `upstream` 配置为准 |

关键约束：
- 所有 Web UI、PWA、macOS 壳与原生桥改动，统一落到 `pi-app`。
- 引擎、CLI、agent runtime、工具调用、会话协议与扩展机制改动，落到 `pi`。
- `earendil-works/pi` 无写权限；对上游共有文件的改动属长期 fork 差异，目标是易于持续合并。

---

## 2. 产品线边界

| 产品线 | 负责 | 不做 |
|--------|------|------|
| **pi**（`pi`） | Agent runtime、多 provider LLM、工具调用、会话格式、扩展机制、RPC、TUI | Web / GUI / macOS 壳 |
| **pi-app**（`pi-app`） | Next.js Web UI、PWA、macOS 薄壳（WKWebView + 内嵌 Node）、`piNative` 原生桥、远程 / 推送 | 重新实现 agent runtime、工具系统、模型 provider |

共享数据契约：`~/.pi/agent/`（`auth.json` / `settings.json` / `sessions/` / `models.json`）。

---

## 3. 上游合并工作流

```bash
# pi 引擎
cd pi
git fetch upstream
git merge upstream/main
git push origin main

# pi-app（统一 Web + 桌面）
cd ../pi-app
git fetch upstream
git merge upstream/main
git push origin main
```

要点：
- 合并前先提交或暂存工作区改动。
- 合并后必须验证再打包：`tsc --noEmit` + `vitest run`；pi-app 还需 `swift build` / `swift test`。
- 合并若有冲突，保留双方真实意图；对 pi-app 已成熟的产品化实现，不因历史形态而回退。
- 上游无更新时确认即可，不空合并。

---

## 4. 治理规则

1. **改动归属**：引擎能力优先查 [pi.dev/packages](https://pi.dev/packages) 有无社区扩展；Web/产品/macOS → pi-app。
2. **减少 fork 差异**：改上游共有文件时最小插入、少重排；产品化逻辑抽到 pi-app 独有组件。
3. **命名**：对外产品和代码主线称 `pi-app`。

---

## 5. 打包与发布

macOS 打包统一走 Next standalone 输出（自 v0.8.2）。

- 打包入口：`npm run package:macos`（`pi-app/scripts/package-macos-app.sh`）
- bundle：`server.js` + 追踪后的 `node_modules` + `.next/static` + 内嵌 Node
- 体积基线：Pi.app ≈ 224M、DMG ≈ 93M

发布前：同步上游 → 验证全绿 → 更新 `CHANGELOG.md` → 重新打包 → 冷烟（`/`、`/api/health`、`/api/sessions` 均 200）→ 打 tag → GitHub Release。

---

## 6. 工作区骨架

| 路径 | 作用 |
|------|------|
| `.pi/agents/team.md` | 统一交付 agent |
| `.pi/extensions/team-entry/` | `/team` 扩展命令 |
| `.pi/APPEND_SYSTEM.md` | `/team` 入口（→ team.md） |
| `wiki/` | 长期知识（summary / 路由表 / 验证规则） |
| `demands/` | 任务卷宗 `D-YYYY-NNN-*.md` |
| `JTBD/` | 个人待办 |
| `scripts/` | 环境检查、demand id、snapshot 等 |
| `workspace.config.yaml` | 业务仓清单 |

快速开始：
```bash
./scripts/check-pi-env.sh
# 在 Pi 中打开本目录，/reload，执行 /team <意图>
```

---

## 7. pi 引擎长期差异

| 主题 | 增量内容 | 关键文件 |
|------|----------|----------|
| RPC 树导航 + 远程驱动 | 会话树导航与工具命令 | `coding-agent/src/modes/rpc/*`、`core/agent-session-tree.ts` |
| memory 记忆扩展 | 首次运行自动安装 | `coding-agent/examples/extensions/memory.ts` |
| Agnes AI provider | 新增 provider 与模型 | `ai/src/providers/*` |
| package-manager 重构 | 拆分 git/npm/source-parser | `core/package-manager-{git,npm}.ts` |
| AI 重试/定价/responses | 重试分类、service-tier 定价 | `ai/src/utils/retry-classification.ts` |

---

## 8. 相关文档

- [`docs/pi-app-unified-maintenance.md`](docs/pi-app-unified-maintenance.md) — pi-app 统一维护 SOP
- [`pi-agent-design-v5.md`](pi-agent-design-v5.md) — /team 协议设计文档
- `docs/pi-web-merge-maintenance.md`、`docs/conflict-audit.md`、`docs/pi-app-to-pi-web-uplift.md` — 历史档案，仅供追溯
