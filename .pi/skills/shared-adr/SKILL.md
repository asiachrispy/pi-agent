---
name: shared-adr
description: 维护 wiki/adr/ 下的架构决策记录（ADR）。任何触发 ADR 条件的设计决策必须创建 ADR。极简模板：1-3 句 context + decision + why。使用场景：/team 识别决策点、/team 重大重构前、/team 审计决策链。
---

# shared-adr

ADR（Architecture Decision Record）是架构决策的轻量记录。不追求长篇分析，追求"做了这个决策、为什么"能被后来的 agent 和人读到。

## 适用场景

- `/team`：PRD 满足 ADR 触发条件（见 `shared-prd-template`）时，创建 ADR 并填写 `adr_refs`。
- `/team`：重大重构前（如更换技术实现方式、改变跨模块调用链），创建或引用 ADR。
- `/team`：上线审计时检查 ADR 链完整性：PRD → ADR → 代码是否一致。

## ADR 文件位置

```text
wiki/adr/0001-<slug>.md
wiki/adr/0002-<slug>.md
...
```

编号规则：

- 在 `wiki/adr/` 下查找最大编号，递增。
- 编号是全局的（跨业务域），不使用 per-domain 编号。
- `<slug>` 使用英文小写连字符，简短描述决策主题，如 `0001-batch-audit-idempotency`。

## 极简模板

```md
# {决策标题}

{1-3 句话：context + decision + why}
```

示例：

```md
# 批量审核幂等性用数据库行锁而非 Redis 锁

批量审核接口需要防止重复提交导致审核状态错误。
决策：使用 MySQL SELECT ... FOR UPDATE 在采购单行上加悲观锁，冲突时抛出 DuplicateAuditException。
原因：采购单审核本身在同一个 MySQL 事务中，行锁比 Redis 锁少一次网络往返，且事务回滚时锁自动释放，避免分布式锁未释放的泄漏风险。
```

## 引用方式

- PRD frontmatter `adr_refs` 字段引用 ADR 编号，如 `["0001-batch-audit-idempotency"]`。
- `team` 实现时，若 PRD frontmatter 有 `adr_refs`，必须先读对应 ADR 文件再修改代码。
- `team` 审计时，交叉验证 PRD 的 `adr_refs` → ADR 文件 → 代码实现是否一致。

## ADR 消费时机

| agent | 何时读 | 检查什么 |
|---|---|---|
| `/team` | PRD 写出后、DoR 自检时 | 触发条件满足？adr_refs 非空？ADR 文件已创建？ |
| `/team` | 读 PRD 后、动手前 | adr_refs 非空时逐个读 ADR 文件，确认设计方案与 ADR 一致 |
| `/team` | 验收时 | 安全关键路径的实现是否符合 ADR 约定（如幂等策略） |
| `/team` | 上线审计时 | adr_refs → ADR 文件 → git diff 三段闭环 |

## ADR 触发条件

（定义在 `shared-prd-template`，此处只做引用说明）

任一满足时 ADR 必须存在：

1. 引入新的技术栈或中间件
2. 改变已有数据流向
3. 影响 ≥ 2 个后端模块的接口契约变更
4. 引入新的权限模型或数据可见性规则
5. 替换核心框架库

判定方：`/team` 写 PRD 时判断，`/team` 读时复核。

## 维护规则

- ADR 文件一旦创建，不得删除，只能标记为 `status: superseded` 并指向新 ADR。
- superseded 写法：在旧 ADR 正文末尾加一行 `superseded_by: 0005-xxx`。
- `wiki/adr/` 目录增量创建（第一个 ADR 创建时目录自动出现）。
- ADR 编号是全局递增的，不回收废弃编号。
