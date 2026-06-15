# pi-web fork 合并维护手册

> **历史档案（已废弃）**：`pi-web` 已从本工作区移除，不再维护；此前共享 Web 层已经合并进 `pi-app`，后续 Web + 桌面统一在 `pi-app` 维护。本文只保留为旧分层模型的历史记录，不再作为当前操作 SOP。当前流程见 [`docs/pi-app-unified-maintenance.md`](docs/pi-app-unified-maintenance.md)。

**适用对象**：`asiachrispy/pi-web`（我们可写的纯 Web fork）
**上游**：`agegr/pi-web`（只读，配为 `upstream`）
**目标**：在 pi-web 上持续做二次开发的同时，能低成本地定期吸收上游更新。

---

## 0. 远程结构（已配置）

```
origin    = https://github.com/asiachrispy/pi-web.git   (我们的，可推送)
upstream  = https://github.com/agegr/pi-web.git         (只读；push 已禁用)
```

三条线一致：`pi` / `pi-web` / `pi-app` 都是 `origin=asiachrispy/*` + `upstream` 只读。

---

## 1. 合并策略：用 merge，不用 rebase

`asiachrispy/pi-web` 是**已推送的公开 fork**，多端/他人可能基于它工作。因此吸收上游一律用 **merge**（保留真实历史、不改写已 push 提交），**禁止** `rebase upstream` 后强推 main。

> rebase 只用于「尚未推送的本地特性分支」自我整理，不用于主线追上游。

---

## 2. 标准合并流程

```bash
cd pi-web
git checkout main
git fetch upstream                 # 取上游最新
git merge upstream/main            # 合并；有冲突则解决
# —— 若有冲突：解决后 git add <files> && git commit ——
npm install                        # 若 package.json/lock 有变化，重生成 lock
npm run lint && npx tsc --noEmit   # 验证（按 pi-web 实际脚本）
git push origin main               # 推回我们的 fork
```

**节奏**：小步、频繁。每次上游 release 或每周合一次，领先越少、单次冲突越小。不要攒几个月一次性合。

---

## 3. 冲突解决原则

合并冲突 = 「我们的二次开发」与「上游同一处的改动」相遇。处理时：

1. **两边意图都要保留**：上游的 bugfix/新功能 + 我们的定制，不要为图省事丢掉任一方。
2. **结构等价，降低冲突面**：我们改上游文件时，只做**最小、局部**的修改（替换字符串、加少量分支），**不重排 JSX / 不大段重写**。逐行对应越好，git 三方合并越能自动完成。
3. **优先新增文件**：新功能尽量落在**上游不存在的新文件**里（组件 / hook / lib），共有文件只留最小挂载点。这类文件永不冲突。
4. **拿不准就对照三方**：`git checkout --conflict=diff3 <file>` 看 base/ours/theirs 三方，理解上游为何改。

---

## 4. 省力工具

### 4.1 git rerere（已启用）
「reuse recorded resolution」——记住你对某处冲突的解法，下次同样冲突自动复用。已为本仓库启用：

```bash
git config rerere.enabled true      # 已设
git config rerere.autoupdate true   # 已设
```

长期 fork 反复合并同几个文件时，这能省掉大量重复手工解冲突。

### 4.2 .gitattributes（建议落地到 pi-web）
对锁文件等「机械冲突」声明合并方式，避免每次手解：

```gitattributes
# package-lock.json 不做行级合并，合并后统一 npm install 重生成
package-lock.json -merge linguist-generated=true
```

落地：在 pi-web 根目录新增 `.gitattributes`（上游若无此文件则不冲突），提交到 `origin/main`。

### 4.3 合并策略选项
- 整体偏向某方（少用，会吞掉对方改动）：`git merge -X ours` / `-X theirs`。
- 仅个别文件取某方：`git checkout --ours <f>` / `--theirs <f>` 后 `git add`。

---

## 5. pi-web 与 pi-app 的链路：已采用「分层（模型 B）」

```
agegr/pi-web (只读源头)
   └─merge→ asiachrispy/pi-web (共享 Web 层：通用二次开发)
              └─merge→ asiachrispy/pi-app (桌面层：macOS 壳/原生/产品化)
```

`pi-app` 的 `upstream` 已改挂 `asiachrispy/pi-web`（不再直连 `agegr`）。好处：**通用 Web 改动只在 pi-web 做一次**，pi-app 合并 pi-web 即自动获得，从根上避免 pi-web / pi-app 双份维护。

### 5.1 分层下的标准合并顺序

上游有更新时，**自上而下**逐层合并：

```bash
# 1) 先让共享 Web 层吸收源头更新
cd pi-web
git fetch upstream && git merge upstream/main   # upstream = agegr/pi-web
npm install && npm run lint && npx tsc --noEmit
git push origin main

# 2) 再让桌面层吸收共享层（含上游更新 + 我们的通用 Web 改动）
cd ../pi-app
git fetch upstream && git merge upstream/main   # upstream = asiachrispy/pi-web
npm install && npx tsc --noEmit && npx vitest run
git push origin main
```

### 5.2 改动落点速记

| 改动类型 | 落到哪个 fork |
|----------|--------------|
| 通用 Web（对话/分支/会话/UI，跨平台） | `asiachrispy/pi-web` |
| macOS 壳 / 原生桥 / PWA / 远程 / 推送 / 产品化 | `asiachrispy/pi-app`（尽量新增独有文件） |
| 引擎能力 | `asiachrispy/pi`（优先做成扩展包） |

> 注意：pi-app 历史上已有大量「本应属于通用 Web」的改动（149 提交）。新通用改动请放 pi-web；存量可在后续逐步「上移」到 pi-web 以减少 pi-app 对共有文件的偏离（非紧急）。
