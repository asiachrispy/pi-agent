# pi-agent 企业研发工作区优化版方案

## Summary

参考 `../mk-lab` 的已落地方案后，建议把 pi-agent 定位为“企业研发工作区总仓库”，而不是一开始做完整项目管理系统。

核心优化：用 **PRD 状态机 + 执行规格 + 个人 JTBD + QA/Ship 审计** 替代偏重的 `tasks/` 全流程审批状态机。这样更贴近中小团队真实落地：文件可版本化，智能体可读写，人也能维护，流程不会过重。

## Key Design

- 工作区总仓库只追踪团队配置和知识库，不追踪业务源码：
  - `.pi/agents/`：团队级智能体
  - `.pi/prompts/`：团队命令入口
  - `.pi/extensions/`：subagent、JTBD 同步等项目扩展
  - `.pi/skills/`：PRD、DoR、AC、handoff、ADR 等协同纪律
  - `wiki/`：企业知识库
  - `JTBD/`：每个成员个人待办
  - `scripts/`：初始化、入口同步、wiki 索引同步、环境检查
  - 业务仓库作为独立 Git 仓库放在工作区下，并在总仓库 `.gitignore` 中忽略
- 知识库不要按“部门文件夹”硬拆到底，改为“source of truth + 角色入口”：
  - `wiki/agent-reading-map.md`：智能体读取路由，规定什么时候读什么、禁止读什么
  - `wiki/project-overview.md`：业务、架构、领域语言、高风险点
  - `wiki/project-map.md`：仓库、模块、技术栈、命令、负责人
  - `wiki/prd/`：产品需求，作为产品-研发唯一契约
  - `wiki/exec-specs/`：中大需求的执行规格与追溯
  - `wiki/adr/`：架构决策记录
  - `wiki/validation-rules.md`：测试、lint、build、环境验证策略
  - `wiki/raw/database/`：DDL 原始参考，大文件只按索引检索
  - 部门视角通过 README/索引页呈现，不作为唯一目录结构
- 任务体系分三层：
  - 团队交付任务：以 `wiki/prd/**/REQ-YYYY-NNN-*.md` 为主，PRD frontmatter 维护状态
  - 执行过程：以 `exec-spec` 和 agent 输出记录实现、验证、阻断、风险
  - 个人任务：以 `JTBD/<git-user>-jtbd.md` 维护，每人只维护自己的待办
- 不单独设计 `tasks/` 目录作为第一版主流程，避免和 PRD、exec-spec、JTBD 重叠。

## Workflow

- `/team-pm <需求>`：
  - 产品入口，负责需求澄清、调研、原型草图、PRD 创建/更新
  - 只允许写 `wiki/prd/**` 和必要的 wiki 索引
  - PRD 未通过 DoR 时不得交给开发
- `/team-dev <需求或 prd_ref>`：
  - 技术开发入口，不分前后端
  - 先读 `agent-reading-map.md`，再按任务读取最小必要 wiki
  - 若有 `prd_ref`，必须先校验 PRD DoR 和 AC
  - 完成代码、测试、修复、验证，并输出 `needs_qa`
- `/team-qa`：
  - 仅在高风险或手动触发时验收
  - 对照 PRD AC 编号、风险路径、验证规则输出通过/失败/阻塞
- `/team-ship`：
  - 发版前审计，只检查不生产部署
  - 检查 git diff、测试、构建、数据库、环境变量、接口兼容、回滚风险
- `/jtbd-show`：
  - 查看当前成员个人待办
  - JTBD 更新由扩展从 agent 输出的结构化块自动同步

## Public Interfaces

- PRD frontmatter 使用：
  - `id`
  - `title`
  - `domain`
  - `status: draft|review|ready|implemented|validated|shipped`
  - `ready_for_dev: true|false`
  - `affected_projects`
  - `modules_touched`
  - `risk`
  - `owner`
  - `adr_refs`
  - `created_at`
  - `updated_at`
