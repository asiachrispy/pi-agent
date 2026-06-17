---
scope: environments
owner: ops
status: draft
---

# 环境说明

> Ops 仅执行本节或 `runbooks/` 中**已登记**的脚本。agent 不得臆造环境命令。

## 环境列表

| 环境 | 用途 | 基址 / 入口 | 备注 |
|---|---|---|---|
| local | 开发 | 本机 | |
| test | 测试 | _待填_ | |
| staging | 预发 | _待填_ | |
| prod | 生产 | _待填_ | 须人工确认 |

## 可执行脚本登记

```bash
# 示例（取消注释并改为真实命令）:
# test-smoke: ./scripts/smoke-test.sh test
# deploy-staging: ./scripts/deploy.sh staging
```

## 变量与密钥

- 密钥不得写入 wiki 或 demand；使用环境变量或本地配置。
- 变更须更新本节并通知负责人。
