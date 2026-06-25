# AGENTS.md — pi-agent 工作区约定

> 本文件是本工作区（pi-agent）自有的 agent 工作规范，不属于任何上游仓库（`pi` / `pi-app`），仅约束在本工作区内的协作行为。
>
> **当前状态**：`pi-app` 统一 Web + 桌面，不再有独立的 Web 层仓库。

## 打包 / 安装 / 发布前的上游同步（强制）

**每次打包（`package:macos`）、安装到本地、或发布版本（GitHub Release）之前，必须先拉取并合并上游，确保基于最新代码再构建。** 不得在落后上游的状态下打包或发布。

适用范围：

```bash
# 1) pi 引擎（upstream = earendil-works/pi）
cd pi      && git fetch upstream && git merge upstream/main && git push origin main

# 2) pi-app 统一 Web + 桌面主线（upstream 以仓库当前配置为准）
cd pi-app  && git fetch upstream && git merge upstream/main && git push origin main
```

执行要点：

- 不再有三仓同步；仅 `pi` + `pi-app` 两条主线。
- 合并前若工作区有未提交改动，先提交或暂存，不在脏树上合并。
- 合并若有冲突，按 README §5 的归属原则解决；对 `pi-app` 已成熟的 Web/桌面实现，不因历史形态而回退。
- **合并后必须先验证再打包**：`tsc --noEmit` + `vitest run`（pi-app 还需 `swift build`/`swift test`）全绿后，才执行 `npm run package:macos`。
- 各 fork 合并结果推送到 `origin/main` 后再打 tag / 发布；发布版本号与 tag 基于已同步上游的提交。
- 若上游本次无更新（落后 0），记录“已确认最新”即可，无需空合并。

## 打包与发布方式（约定）

**自 v0.8.2 起，macOS 打包统一走 Next standalone 输出，后续发布版本均按此方式。**

- 打包入口仍是 `npm run package:macos`（`pi-app/scripts/package-macos-app.sh`），脚本内部已用 `PI_STANDALONE=1` 触发 `output: "standalone"`：构建期按依赖追踪，只把服务端真正需要的文件产出到 `.next/standalone`（自带 `server.js` + 精简 `node_modules`，自动不含 `@next/swc`）；前端重型库随客户端 chunk 进 `.next/static`，不再整包随 `node_modules` 发布。
- bundle 布局：`server.js` + 追踪后的 `node_modules` + `.next/static` + `public` + 内嵌 Node；`bin/pi-app.js` 检测到 `server.js` 即以 `node server.js` 启动（普通 npm 安装无 `server.js` 时回退 `next start`）。
- 体积基线：Pi.app ≈ 224M、DMG ≈ 93M（显著低于早期 `next start` 全量打包的 ~905M / 543MB）。如果某次打包体积明显回升，先排查 standalone 是否生效。
- 发布步骤（在 `pi` / `pi-app` **上游同步且验证全绿后**执行）：
  1. `npm version patch --no-git-tag-version` 升版本，更新根 `CHANGELOG.md`（`[Unreleased]` 定版）。
  2. 提交（`build(macos): ...` + `chore(release): vX.Y.Z`），`git push origin main`。
  3. `npm run package:macos` 重新打包（确保 Info.plist 版本正确）。
  4. 制作 DMG：staging 目录放 `Pi.app` + `/Applications` 软链，`hdiutil create -format UDZO` 生成 `Pi-X.Y.Z.dmg`。
  5. 打 tag `vX.Y.Z` 并推送；`gh release create vX.Y.Z -R asiachrispy/pi-app` 上传 DMG。
- 发布前务必冷烟验证：用 bundle 内嵌 Node 跑 `server.js`，确认 `/`、`/api/health`、`/api/sessions` 均 200。
- npm 包内容不受 standalone 影响（`npx pi-app` 走 `next start` 回退分支）；如需同步发 npm，另行 `npm publish --access public`。

## Livo 集成与本地部署（强制）

Livo 相关能力是 `pi-app` 的可选集成，**不得默认影响本地部署/本地使用**。

- 本地普通部署不得设置 `PI_LIVO_SSO_ENABLED=1`；未显式开启时，`/`、`/app`、本地 API 与桌面 bundle 必须按原本本地模式工作，不跳转 Livo SSO。
- 本地部署默认不需要配置 `PI_LIVO_*` 或 `PI_WEB_LIVO_WORKSPACE_ROOT`。只有部署到 Livo 工作台/会议场景时，才配置 `PI_LIVO_SESSION_SECRET`、`PI_LIVO_SSO_VERIFY_TOKEN`、`PI_LIVO_BASE_URL`、`PI_LIVO_WEB_LOGIN_URL`、`PI_WEB_LIVO_WORKSPACE_ROOT` 等变量。
- 若本地调试时曾打开过 Livo SSO，切回普通本地模式前需清理浏览器 `pi_livo_session` cookie，避免误走 Livo 会话分支。
- `pi-app` 当前通过 npm alias 使用 `@livos/pi-*` fork 包（import 名仍是 `@earendil-works/*`）。离线部署、私有 npm 源或镜像环境必须同步 `@livos` scope 包；否则安装阶段会失败。
- 新增或修改 Livo 功能时，必须确认未设置 `PI_LIVO_SSO_ENABLED=1` 的本地路径仍可启动、访问 `/`/`/app`，并保持 `/api/health`、`/api/sessions` 等本地冷烟接口可用。

## 测试数据清理（强制）

在本工作区运行测试（如 `pi` 各 package 的单测、RPC/会话相关用例）后，**必须清理测试过程产生的临时会话数据**，不得遗留、不得展示给用户。

- 会话数据位置：`~/.pi/agent/sessions/`
- **测试数据特征（需清理）**：目录名以 `--var-folders-` 开头，即由 macOS 临时目录 `/var/folders/.../T/pi-*` 编码而来（如 `--var-folders-...-T-pi-runtime-suite-...--`、`-T-pi-2860-...`）。这些对应已删除的测试临时目录，是孤儿数据。
- **真实数据特征（必须保留）**：目录名以 `--Users-...--` 开头，对应真实项目路径（如 `--Users-mk-codespace-agno--`）。

清理命令参考：

```bash
cd ~/.pi/agent/sessions && \
  find . -maxdepth 1 -type d -name '--var-folders-*' -print0 | xargs -0 rm -rf
```

执行前先 `ls -d ./*/` 核对，确认仅删除 `--var-folders-*`，保留 `--Users-*`。

## 更新日志维护（强制）

本工作区在根目录维护 [`CHANGELOG.md`](./CHANGELOG.md)，遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范。

- **每次合并到 `main` 后，必须更新 `CHANGELOG.md`**：把本次合并的变更整理/补充进去，不得遗漏。
- 开发期间把新条目写到 `## [Unreleased]` 段下，按 `Added` / `Changed` / `Fixed` / `Removed` 分类（无内容的分类可省略）。
- 发布或打 tag 时，将 `## [Unreleased]` 重命名为对应版本号与日期（`## [x.y.z] - YYYY-MM-DD`），并在顶部新建一个空的 `## [Unreleased]`。
- 条目用简洁中文描述「做了什么、为什么」，必要时标注涉及的子仓（`pi` / `pi-app`）以及关键文件或文档链接。
