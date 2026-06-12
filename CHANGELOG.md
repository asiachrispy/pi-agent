# 更新日志 / Changelog

本文件记录 **pi-agent 工作区**的重要变更（含跨子仓 `pi` / `pi-app` / `pi-web` 的协作改动），遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> **维护约定**：每次合并到 `main` 后，必须更新本文件。详见 [AGENTS.md「更新日志维护」](./AGENTS.md)。
>
> 开发期间把新条目写到 `## [Unreleased]` 下；发布时把 `[Unreleased]` 改为对应版本号与日期，并在顶部新建空的 `[Unreleased]`。

## [Unreleased]

### Added
- **新增强制规则：打包 / 安装 / 发布前必须同步上游** — 在 `AGENTS.md` 增加「打包 / 安装 / 发布前的上游同步（强制）」一节：每次 `package:macos`、本地安装、或发布 GitHub Release 之前，必须按分层顺序（先 `pi-web` 后 `pi-app`，`pi` 独立）执行 `git fetch upstream && git merge upstream/main` 并推送，合并后经 `tsc --noEmit` + `vitest run`（pi-app 含 `swift build/test`）验证通过再构建/发布；落后 0 时确认最新即可，不空合并。涉及：`AGENTS.md`、`CHANGELOG.md`。

## [0.8.1] - 2026-06-12

### Added
- **pi-app 安装即提供 `pi` CLI**：全局安装 pi-app（`npm i -g pi-app`）时，若系统中尚无 `pi` 命令，会自动生成一个独立 shim（转发到 pi-app 内置的 `@earendil-works/pi-coding-agent` CLI）；若已有 `pi` 则保留、不覆盖（避免 npm 全局 bin 冲突 `EEXIST` 导致安装失败）。卸载 pi-app 后，因 npm 不执行 `postuninstall`，该 shim 会残留，但为独立 shim 而非失效软链——运行 `pi` 会给出友好提示（重装/删除）而非报错。涉及：`pi-app/bin/pi.js`、`pi-app/scripts/{install-cli,uninstall-cli,cli-link-common}.mjs`、`pi-app/package.json`、`pi-app/README.md`。

### Changed
- **删除对话区顶部的 Export 按钮**：移除 pi-app / pi-web 头部的「Export HTML」按钮及其 `handleExportSession` 回调，精简头部；HTML 导出仍可在对话输入区菜单中使用。涉及：`pi-app/components/AppShell.tsx`、`pi-web/components/AppShell.tsx`（pi-app `b19afb0`、pi-web `226e1b4`）。
- **分享链接 / 设备配对使用局域网 IP 而非 localhost**：通过 localhost 打开 pi-app 时，分享链接与「配对设备」二维码/链接的 host 自动替换为本机局域网 IPv4（优先 192.168/10/172.16-31 私网段，保留协议与端口），方便内网同事 / 其它设备访问；可用 `PI_SHARE_HOST`（host 或 host:port）覆盖。LAN origin 逻辑抽到共享工具 `pi-app/lib/lan-origin.ts`，由分享路由与配对 offer 复用。注意：需将应用绑定到 `0.0.0.0` 才能被他人连上；若自定义了 remote `allowedHostnames`，需把该 IP 加入白名单。涉及：`pi-app/lib/lan-origin.ts`、`pi-app/app/api/sessions/[id]/share/route.ts`、`pi-app/lib/remote-auth.ts`。（relay/E2EE offer 走中继、与局域网无关，未改动。）
- **删除「复制为新对话」按钮**：移除 pi-app 对话输入区的 clone 按钮（`onClone`/`cloning` 不再在 UI 暴露，后端 clone 能力保留）。涉及：`pi-app/components/ChatInput.tsx`。

### Fixed
- **右侧预览区「Access denied」**：放行「当前会话转录里 agent 实际读/写/引用过的文件」，即使其位于会话 cwd 派生的 allowed-roots 之外也可预览（按 realpath 比较，防软链逃逸）。新增 `lib/file-access.ts:isReferencedFileAllowed`、`lib/session-reader.ts:collectSessionReferencedFiles`，文件 API 路由与前端 `FileViewer`/`PdfCanvasViewer`/`AppShell` 透传 `sessionId`。两端同步（pi-app `c6ce4a3`、pi-web `9969aca`）。
