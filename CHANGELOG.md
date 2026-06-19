# 更新日志 / Changelog

本文件记录 **pi-agent 工作区**的重要变更（含跨子仓 `pi` / `pi-app` 的协作改动），遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范。

> **维护约定**：每次合并到 `main` 后，必须更新本文件。详见 [AGENTS.md「更新日志维护」](./AGENTS.md)。
>
> 开发期间把新条目写到 `## [Unreleased]` 下；发布时把 `[Unreleased]` 改为对应版本号与日期，并在顶部新建空的 `[Unreleased]`。

## [Unreleased]

### Removed
- **自定义 subagent 扩展迁移至内置 pi-subagents skill**（pi-agent）：删除 `.pi/extensions/subagent/`（agents.ts + index.ts，1502 行），由 `~/.pi/agent/npm/node_modules/pi-subagents/` 内置 skill 接替。新 skill 支持 chain/parallel/async/forked-context 模式，功能完整覆盖旧扩展且无重复注册风险。commit `71ad588`。

### Fixed
- **侧边栏切换项目后资源管理器仍列旧目录**（pi-app）：`FileExplorer` 的 `cwd` 优先级与 `filterCwd` 不一致（`selectedCwdProp ?? selectedCwd`），用户选新项目后仍请求 `activeCwd` 导致「未找到文件」。改为 `selectedCwd ?? selectedCwdProp`。涉及：`pi-app` commit `ece1155`。
- **pi-app PR #10/#11 合并**：侧边栏/右栏可拖拽调整宽度（`usePanelResize`）；无 session 时打开工作区文件浏览器 403 问题修复（`recentWorkspaceCwds` + 默认工作区授权）；`/api/cwd/validate` 后立即失效 allowed-roots 缓存，避免刚打开目录仍 403。涉及：`pi-app` commit `929ec20`。
- **对话区相对路径文件预览 Access denied**（pi-app）：`resolveFilePathForOpen` 将 `login` 等裸文件名按 session cwd 解析为绝对路径后再请求 `/api/files`。涉及：`pi-app` commit `81b8122`。
- **subagent 误要求 API key**（pi-agent）：未配置 model 的 agent 继承父会话 `ctx.model` 的 `--provider`/`--model`，不再单独弹 Anthropic key。涉及：`.pi/extensions/subagent/index.ts` commit `262a191`。

### Added
- **pi-app 首页「我的工作」列表增加「项目名称」列（简称）**（D-2026-002 / pi-app v0.8.6）：`ProductHistoryItem` 新增 `projectName` 字段（由 `cwd` 派生，basename + 「未设置」 fallback）；`WorkbenchHome` 收起态 + 展开态均展示；i18n (zh-CN / en) 加 `projectName` 翻译；单测覆盖 `deriveProjectName` + `buildHistoryItems` 集成。本地 commit `fc2e4dc feat(workbench)`；推送到 origin 取决用户终端在网络恢复后跑 `git push origin main`。
- **聊天输入折叠 expanded /team prompt 为短指令**（D-2026-003 / pi-app v0.8.6）：`displayUserMessageText` 在聊天回放中折叠 pi-agent /team 入口模板为 `/team <args>`；单测 1 例覆盖。本地 commit `d93029b feat(chat)`。
- **team 流程效率改进 5 项落地**（D-2026-004 / pi-agent）：
  - **#1 subagent 注册**（partial）：创建 `~/.pi/agent/agents/team.md`（user-level）+ `~/.pi/agent/bin/pi` shim（多路径 fallback 到 `pi-app/node_modules/.../cli.js`）。subagent 工具在 pi-web session 跨引擎 MCP/渲染层问题未修复，降级主会话执行。
  - **#2 wiki/summary.md**：工作区快查表（决策树 + skill 触发矩阵 + 关键命令 + 子目录速查 + 已知陷阱）≈3KB，替代每次读 5+ wiki；配套 `scripts/snapshot-workspace.sh` 动态刷新业务仓元数据。
  - **#3 demands/template.md metadata**：`requires_release` / `requires_upstream_sync` / `requires_gh_release` / `cold_smoke_required` / `visual_qa_required` / `release_scope` 6 字段，把决策前置，不中途问。
  - **#4 .pi/protocols/release.md**：9 步标准流程 + 3 步 human_confirmation（push / push tag / gh release）+ 失败模式矩阵。
  - **#5 wiki/decisions/team-decisions.md**：12 类决策点（weight / 越界 / upstream / 端口 / 拆 commit / lockfile / DMG 基线 / push / status 转换 / 询问判定 / 反模式 / 改进）。
