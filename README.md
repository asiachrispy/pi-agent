# pi-agent — Pi 三条产品线统一管理工作区

本目录用于**统一管理 Pi 生态的多个仓库**，方便在本地一起查看、二次开发与定期合并上游。

> 本 README 是「工作区说明书」，由我们自己维护，**不属于任何上游仓库**，因此不会影响各子仓库与上游的合并。
> 各子项目自带的 `README.md` 归属其各自上游，**请勿在本工作区随意修改**（尤其 `pi` 与 `pi-web`，改动会增加未来 merge 上游的冲突）。

---

## 1. 仓库总览

| 目录 | 角色 | origin（我们的 fork，可推送） | upstream（上游，只读·定期合并） |
|------|------|------------------------------|--------------------------------|
| `pi` | 引擎 / CLI | `asiachrispy/pi` | `earendil-works/pi` |
| `pi-web` | 纯浏览器 Web 工作台（上游中转站） | `agegr/pi-web` | —（它本身就是该线源头） |
| `pi-app` | macOS 桌面工作台（我们的主线） | `asiachrispy/pi-app` | `agegr/pi-web` |
| `pi-fetch-tool` | pi 扩展（`web_fetch` 工具） | `asiachrispy/pi-fetch-tool` | —（独立扩展包） |

经探测：`earendil-works/pi` 与 `badlogic/pi-mono` 是**同一个引擎上游**；`badlogic/pi-web` 不存在——`agegr/pi-web` 即 pi-web 这条线的原创源头。

---

## 2. 三条产品线的边界（职责互斥，避免功能交叉）

```mermaid
graph TD
    UP1["earendil-works/pi<br/>(= badlogic/pi-mono, 引擎上游)"] -->|fork·merge| PI["asiachrispy/pi<br/>【pi-cli 引擎二次开发】"]
    PI -->|npm runtime 依赖| APP
    UP2["agegr/pi-web<br/>(Web 上游 / 中转站)"] -->|fork·merge| APP["asiachrispy/pi-app<br/>【pi-app 桌面主线】"]
    EXT["asiachrispy/pi-fetch-tool<br/>(pi 扩展: web_fetch)"] -.->|pi install| PI
    EXT -.->|pi install| APP

    classDef ours fill:#1f6feb,stroke:#0b3d91,color:#fff;
    classDef up fill:#444,stroke:#222,color:#fff;
    class PI,APP,EXT ours;
    class UP1,UP2 up;
```

| 产品线 | 只负责 | 明确不做 |
|--------|--------|----------|
| **pi-cli**（`pi`） | Agent runtime、多 provider LLM、工具调用、会话 `jsonl` 格式、扩展机制、RPC 协议、TUI、`pi` 命令 | 任何 Web / GUI / 产品化文案 |
| **pi-web**（`pi-web`） | 跨平台纯 Web UI：会话浏览 / 对话 / 分支 / 模型切换 | macOS 壳、原生桥、桌面专属能力 |
| **pi-app**（`pi-app`） | `.app` 薄壳（WKWebView + 内嵌 Node）、`piNative` 原生桥、PWA、产品化白话 UI、远程 / 推送 / 场景 | 重新实现对话 / 分支 / 会话读取等 Web 核心逻辑 |

三者共享同一数据契约 `~/.pi/agent/`（`auth.json` / `settings.json` / `sessions/` / `models.json`，可用 `PI_CODING_AGENT_DIR` 覆盖），这是协作纽带，不算交叉。

---

## 3. git 同源事实（为什么不是“两份重复代码”）

- `pi-app` 与 `pi-web` **首提交 hash 完全相同**（`95c7a655`）→ `pi-app` 是 `pi-web` 的 **git 下游 fork**。
- `pi-web` 的 HEAD 正是两者的最近共同祖先，**`pi-app` 已包含 `pi-web` 的全部提交**，仅多出我们自己的二次开发提交。
- 即：`pi-app = 最新的 pi-web + 我们的二次开发`，并通过 `git merge upstream/main` **持续吸收 pi-web 上游**。

因此所谓“重复”是同一条 git 线上的二次开发，不是两份失控拷贝。

---

## 4. 上游合并工作流

约定：`origin` = 我们的 fork（可推送）；`upstream` = 上游（**只读，仅用于合并**）。
`pi` 与 `pi-app` 的 `upstream` push 地址已被禁用（`DISABLE_PUSH_UPSTREAM`），防止二次开发代码误推到上游。

```bash
# pi 引擎：合并上游
cd pi && git fetch upstream && git merge upstream/main

# pi-web 中转站：拉新（保持干净，几乎不在其上做业务开发）
cd pi-web && git pull origin main

# pi-app 主线：合并 Web 上游
cd pi-app && git fetch upstream && git merge upstream/main
```

---

## 5. 二次开发治理规则（核心：让上游可持续低冲突合并）

由于 `pi` 和 `pi-web` 都要**定期合并上游**，二次开发改到哪里，直接决定未来合并冲突的大小。

1. **改动归属**
   - 引擎能力 → 优先做成**扩展包**（参考 `pi-fetch-tool`），尽量不改 `pi` 引擎源码；必须改则集中、可 rebase（载体：`asiachrispy/pi`）。
   - 通用 Web 能力（不依赖 macOS）→ 理想做成可回馈 `agegr/pi-web` 上游的形态。
   - macOS / 桌面 / 原生 / 产品化能力 → **只进 `pi-app`，且尽量放在新增文件里**，不改 `pi-web` 共有文件。
2. **`pi-web` 保持干净**：本工作区里的 `pi-web` 仅作上游中转 / 比对镜像，不在其上做业务开发。
3. **警惕冲突地雷**：`pi-app` 已对部分 `pi-web` 共有文件做了大幅重写（如 `AppShell.tsx` ≈ 87% 不同），这些是未来 merge `pi-web` 上游的高冲突点。对共有文件**优先用扩展点 / 组合，而非整段重写**，把 macOS / 产品化逻辑抽到 pi-app 独有的新文件。
4. **命名澄清**：统一概念——`pi-web` = 上游纯 Web；`pi-app` = 我们的 macOS 产品。避免在 `pi-app` 内部文档继续自称 “pi-web”。

---

## 6. 当前本地状态（建立时快照）

| 仓库 | 分支 | HEAD | 相对上游 |
|------|------|------|----------|
| `pi` | `main` | `dcf0bbc3` | 二次开发领先 `earendil-works/pi` 约 17 提交 |
| `pi-web` | `main` | `cde99d7` | 即源头 |
| `pi-app` | `main` | `e336917` | 二次开发领先 `agegr/pi-web` 约 149 提交，待合并上游 0 |
