# pi-app → pi-web 通用能力「上移」评估

**目的**：分层模型（`agegr/pi-web` → `asiachrispy/pi-web` → `asiachrispy/pi-app`）下，**通用 Web 能力应沉淀在 pi-web 层**。pi-app 历史上积累了 149 个提交，其中不少其实是通用 Web 能力，被放在了 pi-app。本文评估哪些适合上移到 `asiachrispy/pi-web`，以减少 pi-app 对共有文件的偏离、消除双份维护。

**方法**：基于 149 个提交（140 非 merge + 9 merge）的分类。精确归属仍需逐提交看 diff；本文给出类别、优先级与执行建议。

---

## 0. 执行进度

> **#1 / #2 / #3 已全部合并入 `asiachrispy/pi-web` 的 `main`**（merge commit `b1af076`，合并后 tsc / vitest(83) / eslint / build 全绿）。`main` 现已累积：vitest 测试框架、i18n 框架、终端面板、文件附件基础设施（`message-file-refs` / `FileAttachmentChip`）。后续上移**基于这个新 main**，不再各自重复引入 vitest，碰 i18n 的可直接用 `t()`。


| 对象 | 状态 | 产出 |
|------|------|------|
| **终端面板（P1）** | ✅ 已上移 | `asiachrispy/pi-web#1`（`feat/terminal-panel`），tsc/vitest(64)/eslint/build 全绿 |
| **i18n 框架（P3→提前）** | ✅ 框架已上移 | `asiachrispy/pi-web#2`（`feat/i18n-framework`），tsc/vitest(12)/eslint/build 全绿 |
| **输出文件预览（P1，f7186a9）** | ✅ 已上移 | `asiachrispy/pi-web#3`（`feat/output-file-preview`），tsc/vitest(7)/eslint/build 全绿 |

### 输出文件预览上移的依赖修正（再次推翻「最独立」初判）

- 原列「最独立 P1」，实际 `f7186a9`（6/5）依赖更早的附件提交 `f2f449f`（6/4）引入的 `lib/message-file-refs` 与 `components/FileAttachmentChip`。
- 经依赖闭包分析后可干净拆出：`message-file-refs` 无任何 import（纯叶子）；`FileAttachmentChip` 仅依赖它 + react，**不碰 i18n/PDF/原生桥**；`assistant-output-files` 依赖 `file-paths`（pi-web 已有）+ `message-file-refs`。故基于 `main` 独立完成，无需 i18n。
- 挂载点手动重做：把 `onOpenFile` + `cwd` 经 `AppShell → ChatWindow → MessageView → BlockView → TextBlock` 透传（pi-web 此前 `onOpenFile` 仅接 sidebar/explorer，本次补接聊天消息流）。
- **教训固化**：上移前必须做相对路径 + `@/` 的完整依赖闭包分析，文档的「独有/低冲突」初判已两次被推翻（终端拖出 remote-auth、本次拖出附件基础设施）。

### i18n 框架上移的范围与策略

- **战略提前**：原列 P3，但由于 pi-app 通用改动几乎都已 i18n 化，只要框架不先就位，后续每个触及共有组件的上移都会与 i18n 纠缠，故提前。
- **本次只上移「框架基建」**：`lib/i18n/*`（核心 + provider + 全量 messages）、根 layout 接入、locale 自动检测（无手动切换 UI，与 pi-app 一致），并 i18n 化 `TabBar` 作冒烟验证。
- **messages 整体搬全集**：pi-web 含少量 pi-app 独有 key（死数据），换取 pi-app 合并时 messages 零冲突收敛、共享层持有统一字典。
- **组件 i18n 化走增量**：其余 ~11 个共有组件暂保持英文硬编码，随各自功能上移时再 i18n 化，避免一次性深改所有共有文件、拉满与 `agegr` 上游的冲突面。
- **两个 PR 相互独立**：#1 与 #2 各自引入 vitest，可任意顺序合并；package.json 若冲突用 `git rerere` 解一次。