- **pi-app v0.8.6 release 本地就绪**（D-2026-002 关联）：4 commit + tag `v0.8.6` + `Pi.app` 225M（Info.plist CFBundleShortVersionString 0.8.6）+ `Pi-0.8.6.dmg` 93.9MB（基线 93M 完美匹配）+ 冷烟 v0.8.6（PORT=30142，3 端点 200，`/api/health` 返回 `version=0.8.6`）。仅 push origin main + push tag v0.8.6 + gh release create 未在 session 完成，待用户终端网络恢复后补。
- **`package-lock.json` 同步**（D-2026-002 关联）：npm 11 lockfile v3 格式调整，提交 `94b175a chore(deps)`。
- **`wiki/decisions/team-decisions.md`**（D-2026-004 #5）：沉淀 12 类决策点表，让 team 按表自决，不反复问同款问题。
- **`.pi/protocols/release.md`**（D-2026-004 #4）：release 9 步模板。
- **pi-agent Phase 1 工作区骨架（v5）**：落地 `workspace.config.yaml`、`.pi/agents/team.md`、`team-entry` 扩展、`demands/template.md`、基础 `wiki/`、`JTBD/`、`scripts/`；适配 `subagent`、`jtbd-sync` 与 PRD/DoR skills，新增 `qa-checklist`、`ship-checklist`。设计依据：`docs/pi-agent-design-v5.md` §13 Phase 1。

