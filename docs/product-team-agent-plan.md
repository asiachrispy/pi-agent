# 产品研发组智能体方案（基于 pi-agent）

## 1. 目标

构建一个面向产品研发效率提升的智能体协作体系，核心目标是：

- 减少人工介入
- 缩短需求从提出到交付的链路
- 避免过度拆分前后端角色造成协作成本
- 让一个全栈开发智能体完成大多数需求闭环
- 测试智能体只在复杂逻辑、关键业务流程和高风险场景中介入
- 上线前由审计智能体自动检查风险，但生产部署仍需人工确认

## 2. 核心结论

不建议构建传统的：

```text
产品 → 前端 → 后端 → 测试 → 上线
```

这种流程更适合多人团队，但对于“多数需求由一个人全栈完成”的场景，会带来额外成本：

- 上下文传递成本
- 前后端接口协同成本
- 重复阅读代码
- 并行修改冲突
- token 消耗增加
- 人工确认节点变多

推荐构建：

```text
一个强全栈开发智能体
+
两个按需专家智能体
```

即：

```text
fullstack-dev     # 默认闭环交付
qa-acceptance     # 仅复杂逻辑验收
release-auditor   # 上线前风险检查
```

`product-planner` 可作为可选专家保留，但不进入默认流程。

## 3. 推荐智能体角色

### 3.1 fullstack-dev：核心开发智能体

职责：

- 理解需求
- 阅读项目结构和规范
- 判断涉及前端、后端、数据库、接口、测试的范围
- 制定轻量实现计划
- 修改代码
- 编写或更新必要测试
- 运行 lint / typecheck / test / build
- 自动修复失败
- 输出交付报告
- 判断是否需要 QA 介入

这是默认主力智能体，承担 80% 以上需求的闭环交付。

### 3.2 qa-acceptance：复杂逻辑验收智能体

职责：

- 只处理复杂逻辑和关键路径验收
- 不参与普通需求测试
- 根据需求、diff、测试结果设计验收用例
- 检查权限、状态流转、金额、订单、数据一致性等风险
- 运行或补充测试
- 输出是否可上线结论

### 3.3 release-auditor：上线审计智能体

职责：

- 检查当前变更是否具备上线条件
- 检查测试、构建、迁移、环境变量、破坏性变更
- 输出上线风险报告
- 默认不直接部署生产

### 3.4 product-planner：可选产品分析智能体

仅在以下情况介入：

- 需求模糊
- 范围较大
- 业务规则复杂
- 用户要求产出 PRD / 验收标准

默认不调用，避免小需求流程变重。

## 4. 默认研发流程

### 4.1 普通需求流程

适用于：

- 文案调整
- 样式调整
- 普通交互
- 普通 CRUD
- 普通前后端联动
- 小型 bug 修复

流程：

```text
用户输入需求
  ↓
fullstack-dev
  - 理解需求
  - 查代码
  - 实现
  - 自测
  - 修复失败
  - 输出 needs_qa 判断
  ↓
release-auditor
  - 检查是否可上线
  ↓
完成
```

### 4.2 复杂需求流程

适用于：

- 权限 / 角色 / 登录态
- 支付 / 订单 / 金额
- 状态流转 / 审批流 / 工作流
- 数据迁移 / 数据一致性
- 多端协同
- 并发 / 幂等 / 重试
- 边界条件复杂

流程：

```text
用户输入需求
  ↓
fullstack-dev 实现 + 自测
  ↓
命中 QA 触发条件
  ↓
qa-acceptance 验收复杂逻辑
  ↓
如发现问题，交回 fullstack-dev 修复
  ↓
release-auditor 上线检查
  ↓
完成
```

## 5. QA 触发规则

只有命中以下任一条件，才调用 `qa-acceptance`：

- 涉及权限、角色、登录态
- 涉及支付、订单、金额、余额
- 涉及状态机、审批流、工作流
- 涉及数据迁移或数据一致性
- 涉及并发、幂等、重试
- 涉及多端协同或复杂前后端联动
- 改动文件数量较多，例如超过 8 个
- 测试失败后修复超过 2 轮
- fullstack-dev 明确输出 `needs_qa: true`
- 用户显式要求测试、验收或复杂逻辑验证

否则不调用 QA，避免流程变慢。

