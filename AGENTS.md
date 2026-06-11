# AGENTS.md — pi-agent 工作区约定

> 本文件是本工作区（pi-agent）自有的 agent 工作规范，不属于任何上游仓库（`pi` / `pi-web` / `pi-app`），仅约束在本工作区内的协作行为。

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