### 终端上移的关键发现与决策（修正了「28 文件全独有、整体搬运无冲突」的初判）

1. **依赖闭包比预估大**：之前只统计 `@/` import，遗漏了相对路径 import。终端经 2 行薄封装 `lib/api-auth.ts` 耦合了 pi-app 的**远程访问/中继配对子系统** `lib/remote-auth`（再拖出 `pi-relay/*`、`remote-audit-log`、`remote-auth-store` 等一整套）。
2. **解耦而非整体搬运**：`remote-auth` 是桌面层独有产品化能力，**不进通用 Web 层**。pi-web 改为提供**本地版 `api-auth`**（仅放行同源 loopback，跨源拒绝），不依赖 `remote-auth`。终端 4 个 route 测试本就 `vi.mock("@/lib/api-auth")`，故简化实现不影响测试。
3. **`api-auth.ts` 成为有意的永久 fork 差异**：pi-web = 本地基线，pi-app = 远程增强。pi-app 合并 pi-web 时该单文件冲突保留 pi-app 版即可（建议 `git rerere` 记录一次）。
4. **pi-web 此前无测试设施**：本次一并引入 `vitest` + `@testing-library/react` + `jsdom`（pi-web 从此具备测试能力）。
5. **实际挂载点只有 `AppShell`**（顶栏 toggle + 中间列底部 drawer），并不涉及 `ChatInput`/`ChatWindow`，`OpenTerminalButton` 组件在 pi-app `main` 实际未使用。

---

## 0.5 重大修正：FileViewer 预览组「不上移，应收敛到上游」

评估 `f2f449f` / `5a4c878` / `4fac26d` 时发现：**pi-web 上游(agegr) 与 pi-app 各自平行实现了 FileViewer 预览**，并非「pi-app 独有待上移」。

| 能力 | pi-web 上游(持续维护) | pi-app fork |
|------|----------------------|-------------|
| 图片/音频预览 | ✅ ImageViewer/AudioViewer | ✅ 另一套 |
| PDF | ✅ iframe + `/api/files?type=read` | ✅ PdfCanvasViewer(pdfjs canvas) |
| docx/markdown | ✅ DocumentViewer/TextFileViewer | ✅ file-preview kind 系统 |
| live sync(watching) | ✅ **pi-web 独有** | ❌ |
| 预览截图导出 PNG | ❌ | ✅ preview-image-export |
| office 系统打开 | ❌ | ✅(piNative，桌面专属) |

**结论**：把 pi-app 版盖到 pi-web = 丢掉 agegr 上游实现(含 live sync) + 巨大永久冲突 + 加剧双份维护，与上移初衷相反。

**正确处置**：
- FileViewer 预览主体(图片/音频/PDF/docx/markdown) → **pi-app 收敛到上游**，合并 pi-web 时弃用自己的 `PdfCanvasViewer`/`FilePreviewHeader`/`file-preview` 平行实现。**不上移。**
- `preview-image-export`(预览截图导出) → pi-web 真缺的通用能力，**可单独上移**，但需重挂到 pi-web 的 FileViewer 架构、剥离 piNative。优先级低。
- office 系统打开(piNative) → 桌面专属，**留 pi-app**。

> **方法论教训（已三次踩坑）**：上移前除了做依赖闭包分析，还必须确认 **pi-web 上游是否已有平行实现**。pi-web(agegr) 在 pi-app fork 后持续演进，很多「pi-app 能力」其实上游已有。后续每个候选都要先做「pi-web 现状核查」。

## 0.6 P2 候选核查结论：简单上移阶段已结束

对 P2 清单逐个做「pi-web 现状核查」后，结论是**剩余候选已无「干净独立」的通用上移**：