## 6. 人工介入点

默认只保留必要人工确认：

1. 需求严重不清晰
   - 智能体最多提 1-3 个关键问题

2. 高风险操作
   - 数据库迁移
   - 删除数据
   - 大规模重构
   - 生产部署

3. 上线确认
   - release-auditor 输出报告后，由人确认是否 deploy

其余环节尽量自动完成。

## 7. 基于 pi-agent 的落地方式

### 7.1 第一阶段：使用 subagent + prompt 模板

无需修改 pi-agent 内核，直接利用 pi-agent 的 Extension / Agent Definition / Prompt Template 能力。

推荐结构：

```text
# mk-lab 专用 agents / prompts / extensions 全部放项目范围
<mk-lab-root>/
└── .pi/
    ├── agents/
    │   ├── fullstack-dev.md
    │   ├── qa-acceptance.md
    │   └── release-auditor.md
    ├── prompts/
    │   ├── mk-dev.md
    │   ├── mk-qa.md
    │   └── mk-ship.md
    └── extensions/
        └── subagent/
            ├── index.ts
            └── agents.ts
```

4 个业务仓库各自通过 `scripts/setup-pi-entrypoints.sh` 生成本地 symlink 入口：

```text
<child-repo>/.pi/prompts/mk-dev.md    -> ../../../.pi/prompts/mk-dev.md
<child-repo>/.pi/prompts/mk-qa.md     -> ../../../.pi/prompts/mk-qa.md
<child-repo>/.pi/prompts/mk-ship.md   -> ../../../.pi/prompts/mk-ship.md
<child-repo>/.pi/extensions/subagent  -> ../../../.pi/extensions/subagent
```

这样每位成员只需要本机安装 Pi 和个人模型配置；mk-lab 的 agents、prompts、subagent 扩展都随总仓库版本管理。

### 7.1.1 mk-lab 项目仓库地图

业务代码根目录：

```text
<mk-lab-root>/
```

当前接入 4 个项目：

```text
<mk-lab-root>/mk-web-business
<mk-lab-root>/mk-web-logistics
<mk-lab-root>/mk-web-supplier
<mk-lab-root>/mkerp
```

项目说明：

| 项目 | 类型 | 技术栈 | 推荐验证命令 |
|---|---|---|---|
| `mk-web-business` | 业务端前端 | Vue 3 / Vite / TypeScript / Element Plus / Pinia / Vitest | `pnpm test`, `pnpm lint`, `pnpm build` |
| `mk-web-logistics` | 物流端前端 | Vue 3 / Vite / TypeScript / Element Plus / Pinia / Vitest | `pnpm test`, `pnpm lint`, `pnpm build` |
| `mk-web-supplier` | 供应商端前端 | Vue 3 / Vite / TypeScript / Element Plus / Pinia / Vitest | `pnpm test`, `pnpm lint`, `pnpm build` |
| `mkerp` | 后端 ERP | Java 8 / Spring Boot 2.3.2 / Maven 多模块 / MyBatis Plus | `mvn test`, `mvn -DskipTests package`, `mvn -pl <module> -am test/package` |

项目选择规则：

- 页面、菜单、表格、弹窗、前端交互：优先定位到对应 `mk-web-*` 仓库。
- 接口、数据库、权限、订单、库存、物流、财务：优先检查 `mkerp`。
- 前后端联动：同时检查后端接口和前端调用。
- 用户未指定项目且无法推断时，智能体最多问 1 个关键问题。

### 7.1.2 mk-erp-wiki 知识库使用策略

`<mk-lab-root>/mk-erp-wiki/` 下的文档不建议全文复制进 prompt，应作为 agent 按需读取的项目知识库：