### Changed
- **拉取并合并 pi 上游最新代码**（`earendil-works/pi` → `asiachrispy/pi`）：`pi` 合并 `upstream/main`（`ea65a51a`）生成 merge commit `ccc53618`；冲突集中在 README、各包 changelog、版本号/lockfile、AI 入口与模型生成文件。处理原则：保留 fork `0.79.9` 版本线与 fork 增量说明，同时合入上游新增的 base 入口、Mistral prompt caching、post-compaction token 估算、OpenRouter Fusion、自动主题/图片能力等条目；lockfile 与 `npm-shrinkwrap.json` 重新生成并通过 `npm run check:shrinkwrap`。`pi-app` 已 fetch upstream，确认 `upstream/main` 无新增（本地领先 205），未执行空合并；原有 3 个本地未提交改动已恢复。
- **清理根仓库忽略规则**：`pi-web` 与 `pi-fetch-tool` 已移出当前工作区维护范围，移除根 `.gitignore` 中对应子仓忽略项，避免保留过期目录约定。涉及：`.gitignore`。
- **清理产品研发智能体方案文档**：移除 `docs/product-team-agent-plan.md` 中已迁移到 `mk-lab` wiki 的「7.1.1 mk-lab 项目仓库地图」段落，避免工作区方案文档重复维护业务仓库地图。涉及：`docs/product-team-agent-plan.md`。
- **拉取 pi 上游并合并**（`earendil-works/pi` → `asiachrispy/pi`）：因直连 `git fetch upstream` 多次 early EOF，改由浅克隆 `upstream/main`（`12bb8dd`，v0.79.6）本地 deepen 后合并；合并提交 `262866b`，无冲突。上游主要增量：v0.79.4–v0.79.6（HTTP proxy 设置、Vercel AI Gateway attribution、provider 环境覆盖、fetch override 修复、DeepSeek/OpenCode 思考控制、模型目录更新等）。验证：`npm run check`（含 `tsgo --noEmit`）全绿；`vitest` 仍有 3 文件 7 例失败（`resource-loader`、`session-id-readonly`、`3592-no-builtin-tools`），与合并前基线一致、非本次引入。已推送 `origin/main`。
- **`wiki/agent-reading-map.md`**：所有任务类型必读列加 `summary.md`；`depends_on` 加 `summary.md`；`## 总原则` 加 "先读 `wiki/summary.md`" 为第一条；路由表加 "发版"行指向 `.pi/protocols/release.md`。
- **`.pi/agents/team.md`** 与 **`.pi/APPEND_SYSTEM.md`**：启动规则加 "**先读 `wiki/summary.md`**"，再读 `agent-reading-map.md`；决策点指向 `wiki/decisions/team-decisions.md`（按表自决，不询问）。
- **修复 Pi.app `/team` 对话框展示整页 prompt**：新增 `team-entry` 扩展以 `registerCommand("team")` 拦截，会话只保留 `/team <args>` 短文本；执行协议迁至 `.pi/APPEND_SYSTEM.md`；移除会整页展开的 `.pi/prompts/team.md`；`pi-app` 对历史已展开消息做 UI 折叠。涉及：`.pi/extensions/team-entry/`、`scripts/setup-pi-entrypoints.sh`、`pi-app/lib/user-message-display.ts`。
- **jtbd-sync 五项改进**：空 `[JTBD-UPDATE]` 块从 Pi 界面剥离；无变更时 `notify` 轻量反馈；制度注入收紧（完成 demand/实现时禁止空块）；解析 `workflow_update` 与 demand `blocked`/`done` 自动联动多人 JTBD；`before_agent_start` 自动创建个人 `JTBD/<user>-jtbd.md` 并变更后跑 `sync-jtbd-index.sh`。涉及：`.pi/extensions/jtbd-sync/index.ts`、`.pi/agents/team.md`。
- **业务仓定为 `pi` + `pi-app`**：`workspace.config.yaml` 登记两仓 URL/别名；`wiki/project-map.md`、`project-overview.md`、`validation-rules.md` 写入引擎/产品边界与验证命令；`subagent` 项目解析改为 `pi` / `pi-app` / `pi-agent`；`bootstrap-workspace.sh` / `check-pi-env.sh` 校验两仓存在。
- **更新 pi-web 移除后的维护说明**：`pi-web` 已不再作为独立仓库维护，历史共享 Web 层合并进 `pi-app`；根 `README.md` 与 `AGENTS.md` 改为 `pi` + `pi-app` 两条活跃主线，删除发布/打包前“先 pi-web 后 pi-app”的同步要求；新增 `docs/pi-app-unified-maintenance.md` 作为当前 SOP，并将旧 `pi-web` 合并、上移、冲突审计文档标记为历史档案。涉及：`README.md`、`AGENTS.md`、`docs/*`。
- **拉取 pi 上游最新代码**：`pi` 引擎先快进到 `origin/main`（+28），再合并 `upstream/main`（earendil-works/pi，+17），共 4 处冲突——`packages/coding-agent/src/core/package-manager.ts` 与其测试因 fork 已将逻辑重构拆分到 `package-manager-npm.ts`/`package-manager-git.ts`/`package-source-parser.ts`（已含 upstream 的版本感知 `shouldUpdate` 等），保留 fork 版本；`packages/ai/CHANGELOG.md`、`packages/coding-agent/CHANGELOG.md` 合并双方 `[Unreleased]` 条目。合并后 `tsgo --noEmit` 通过、`package-manager` 单测 161 全过；其余既有失败（resource-loader flaky、session-id、3592 memory 特性、footer-debounce）经基线对比确认为合并前即存在、非本次引入。已推送 `origin/main`（`5a2b03eb`）。`pi-app` 本就最新，无需拉取。

## [0.8.3] - 2026-06-12

