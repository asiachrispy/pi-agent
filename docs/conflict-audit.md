# pi-app ↔ pi-web 合并冲突审计

> **历史档案**：本文记录的是 `pi-web` 仍作为独立共享层维护时的冲突审计。当前 `pi-web` 已移除，不再维护；Web + 桌面统一在 `pi-app` 维护。本文可用于理解早期 fork 差异来源，但不再代表当前合并流程。当前流程见 [`docs/pi-app-unified-maintenance.md`](docs/pi-app-unified-maintenance.md)。

**日期**：2026-06-10
**基线**：`pi-app` HEAD (`e336917`) vs `upstream/main` = `agegr/pi-web` HEAD (`cde99d7`)
**方法**：`pi-app` 相对 pi-web 当前版本「被修改的共有文件 (M)」即未来合并 pi-web 上游的冲突风险点；改动行数越多、重写比例越高，风险越大。

---

## 1. 概览

| 类别 | 数量 | 含义 |
|------|------|------|
| 共有文件被修改 (M) | **49** | 冲突风险点（pi-app 改了 pi-web 也有的文件） |
| pi-app 新增文件 (A) | **307** | 安全（pi-web 没有，不会冲突） |
| pi-app 删除文件 (D) | **5** | 仅 Next.js 脚手架默认 svg（`file/globe/next/vercel/window.svg`），无影响 |

**好消息**：307/361 的改动是「新增独有文件」，本身不产生冲突。真正的风险集中在 49 个共有文件，且其中只有约 10 个是深度重写的核心组件。

---

## 2. 冲突地雷清单（按改动行数降序）

### A. 机械冲突（必然发生，但好解）

| 文件 | 改动行 | 处理方式 |
|------|--------|----------|
| `package-lock.json` | 6695 | 合并时删掉、`npm install` 重新生成 |
| `package.json` | 93 | 取并集（依赖 + scripts） |
| `app/globals.css` | 217 | 多为 pi-app 新增样式，按段落取并集 |
| `next.config.ts` / `tsconfig.json` / `eslint.config.mjs` / `.gitignore` / `AGENTS.md` / `README.md` | 10–100 | 配置/文档，人工取并集，低风险 |

### B. 核心组件深度重写（高危，重点治理对象）

| 文件 | 改动行 | 现行数 | 重写比例 | 主要侵入逻辑 |
|------|--------|--------|----------|--------------|
| `components/BranchNavigator.tsx` | 404 | 536 | **≈75%** | i18n |
| `components/AppShell.tsx` | 618 | 894 | **≈69%** | i18n |
| `components/ChatInput.tsx` | 619 | 1327 | ≈47% | i18n + **piNative** + **scene/preset** |
| `components/ChatWindow.tsx` | 229 | 525 | ≈44% | i18n + scene |
| `hooks/useAgentSession.ts` | 380 | 903 | ≈42% | RPC 扩展 |
| `components/MessageView.tsx` | 443 | 1075 | ≈41% | i18n |
| `components/FileViewer.tsx` | 402 | 1236 | ≈33% | i18n |
| `components/SessionSidebar.tsx` | 399 | 1331 | ≈30% | i18n |
| `components/ModelsConfig.tsx` | 432 | 1817 | ≈24% | i18n |

### C. 中危（lib / API 路由，逻辑改造）

`lib/rpc-manager.ts`(106)、`lib/session-reader.ts`(83)、`lib/normalize.ts`(39)、`lib/pi-types.ts`(27)、`lib/types.ts`(19) 及十余个 `app/api/**/route.ts`（多为 4–96 行，新增鉴权/产品化字段）。

---

## 3. 根因分析

1. **i18n 国际化是头号系统性冲突源。** pi-app 的产品原则要求「所有 UI 字符串走 i18n」，于是几乎每个共有组件的硬编码文案都被替换成 `t("...")` 调用（AppShell / BranchNavigator / ChatInput / MessageView / SessionSidebar / ChatWindow / ModelsConfig / FileViewer / TabBar / SkillsConfig … 全部命中）。pi-web 上游用硬编码文案，**上游任何文案或 JSX 微调都会与 pi-app 的 i18n 化冲突**。这是 B 类高危文件重写比例高的主因。
2. **原生桥（piNative）隔离良好。** 仅 `ChatInput.tsx` 混入 2 处（选文件），其余原生能力都在 pi-app 独有文件里。**这是正确范式，应推广。**
3. **scene / preset 局部侵入。** 主要在 `ChatInput.tsx`(5)、`ChatWindow.tsx`(2)，可外提。
4. **RPC 扩展。** `useAgentSession.ts` / `rpc-manager.ts` 的改动是对接 `asiachrispy/pi` 引擎的自定义 RPC（navigate_tree 等），属于必要的跨线协同，难完全外提。

---

## 4. 重构建议（按性价比排序）

### P0 — 缓解 i18n 冲突（无法根治，因上游只读）
> **约束**：我们对 `agegr/pi-web` **无写权限**，i18n 无法回馈上游。因此它是一项**永久 fork 差异**，目标不是消除，而是让每次 merge 上游尽量能被 git 自动合并。
- **结构等价（最关键）**：i18n 改造只把字符串字面量替换成 `t("key")`，**绝不**顺手重排 JSX / 改组件结构——保持与上游逐行对应，git 三方合并才能自动吃掉上游对同一文件其他部分的改动。当前 `BranchNavigator` / `AppShell` 连结构都改了，是冲突放大器，应逐步回正。
- **文案集中**：key→译文集中在 `lib/i18n`，共有组件里只留 `t("key")` 调用点，不散落硬编码。
- **小步频繁合并**：`git fetch upstream && git merge upstream/main` 勤做，领先越少单次冲突越小。
- **半自动 merge 辅助**：对反复冲突的高频文件，建立「上游硬编码字符串 → 我方 `t(key)`」的映射脚本 / 自定义 merge driver，把人工解冲突降为机器可处理。

### P1 — 拆解深度重写的核心组件
- 对 `AppShell` / `ChatInput` / `ChatWindow`：把 pi-app 专属功能（scene 选择、preset、原生选文件、终端入口等）抽到 **pi-app 独有的子组件 / hook**（如 `useSceneInput`、`useNativeFilePicker`），主组件回归贴近上游的薄壳。
- 目标：让共有组件的 diff 从「整段重写」降为「少量挂载点」。

### P2 — 机械冲突自动化
- 加 `.gitattributes`：对 `package-lock.json` 设 `merge=ours` 或合并后统一 `npm install` 重生成。
- 合并 SOP：**小步、频繁** `git fetch upstream && git merge upstream/main`（领先越少，单次冲突越小）。当前领先 149 提交属健康，保持即可。

### P3 — 守住已经做对的边界
- 继续把所有 macOS / 远程 / 推送 / 场景 / 终端 / 用量等能力放在**新增独有文件**（已做得很好，307 个 A 文件零冲突）。
- 新功能优先走 `rpc-manager → useAgentSession → 独有 UI`，不要往共有组件里塞。

---

## 5. 小结

冲突面其实**可控**：风险高度集中在「i18n 对共有组件的系统性侵入」这一个根因上。由于上游 `agegr/pi-web` 只读、不可回馈，i18n 冲突**无法根治**，只能按「可维护的永久 fork 差异」管理——核心手段是**结构等价化**（i18n 只换字符串、不重排 JSX）+ 把专属逻辑外提到独有文件 + 小步频繁合并 + 半自动 merge 辅助，把每次合并成本从「逐文件手工解冲突」压到尽量自动合并。
