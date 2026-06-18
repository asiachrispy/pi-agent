---
scope: workspace-summary
owner: tech
status: current
read_when:
  - /team 入口启动时
  - 任何 agent / 用户进入 pi-agent 工作区
update_strategy: "每个 /team done 后由 team 更新（HEAD / 落后 / tag）"
---

# pi-agent 工作区摘要

> **/team 快查表**（≈2KB）。启动时先读本文件，再按 `agent-reading-map.md` 选最小 wiki。
> 决策树详见 `wiki/decisions/team-decisions.md`；skill 触发见 `team.md §知识库`。

## 业务仓元数据

>>>SNAPSHOT_START<<<
> 自动生成于 2026-06-16 09:28:31 。手工编辑此段会被下次运行覆盖。

| 字段 | pi | pi-app |
|---|---|---|
| 当前 HEAD | `5a2b03e` | `f62e2c4` |
| 当前分支 | `main` | `main` |
| 最新 tag | `n/a` | `v0.8.6` |
| upstream/main | `n/a (无 upstream)` | `a7c5de3` |
>>>SNAPSHOT_END<<<

## 关键命令

### 验证（按 `validation-rules.md`）
```bash
# pi（引擎）— pi/ 目录
npm run check          # biome + tsgo + 边界检查
npm test               # workspaces 测试

# pi-app（产品）— pi-app/ 目录
npx tsc --noEmit       # 类型门禁
npx vitest run         # 单测
swift build && swift test  # macOS 壳改动时
npm run package:macos  # 打包（standalone）
```

### Demand / 自检
```bash
bash scripts/next-demand-id.sh                 # 取 id
bash scripts/validate-demand.sh demands/D-*.md # 校验 demand
bash scripts/check-pi-env.sh                   # 环境自检
bash scripts/snapshot-workspace.sh             # 刷新本文件 snapshot
```

### Release（按 `.pi/protocols/release.md` 9 步模板）
```bash
# upstream 同步
cd pi && git fetch upstream && git merge upstream/main && git push origin main

# 验证 + 版本 + 提交 + push
npx tsc --noEmit && npx vitest run
npm version patch --no-git-tag-version
git commit -m "chore(release): vX.Y.Z"
git push origin main && git tag vX.Y.Z && git push origin vX.Y.Z

# 打包 + DMG + 冷烟（macOS）
npm run package:macos
hdiutil create -format UDZO -o Pi-X.Y.Z.dmg -srcfolder <staging>
export PORT=$(bash scripts/find-free-port.sh 30142) || { echo "ERROR: no free port found"; exit 1; }
trap "kill $! 2>/dev/null" EXIT INT TERM
Pi.app/Contents/Resources/node/bin/node Pi.app/Contents/Resources/pi-web/server.js &
curl -fsS http://localhost:$PORT/{,/api/health,/api/sessions}

# GitHub Release
gh release create vX.Y.Z -R asiachrispy/pi-app Pi-X.Y.Z.dmg
```

## 已知陷阱

1. **冷烟端口**：默认 `scripts/find-free-port.sh 30142`（不抢占正式端口 30141）
2. **拆 commit 并发 → lock + 误合并**：务必串行 `git add <files> && git commit`
3. **`pi` CLI 不在 PATH**：用 `~/.pi/agent/bin/pi` shim 兜底
4. **AGENTS.md 写 upstream 但仓库没配**：先 `git remote -v` 确认
5. **subagent 返回 "no output"**：pi-app 会话渲染层问题，降级主会话执行
6. **package-lock.json diff 是 lockfile v3 格式调整**：单做 `chore(deps)` commit
7. **决策点默认**：越界 diff → A1 拆独立 demand；upstream==HEAD → 不 merge；cold-smoke 端口冲突 → PORT+=1