### Fixed
- **DMG 下载后显示「已损坏」**：打包原先只单独 ad-hoc 签名主程序与内嵌 `node`，bundle 内嵌套原生二进制（`*.node` 插件、sharp 的 libvips `*.dylib` 等）未签名；DMG 从 GitHub 下载被加 quarantine 后，Apple Silicon 即判定「已损坏，应移到废纸篓」。修复：改为对整个 `.app` 做 ad-hoc **深度签名**（`codesign --force --deep`），并在打包时 `--verify --deep --strict` 校验；DMG `hdiutil verify` 通过、挂载后内部 app 签名有效。仍未做 Apple 公证，下载版首次打开需右键「打开」或 `xattr -dr com.apple.quarantine`。涉及：`pi-app/scripts/package-macos-app.sh`。

### Added
- **固化打包/发布约定**：在 `AGENTS.md` 增加「打包与发布方式（约定）」一节，明确自 v0.8.2 起 macOS 打包统一走 Next standalone 输出，并给出版本号→提交→打包→DMG→tag→`gh release` 的标准步骤与体积基线（Pi.app ≈ 224M、DMG ≈ 93M）。涉及：`AGENTS.md`、`CHANGELOG.md`。

## [0.8.2] - 2026-06-12

### Added
- **新增强制规则：打包 / 安装 / 发布前必须同步上游** — 在 `AGENTS.md` 增加「打包 / 安装 / 发布前的上游同步（强制）」一节：每次 `package:macos`、本地安装、或发布 GitHub Release 之前，必须按分层顺序（先 `pi-web` 后 `pi-app`，`pi` 独立）执行 `git fetch upstream && git merge upstream/main` 并推送，合并后经 `tsc --noEmit` + `vitest run`（pi-app 含 `swift build/test`）验证通过再构建/发布；落后 0 时确认最新即可，不空合并。涉及：`AGENTS.md`、`CHANGELOG.md`。

### Changed
- **本地安装前上游同步**：按强制规则在打包/安装前同步三仓——`pi` 落后 1，合并 `upstream/main` 并推送（`c5ae6fba`）；`pi-web` 落后 0，确认最新；`pi-app` 落后 2（上游「删 Export」`226e1b4`、「文件预览修复」`9969aca`，pi-app 已有等价成熟实现），合并产生 4 个共享/组件文件冲突（`app/api/files/[...path]/route.ts`、`components/AppShell.tsx`、`components/FileViewer.tsx`、`lib/session-reader.ts`），按归属原则全部保留 pi-app 成熟版本（ours）后提交并推送（`92fd100`）。合并后经 `tsc --noEmit` + `vitest run`(248) + `swift build -c release` 验证全绿，再重新打包安装到 `/Applications`。
- **macOS 安装包大幅瘦身（改用 Next standalone 输出）**：打包改为 `output: "standalone"`（由 `PI_STANDALONE=1` 在打包时开启，dev/常规构建不受影响）。Next 在构建期按依赖追踪，只把服务端真正需要的文件产出到 `.next/standalone`（自带 `server.js` + 精简后的 `node_modules`，**自动不含 `@next/swc`（省 ~128M）**）；前端重型库（`@lobehub`/`antd`/`mermaid`/`emoji-mart`/`pdfjs` 等）随客户端 chunk 进 `.next/static`，不再整包随 `node_modules` 发布。打包脚本据此重写为 standalone 布局（`server.js` + 追踪 `node_modules` + `.next/static` + `public` + 内嵌 Node），不再 `npm ci` 全量依赖；`bin/pi-app.js` 检测到 `server.js` 即以 `node server.js` 启动（默认 `HOSTNAME=0.0.0.0` 保持局域网可达），普通 npm 安装无 `server.js` 时仍回退 `next start`。**Pi.app 从 ~1.2G（首版）/905M（保留 swc 版）降到 ~224M**（standalone 115M + 内嵌 Node 105M）。核心路由 `/`、`/api/health`、`/api/sessions`(经 pi-coding-agent) 冷烟与 GUI(30141) 均 200。可用 `SKIP_SLIM=1` 保留全量非运行时文件。涉及：`pi-app/next.config.ts`、`pi-app/scripts/package-macos-app.sh`、`pi-app/bin/pi-app.js`。