- PRD 必须包含：
  - Definition of Ready
  - 背景
  - 目标与不做范围
  - 适用项目与领域语言
  - 用户角色
  - 业务流程
  - 页面/入口/交互说明
  - 接口/数据要求
  - 编号化验收标准 `AC-001`
  - 风险点
  - 待确认问题
- `dev_task` 作为产品到研发的交接格式：
  - `prd_ref`
  - `affected_projects`
  - `acceptance_criteria_summary`
  - `risks`
  - `dor_result: pass`
  - `context`
- 执行规格记录：
  - PRD 引用
  - 影响范围
  - 不做范围
  - AC 覆盖
  - Traceability：PRD/AC → 改动文件 → 验证命令 → 结果
  - 验证范围：targeted/module/full/env-dependent
  - 既有阻断
  - 未验证项
  - 后续修复项
  - 上线注意事项

## Automation Rules

- 默认最大自动化，但不突破安全边界：
  - 可自动读 wiki、写 PRD、写代码、跑测试、修复失败、同步 wiki 索引、更新个人 JTBD
  - 不自动执行生产部署
  - 不自动执行生产数据库变更
  - 不自动提交、推送，除非用户明确要求
  - 不跨仓库扩大范围
- QA 触发按影响半径判断，而不是按文件数量：
  - shared/公共模块
  - 权限、角色、登录态
  - 金额、订单、库存、财务、物流关键流程
  - 数据库 Schema
  - 跨仓库改动
  - BI/报表指标口径
- 测试环境交付第一版不新建复杂运维平台：
  - 在 `project-map.md` 或 `validation-rules.md` 中声明每个项目的测试环境命令
  - agent 可执行已登记的测试环境部署/冒烟脚本
  - 未登记脚本时只生成部署说明，不临时猜测命令

## Implementation Phases

- Phase 1：复制 mk-lab 已验证骨架
  - 建立 `.pi/agents`、`.pi/prompts`、`.pi/extensions/subagent`
  - 建立 `wiki/agent-reading-map.md`、`project-overview.md`、`project-map.md`、`validation-rules.md`
  - 建立 PRD 模板、DoR skill、AC skill、handoff skill
  - 建立 bootstrap、setup-entrypoints、check-env、sync-wiki 脚本
- Phase 2：接入个人协同
  - 建立 `JTBD/`
  - 接入 JTBD 自动同步扩展
  - 明确每人只能维护自己的 JTBD 文件
- Phase 3：增强运维闭环
  - 在项目索引中补充测试环境部署、冒烟、回滚脚本
  - 增加 `/team-env` 或由 `/team-ship` 检查测试环境结果
  - 仍不自动生产发布
- Phase 4：产品化 UI
  - pi-app 读取同一套文件协议
  - 做 PRD 列表、JTBD、执行规格、QA/Ship 报告、wiki 检索界面
  - UI 只是文件协议的可视化层，不替代文件源数据

## Test Plan

- 用 3 个真实需求验证链路：
  - 一个纯前端小需求
  - 一个前后端联动需求
  - 一个权限/订单/库存/财务等高风险需求
- 每个样本必须验证：
  - PRD 是否通过 DoR
  - dev_task 是否能被开发 agent 直接消费
  - AC 是否能追溯到代码和测试
  - 验证结果是否区分 targeted/module/full/env-dependent
  - QA 是否只在高风险场景触发
  - Ship 审计是否能指出未验证项、阻断项和发布风险
  - JTBD 是否自动同步个人待办

## Assumptions

- 第一版以文件协议、agent、prompt、skill、脚本为主，不先做数据库型任务系统。
- PRD 是团队交付任务的主载体，JTBD 是个人任务载体。
- 业务源码仍由各自独立仓库管理，pi-agent 总仓库只管理团队工作流和知识库。
- 测试环境脚本必须显式登记后才能由智能体执行。
- 生产发布和生产数据库变更始终需要人工确认。
