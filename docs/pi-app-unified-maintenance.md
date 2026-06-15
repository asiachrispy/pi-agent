# pi-app 统一维护手册

**适用对象**：`asiachrispy/pi-app`
**当前状态**：`pi-web` 已移除，不再维护；Web UI 与 macOS 桌面能力统一在 `pi-app` 维护。
**目标**：减少 `pi-web` / `pi-app` 双线同步成本，让所有前端产品能力在一条主线内演进。

---

## 1. 维护边界

| 改动类型 | 落点 |
|----------|------|
| Agent runtime / CLI / provider / 工具调用 / 会话协议 | `pi` |
| Web UI / PWA / 产品化入口 / i18n / 文件预览 / 终端 / 远程访问 | `pi-app` |
| macOS 壳 / `piNative` / 内嵌 Node / DMG 打包 | `pi-app` |
| 可替代的 agent 能力 | 优先社区扩展或独立扩展包 |

`pi-web` 不再作为共享 Web 层承接任何新功能。历史文档里的“上移到 pi-web”“先合 pi-web 再合 pi-app”均已失效。

---

## 2. 上游同步

发布、打包、本地安装前只同步活跃主线：

```bash
cd pi
git fetch upstream
git merge upstream/main
git push origin main

cd ../pi-app
git fetch upstream
git merge upstream/main
git push origin main
```

注意：

- 不进入 `pi-web`。
- `pi-app` 的 `upstream` 以仓库当前远程配置为准。
- 合并前保持工作区干净；有本地改动先提交或暂存。
- 合并后先验证，再打包、安装或发布。

---

## 3. pi-app 内部治理

- Web 通用能力和桌面专属能力都在 `pi-app`，但仍要按模块隔离：通用 UI 逻辑不要直接耦合 macOS 原生桥。
- 原生桥能力放在 `piNative`、macOS 壳、独有 hooks/libs/routes 中，避免污染核心对话、会话、文件读取等共享逻辑。
- 修改上游共有文件时保持结构等价：最小插入、不重排 JSX、不顺手大重构。
- i18n 文案集中维护，组件中只保留稳定 key 调用。
- 对反复冲突的文件启用 `git rerere`，把已确认的冲突解法固化。

---

## 4. 验证要求

普通代码合并后至少运行：

```bash
npx tsc --noEmit
npx vitest run
```

涉及 macOS 壳、打包、原生桥、发布时追加：

```bash
swift build
swift test
npm run package:macos
```

发布前还要用 bundle 内嵌 Node 冷烟验证：

- `/`
- `/api/health`
- `/api/sessions`

三者均应返回 200。

---

## 5. 历史文档处理

以下文档保留为历史档案，不再作为当前操作 SOP：

- `docs/pi-web-merge-maintenance.md`
- `docs/pi-app-to-pi-web-uplift.md`
- `docs/conflict-audit.md`

它们仍可用于理解早期 pi-app 与 pi-web 的同源关系、冲突来源和旧分层模型，但新的维护决策以本文和根 `README.md` / `AGENTS.md` 为准。