| 文件 | 用途 | 读取时机 |
|---|---|---|
| `README.md` | wiki 入口索引、目录说明、命名规范 | 不清楚该读哪个文件时先读 |
| `project-overview.md` | 项目总览、业务模块、前后端契约、重要文件、已知坑 | 任何 mk-lab 需求开始时优先读取或检索 |
| `project-map.md` | 4 个仓库地图、模块地图、前后端对应关系、常用命令 | 判断需求属于哪个仓库时读取 |
| `frontend-rules.md` | 前端技术栈、Vue/TS/Element Plus/useTable/ArtTable/i18n/权限规范 | 涉及 `mk-web-*` 前端开发或验收时读取 |
| `backend-rules.md` | 后端技术栈、模块边界、Controller/SharedService/MyBatis/MQ/数据库规则 | 涉及 `mkerp` 后端开发或验收时读取 |
| `data-analysis-rules.md` | BI/报表/指标口径/数仓分层/数据质量规范 | 涉及报表、看板、指标、数据分析时读取 |
| `data-source-catalog.md` | 业务库表与 ODS/DWD/DWS/ADS 映射 | 涉及取数、报表数据源、数仓表选择时读取 |
| `workflow-usage.md` | `/mk-dev`、`/mk-qa`、`/mk-ship` 使用说明 | 使用智能体流程前读取 |
| `raw/database/mkerp.sql` | 业务库 DDL | 需要确认业务表字段、索引、类型、COMMENT 时按表名检索 |
| `raw/database/dataware.sql` | 数仓 DDL | 需要确认 ODS/DWD/DWS/ADS 字段和指标来源时按表名检索 |
| `ui-guidelines/` | UI / UX / 视觉 / 组件规范预留目录 | 后续涉及 UI 规范时读取 |
| `prd/` | 产品 PRD 预留目录 | 后续涉及具体产品需求时读取 |

优化原则：

- `project-overview.md` 是总览，应让 `fullstack-dev` 默认优先读取。
- `frontend-rules.md` 是前端规则，应进入前端任务触发条件，不必每次读取。
- `data-analysis-rules.md` 和 `data-source-catalog.md` 是数据/报表专家知识，应只在 BI/指标/报表任务中读取。
- `raw/database/mkerp.sql` 和 `raw/database/dataware.sql` 体量较大，只做 source of truth，通过表名检索读取，不进入默认上下文。

### 7.2 第二阶段：开发 product-team 扩展

当第一阶段跑通后，再开发专用扩展：

```text
.pi/extensions/product-team/index.ts
```

提供命令：

```text
/mk-dev <需求>   # 默认开发流程
/mk-qa          # 手动触发复杂验收
/mk-ship        # 上线前检查
/status         # 查看当前任务状态
```

扩展负责：

- 维护流程状态
- 自动判断是否需要 QA
- 保存阶段产物
- 汇总测试与构建结果
- 高风险操作前确认
- 生成最终交付报告

## 8. 推荐 Agent 定义

### 8.1 `fullstack-dev.md`

```markdown
---
name: fullstack-dev
description: 全栈开发智能体，负责独立完成需求理解、前后端实现、自测、修复和构建验证
tools: read, write, edit, bash, grep, find, ls
model: claude-sonnet-4-5
---

你是全栈产品开发工程师。

目标：尽量独立完成需求从代码实现到本地验证，减少人工介入。

工作流程：
1. 先阅读项目结构、README、AGENTS.md、package.json 等约定
2. 判断需求涉及前端、后端、数据库、接口、测试的范围
3. 制定简短实现计划
4. 修改代码
5. 编写或更新必要测试
6. 运行项目已有检查命令，例如 lint、typecheck、test、build
7. 如果失败，继续修复，直到通过或明确说明阻塞原因
8. 判断是否需要 QA 介入

QA 触发条件：
- 权限 / 角色 / 登录态
- 支付 / 订单 / 金额
- 状态流转 / 审批流 / 工作流
- 数据迁移 / 数据一致性
- 并发 / 幂等 / 重试
- 复杂边界条件
- 改动文件较多
- 测试失败后多轮修复

输出格式：

## 实现内容

## 修改文件

## 测试结果

## 风险点

## needs_qa
true 或 false，并说明原因。
```

### 8.2 `qa-acceptance.md`

```markdown
---
name: qa-acceptance
description: 复杂业务逻辑测试验收智能体，只在关键流程、复杂规则、权限、支付、订单等场景介入
tools: read, write, edit, bash, grep, find, ls
model: claude-sonnet-4-5
---

你是测试验收智能体。

你不负责普通需求测试，只处理复杂逻辑和关键路径验收。

重点关注：
- 权限边界
- 登录态与角色控制
- 状态流转
- 金额、订单、支付
- 数据一致性
- 并发、幂等、重试
- 异常流程
- 回归风险

工作流程：
1. 阅读需求、实现说明和当前 git diff
2. 识别关键路径和风险点
3. 设计验收用例
4. 必要时补充测试
5. 运行相关测试
6. 输出是否可上线结论

输出格式：

## 验收范围

## 测试用例

## 执行结果

## 发现问题

## 是否可上线
```

