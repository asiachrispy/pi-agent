# pi-app ↔ pi-web 合并冲突审计

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

### P0 — 根治 i18n 冲突（收益最大）
- **首选：把 i18n 能力回馈到 `agegr/pi-web` 上游。** 若上游本身就 i18n 化，pi-app 不再需要改文案，B 类一半以上的重写量直接消失。
- **次选：i18n 改造尽量「结构等价」。** 只把字符串字面量换成 `t("key")`，不顺手重排 JSX / 改组件结构——保持与上游逐行对应，冲突可被 git 自动合并的概率大增。当前 BranchNavigator/AppShell 连结构都改了，这是冲突放大器。

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

冲突面其实**可控**：风险高度集中在「i18n 对共有组件的系统性侵入」这一个根因上。优先推动 i18n 上游化（或至少结构等价化），再把 3 个核心组件的专属逻辑外提，即可把未来每次合并 pi-web 上游的成本从「逐文件手工解冲突」降到「少量挂载点」。