| 候选 | pi-web 现状 | 处置 |
|------|------------|------|
| 侧栏自动打开/过滤 tmpdir (`a462b1d`/`4d147d4`) | pi-web SessionSidebar **已有**「最近活跃 cwd」逻辑 | 多半平行重复 → 收敛 |
| 用量报告移顶栏 (`5c3615a`) | pi-web AppShell **已有** sessionStats/contextUsage | 平行 → 收敛 |
| 会话恢复/历史 (`2245e54`) | 依赖 pi-app `product-sessions` API | 产品化专属 → 留 pi-app |
| per-session 模型 (`100c240`) | 深改 `AccountsSettings`/`WorkbenchSettings`(pi-app 独有)+共有 | 高成本/纠缠 |
| session-projects (`a462b1d` 等) | pi-web 无，但属 workbench 产品化模型 | 留 pi-app |
| skill workflow + slash (`0d326d3`) | pi-web **真缺 slash 命令**，但依赖 pi-app `rpc-manager`/`agent-resource-loader` | 待评估（唯一候选） |

**总判断**：3 个真正干净的通用能力（终端、i18n 框架、输出文件预览）已上移合并。剩余 146 提交里，绝大多数是 ①pi-web 上游已有平行实现（应 pi-app 收敛）、②pi-app 产品化专属（留 pi-app）、③深度纠缠（高成本低确定性）。**后续重心应从「逐个上移」转为「pi-app 合并 pi-web 时收敛到上游」**，上移仅保留个别零星点（如 slash 命令，待评估）。

## 1. 分类总览

| 类别 | 处置 | 说明 |
|------|------|------|
| macOS 壳 / 原生桥 / `piNative` / 电源管理 | **留 pi-app** | 桌面专属，pi-web 无意义 |
| 品牌（Pi-Agent 命名、logo、pi-app 重命名） | **留 pi-app** | pi-app 产品身份 |
| CI / 发布 / lockfile / 版本号（大量 `0.7.x`、`fix(ci)`） | **留 pi-app** | pi-app 的发布流水线 |
| **终端面板** | **✅ 已上移** | 见 §0；经 api-auth 解耦远程鉴权后上移（pi-web#1） |
| 文件查看 / 附件 / 预览（FileViewer、附件、输出预览） | **上移 P1** | 通用 Web，多为独有文件 + 少量共有挂载点 |
| 侧栏 / 项目选择器（auto-open、过滤 tmpdir） | **上移 P2** | 通用，但改共有 `SessionSidebar` |
| 会话恢复 / 历史 / per-session 模型 | **上移 P2** | 通用 |
| 分享会话（share links / shared view） | **上移 P2** | 通用，独有文件居多 |
| 安全（file access、api auth 收紧） | **上移 P2** | 通用 Web 安全 |
| skill workflow / slash 命令选择器 | **上移 P2** | 通用 |
| **i18n 框架** | **✅ 框架已上移** | 见 §0；已提前，组件 i18n 化走增量（pi-web#2） |
| workbench 产品化首页（M1–M4、白话 UI） | **需决策** | 技术上纯 Web，但属 pi-app 产品定位；见 §5 |
| remote 访问 / Web Push | **多半留 pi-app** | 偏产品化/桌面；其中 branch-tree 等通用部分可拆出上移 |
| scenes / onboarding / automation | **不处理（已废弃）** | 已被 `0fe8164 remove scenes/onboarding/automation` 移除 |
| 文档 / plans / specs | 随对应功能走 | superpowers/plans 等 |

---

## 2. 上移优先级清单

- **P1（独立、纯通用、低风险，先做）**
  - 终端面板（§3）
  - 文件查看/附件/预览：~~`f7186a9` 输出文件预览（✅ 已上移 #3）~~、`5a4c878` 预览图导出、`f2f449f` 文件附件预览、`4fac26d` FileViewer 行内工具栏
- **P2（通用但触及共有组件，需结构等价）**
  - 侧栏：`a462b1d` 自动打开最近会话、`4d147d4` 过滤 tmpdir 会话
  - 会话：`7188a42` 保留首条消息、`2245e54` 会话恢复/历史、`100c240` per-session 模型
  - 分享：`9d70c16` 安全分享、`11b5404`（拆出 share 部分）
  - 安全：`c77d7b9` file access + api auth
  - skill：`0d326d3` skill workflow + slash 选择器
  - usage：`5c3615a` 用量报告移到顶栏
