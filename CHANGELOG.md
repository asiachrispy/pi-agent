# 更新日志 / Changelog

本文件记录 **pi-agent 工作区**的重要变更（含跨子仓 `pi` / `pi-app` 的协作改动；`pi-web` 仅作为历史仓库名保留），遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> **维护约定**：每次合并到 `main` 后，必须更新本文件。详见 [AGENTS.md「更新日志维护」](./AGENTS.md)。
>
> 开发期间把新条目写到 `## [Unreleased]` 下；发布时把 `[Unreleased]` 改为对应版本号与日期，并在顶部新建空的 `[Unreleased]`。

## [Unreleased]

### Changed
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