### 8.3 `release-auditor.md`

```markdown
---
name: release-auditor
description: 上线前审计智能体，检查测试、构建、迁移、环境变量和风险项，默认不执行生产部署
tools: read, bash, grep, find, ls
model: claude-haiku-4-5
---

你是上线审计智能体。

你只检查是否具备上线条件，默认不执行生产部署。

检查项：
1. 查看 git diff
2. 确认测试是否通过
3. 确认 build 是否通过
4. 检查是否有数据库迁移
5. 检查是否有环境变量变化
6. 检查是否有破坏性变更
7. 检查是否有高风险操作

输出格式：

## 上线结论
可以上线 / 暂不建议上线

## 已通过检查

## 风险项

## 需要人工确认

## 建议下一步
```

## 9. 推荐 Prompt 模板

### 9.1 `mk-dev.md`

```markdown
---
description: 默认开发流程：fullstack-dev 闭环实现，必要时 QA 验收，最后 release-auditor 检查
---

请使用 subagent 工具执行开发流程：

1. 调用 `fullstack-dev` 完成以下需求：$@

要求 fullstack-dev：
- 理解需求
- 修改代码
- 编写或更新必要测试
- 运行 lint/typecheck/test/build
- 自动修复失败
- 输出 `needs_qa: true/false`

2. 如果 fullstack-dev 输出 `needs_qa: true`，再调用 `qa-acceptance` 根据需求、实现说明、当前 diff 和测试结果做复杂逻辑验收。

3. 最后调用 `release-auditor` 检查当前变更是否具备上线条件。

请尽量减少人工介入。只有在需求不清晰、高风险操作或生产部署时才请求用户确认。
```

### 9.2 `mk-qa.md`

```markdown
---
description: 手动触发复杂逻辑验收
---

请调用 `qa-acceptance` 对当前变更进行测试验收。

重点检查：
- 当前 git diff
- 需求是否完整实现
- 复杂业务规则
- 权限边界
- 状态流转
- 数据一致性
- 回归风险

输出是否可上线结论。
```

### 9.3 `mk-ship.md`

```markdown
---
description: 上线前审计检查
---

请调用 `release-auditor` 检查当前变更是否具备上线条件。

检查：
- git diff
- lint/typecheck/test/build 结果
- 数据库迁移
- 环境变量变化
- 破坏性变更
- 高风险操作

默认不要执行生产部署，只输出上线审计报告。
```

## 10. 迭代路线

### Phase 1：最小可用

交付内容：

- `fullstack-dev.md`
- `qa-acceptance.md`
- `release-auditor.md`
- `mk-dev.md`
- `mk-qa.md`
- `mk-ship.md`

目标：先用 prompt 驱动跑通完整流程。

### Phase 2：流程稳定化

增强：

- 项目级 `.pi/agents/fullstack-dev.md`
- 明确项目检查命令
- 明确 QA 触发规则
- 输出统一交付报告

### Phase 3：扩展自动化

开发 `product-team` extension：

- `/mk-dev`
- `/mk-qa`
- `/mk-ship`
- `/status`
- 自动记录阶段状态
- 自动判断 QA
- 自动汇总报告

## 11. 成功指标

可以用以下指标评估效果：

- 普通需求人工介入次数 ≤ 1
- 普通需求不触发 QA 的比例 ≥ 70%
- fullstack-dev 一次完成率逐步提升
- 测试失败自动修复成功率提升
- 上线前遗漏风险减少
- 单需求平均交付时间下降

## 12. 最终建议

不要把智能体系统设计成完整传统团队，而应设计成：

```text
fullstack-dev 默认闭环
qa-acceptance 按需验收
release-auditor 上线审计
```

这更符合当前真实研发模式：

- 大多数需求由一个人全栈完成
- 测试人员只做复杂逻辑验收
- 上线前需要自动检查，但生产发布仍需人工确认

最小落地路径是先创建 3 个 agent + 3 个 prompt，验证流程稳定后，再开发专用 `product-team` 扩展。