- **P3（基础设施，影响面大）**
  - i18n 框架：`3f77a7d` / `9c6e8e3` / `773d2ed`（见 §4）

---

## 3. 首推上移对象：终端面板

**为什么先做它**：
- **28 个文件全部是 pi-app 独有新文件**（`app/api/terminal/**`、`components/Terminal*`、`components/OpenTerminalButton*`、`hooks/useTerminal*`、`lib/terminal/**`）——pi-web 上游全无，整体搬运不产生冲突。
- **自带完整 TDD 测试**（每个模块都有 `.test`），上移后 pi-web 侧即有回归保护。
- **共有挂载点已最小化**：仅 `AppShell` / `ChatInput` / `ChatWindow` 接线；其中 `AppShell` 的终端开合状态已抽成 `hooks/useTerminalPanel`（见 pi-app#7），挂载更干净。

**执行建议**：
1. 在 `pi-web` 新建分支，把 28 个独有文件按 TDD 顺序 `git cherry-pick`（或直接拷贝）过来——因都是新增文件，cherry-pick 基本无冲突。
2. 在 pi-web 的 `AppShell` / `ChatInput` / `ChatWindow` **手动加挂载点**（接 `OpenTerminalButton` + 终端 drawer + `useTerminalPanel`）——pi-web 这些文件没有 pi-app 的其它改动，手动接线最干净、最贴近上游结构。
3. `npm run lint && npx tsc --noEmit && npx vitest run` 全绿后 push 到 `asiachrispy/pi-web`。
4. 下次 pi-app 合并 pi-web，终端能力变为「来自共享层」；pi-app 侧同名文件与上游内容收敛，后续不再双份维护。

---

## 4. i18n：分层 + 可写 pi-web 改变了结论

之前结论是「i18n 冲突无法根治（上游只读）」。**在分层模型 + 我们可写 `pi-web` 的前提下，这一点可以改善**：

- 若把 **i18n 框架上移到 `asiachrispy/pi-web`** 并让 pi-web 层自身 i18n 化，则 `pi-app` 合并 `pi-web` 时**不再有 i18n 冲突**（两者共享同一 i18n 化的共有组件）。
- 残留的 i18n 冲突只剩**单一接缝**：`asiachrispy/pi-web` ←合并← `agegr/pi-web`（上游硬编码 vs 我们的 `t(key)`）。从「pi-web + pi-app 两层都冲突」降为「仅 pi-web 一层冲突」，再配合结构等价 + rerere + 半自动映射，成本大幅下降。

> 代价：`asiachrispy/pi-web` 会比 `agegr/pi-web` 多出 i18n 差异（这是我们 fork 的既定选择）。属 P3、影响面大，建议在 P1/P2 跑顺、合并流程稳定后再做。

---

## 5. 待决策：workbench 产品化首页算谁的？

`044f14f` / `da9cf6a` / `1e66367` / `11b5404` / `0fe8164` 等 workbench（M1–M4）提交，技术上是纯 Web，但承载 pi-app「面向非技术用户的白话产品化」定位。两种取向：

- **留 pi-app**：把 workbench 视为 pi-app 的产品外观，pi-web 保持「开发者向纯 Web」。边界清晰，但 workbench 仍是 pi-app 对共有组件的较大偏离来源。
- **上移 pi-web**：pi-web 也具备 workbench；pi-app 只在其上加 macOS 壳。重复最少，但模糊了「pi-web=通用 / pi-app=产品化」的产品分界。

建议：**先留 pi-app**，待 P1/P2 上移完成、共有组件偏离显著下降后再评估是否值得上移。

---

## 6. 不需要处理

- **已废弃**：scenes / onboarding / automation（`2053949` / `25bbc77` / `5b6cd64` / `7293bd6` / `57db0d4` 等）已被 `0fe8164` 移除，净效果为「不存在」，无需上移。
- **CI / 发布 / 版本 / 品牌 / macOS**：pi-app 专属，永久留在 pi-app。