### Fixed
- **瘦身后 Pi.app 启动服务失败**：上一轮瘦身（`next start` 模式）误删了本机 `@next/swc-darwin-arm64`（116M）；`next.config.ts` 是 TypeScript 配置，`next start` 启动时 Next 16 需用本机 SWC 编译它，缺失后回退 wasm 且编译产物抛 `__dirname is not defined`，导致 config 加载失败、服务起不来。已随上面切换到 standalone 输出彻底解决——standalone 的 `server.js` 内置编译好的配置，运行时不再需要 SWC。涉及：`pi-app/scripts/package-macos-app.sh`、`pi-app/next.config.ts`、`pi-app/bin/pi-app.js`。

## [0.8.1] - 2026-06-12

### Added
- **pi-app 安装即提供 `pi` CLI**：全局安装 pi-app（`npm i -g pi-app`）时，若系统中尚无 `pi` 命令，会自动生成一个独立 shim（转发到 pi-app 内置的 `@earendil-works/pi-coding-agent` CLI）；若已有 `pi` 则保留、不覆盖（避免 npm 全局 bin 冲突 `EEXIST` 导致安装失败）。卸载 pi-app 后，因 npm 不执行 `postuninstall`，该 shim 会残留，但为独立 shim 而非失效软链——运行 `pi` 会给出友好提示（重装/删除）而非报错。涉及：`pi-app/bin/pi.js`、`pi-app/scripts/{install-cli,uninstall-cli,cli-link-common}.mjs`、`pi-app/package.json`、`pi-app/README.md`。

### Changed
- **删除对话区顶部的 Export 按钮**：移除 pi-app / pi-web 头部的「Export HTML」按钮及其 `handleExportSession` 回调，精简头部；HTML 导出仍可在对话输入区菜单中使用。涉及：`pi-app/components/AppShell.tsx`、`pi-web/components/AppShell.tsx`（pi-app `b19afb0`、pi-web `226e1b4`）。
- **分享链接 / 设备配对使用局域网 IP 而非 localhost**：通过 localhost 打开 pi-app 时，分享链接与「配对设备」二维码/链接的 host 自动替换为本机局域网 IPv4（优先 192.168/10/172.16-31 私网段，保留协议与端口），方便内网同事 / 其它设备访问；可用 `PI_SHARE_HOST`（host 或 host:port）覆盖。LAN origin 逻辑抽到共享工具 `pi-app/lib/lan-origin.ts`，由分享路由与配对 offer 复用。注意：需将应用绑定到 `0.0.0.0` 才能被他人连上；若自定义了 remote `allowedHostnames`，需把该 IP 加入白名单。涉及：`pi-app/lib/lan-origin.ts`、`pi-app/app/api/sessions/[id]/share/route.ts`、`pi-app/lib/remote-auth.ts`。（relay/E2EE offer 走中继、与局域网无关，未改动。）
- **删除「复制为新对话」按钮**：移除 pi-app 对话输入区的 clone 按钮（`onClone`/`cloning` 不再在 UI 暴露，后端 clone 能力保留）。涉及：`pi-app/components/ChatInput.tsx`。

### Fixed
- **右侧预览区「Access denied」**：放行「当前会话转录里 agent 实际读/写/引用过的文件」，即使其位于会话 cwd 派生的 allowed-roots 之外也可预览（按 realpath 比较，防软链逃逸）。新增 `lib/file-access.ts:isReferencedFileAllowed`、`lib/session-reader.ts:collectSessionReferencedFiles`，文件 API 路由与前端 `FileViewer`/`PdfCanvasViewer`/`AppShell` 透传 `sessionId`。两端同步（pi-app `c6ce4a3`、pi-web `9969aca`）。
