# pi-web fork 合并维护手册

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

## 5. pi-web 与 pi-app 的关系（待定的链路决策）

现状：`pi-web` 和 `pi-app` **都**直接以 `agegr/pi-web` 为 upstream，是两条平行 fork。

若我们打算在 `pi-web` 沉淀**通用 Web 二次开发**（非 macOS 专属），有两种维护模型：

| 模型 | 链路 | 优点 | 代价 |
|------|------|------|------|
| **A 平行（现状）** | `agegr` → pi-web；`agegr` → pi-app | 简单，两线互不影响 | 通用 Web 改动要在 pi-web、pi-app **各做一遍** |
| **B 分层（推荐）** | `agegr` → `asiachrispy/pi-web` → `asiachrispy/pi-app` | 通用改动只在 pi-web 做一次，pi-app 合并 pi-web 自动获得；真正消除重复 | pi-app 的 upstream 改为 `asiachrispy/pi-web`，多一层合并 |

> 选 B 时：`cd pi-app && git remote set-url upstream https://github.com/asiachrispy/pi-web.git`，此后 pi-app 合并链变为「先在 pi-web 合 agegr，再在 pi-app 合 pi-web」。当前 pi-web 尚无自有改动（= agegr），切换零成本；越早定越省事。

**判断依据**：如果 pi-web 只做零星轻改 → A 足够；如果 pi-web 要成为「我们共享的 Web 底座」→ 选 B，从根上避免 pi-web/pi-app 双份维护。
