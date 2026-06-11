# 更新日志 / Changelog

本文件记录 **pi-agent 工作区**的重要变更（含跨子仓 `pi` / `pi-app` / `pi-web` 的协作改动），遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

> **维护约定**：每次合并到 `main` 后，必须更新本文件。详见 [AGENTS.md「更新日志维护」](./AGENTS.md)。
>
> 开发期间把新条目写到 `## [Unreleased]` 下；发布时把 `[Unreleased]` 改为对应版本号与日期，并在顶部新建空的 `[Unreleased]`。

## [Unreleased]

### Added
- **pi-app 安装即提供 `pi` CLI**：全局安装 pi-app（`npm i -g pi-app`）时，若系统中尚无 `pi` 命令，会自动生成一个独立 shim（转发到 pi-app 内置的 `@earendil-works/pi-coding-agent` CLI）；若已有 `pi` 则保留、不覆盖（避免 npm 全局 bin 冲突 `EEXIST` 导致安装失败）。卸载 pi-app 后，因 npm 不执行 `postuninstall`，该 shim 会残留，但为独立 shim 而非失效软链——运行 `pi` 会给出友好提示（重装/删除）而非报错。涉及：`pi-app/bin/pi.js`、`pi-app/scripts/{install-cli,uninstall-cli,cli-link-common}.mjs`、`pi-app/package.json`、`pi-app/README.md`。
