# AGENTS.md — Harness 工作流规范

> 多 Agent 协同开发规范入口。详细约束见 `instructions` 引用的文件。
> 本项目为通用工作流模板，具体技术栈待项目初始化后填充。

## **R-0: 语言强制规范 — 所有思考过程与输出必须使用简体中文**

**所有 Agent（含主 Agent 与所有子 Agent）的思考过程、分析、回答、代码注释、文档编写、交接报告，必须使用简体中文。**

唯一例外：代码标识符（变量名、函数名、类型名）、英文术语、命令行指令、JSON 字段名 / YAML 键名可使用英文。

---

## 技术栈（项目初始化后填充）

| 层级 | 技术 |
|------|------|
| 前端 | _待定_ |
| 业务逻辑 | _待定_ |
| 运行时 | _待定_ |
| 构建工具 | _待定_ |
| 测试框架 | _待定_ |
| 包管理 | _待定_ |

---

## 常用命令（项目初始化后填充）

```bash
# 示例 — 请根据实际项目替换
# <pkg> run dev           # 启动开发服务器
# <pkg> run build         # 构建生产版本
# <pkg> run lint          # 代码检查
# <pkg> run typecheck     # 类型检查
# <pkg> run test          # 运行测试
```

---

## Agent 工作流

```pseudo
// ================================================================
// coordinator 是唯一的主 Agent，一切任务的入口与出口
// ================================================================
FUNCTION main(user_task):
    // Phase 1: 生成全链路 Trace ID（使用 /gen-uuid 命令，P-02）
    // Phase 2: 委派 plan 子 Agent 做只读分析 → 生成 PLAN 合同
    //          Plan 输出: task_type, files_to_modify, constraints, verification,
    //          coverage_checklist, recommended_subagent, requires_build, suggested_skills, risks
    // Phase 3: 基于 Plan 输出使用 /gen-contract 命令生成任务合同 JSON 骨架
    //          （自动填入 timestamp + trace_id），填充其余字段后写入
    //          .opencode/contracts/{YYYYMMDD}/{YYYYMMDD}_TYPE_NNN.json，status = pending
    // Phase 4: 调用 validate-contract 工具验证合同（Schema + 时效性）
    //          FAIL → coordinator 修正 → GOTO Phase 4
    // Phase 5: 按三层结构执行 pre_task hooks（全局 → Agent 特定 → 合同）
    //          统一协议：PASS(0)/BLOCK(1)/WARN(2)
    //          BLOCK → 合同→failed，委派 crash-doctor（DOCTOR 合同） → GOTO retro
    //          加载 plan.suggested_skills（如有）
    // Phase 6: 合同→active，委派 plan.recommended_subagent 执行
    //          （代码修改 → task-executor，纯构建 → builder）
    //          每个委派对应一种合同类型：FIX/FEAT/DOCS/BUILD
    // Phase 7: 按三层结构执行 post_task hooks
    // Phase 8: 执行失败 → 委派 crash-doctor（DOCTOR 合同）诊断 → GOTO retro
    // Phase 9: 代码审查 → 委派 code-reviewer（REVIEW 合同）
    //          审查 FAIL 且 retry_count < 3 → 委派 plan 分析修复方案
    //          → 基于修复计划生成 fix_contract → 委派 task-executor → 重新审查
    //          审查 FAIL 且 retry_count ≥ 3 → 失败，委派 crash-doctor（DOCTOR 合同）
    // Phase 10: 构建验证（条件触发）→ 委派 builder（BUILD 合同）
    // Phase 11: 合同→completed
    // Phase 12: 复盘 → 委派 retro（RETRO 合同），强制（R-6）
    //           retro 输出复盘报告、事故记录、约束更新建议
    // Phase 13: Git 操作（复盘后，仅 completed 时执行）
    //           加载 git-commit skill → 生成 GIT 合同 → git add/commit/push
```
> 完整工作流详情见 `.opencode/agents/coordinator.md`（委派流程）和 `.opencode/constraints/contract-mechanism.md`（合同机制与阶段链）。

### Agent 列表

| Agent | 类型 | 职责 | 提示词文件 |
|-------|------|------|-----------|
| coordinator | primary | 任务入口与出口：拆分、合同、委派、验证 | `agents/coordinator.md` |
| plan | subagent | 只读分析、方案评审 | `agents/plan.md` |
| analyzer | subagent | 深度分析：依赖追踪、影响评估、架构审计（plan 的子代理） | `agents/analyzer.md` |
| task-executor | subagent | 代码编写（合同范围内） | `agents/task-executor.md` |
| builder | subagent | 构建、部署 | `agents/builder.md` |
| code-reviewer | subagent | 代码审查 | `agents/code-reviewer.md` |
| crash-doctor | subagent | 崩溃诊断 | `agents/crash-doctor.md` |
| retro | subagent | 复盘、约束更新 | `agents/retro.md` |
| service-agent | subagent | 后台服务管理：启动/停止开发服务器等常驻进程 | `agents/service-agent.md` |
| heartbeat | subagent | 心跳监控：检查服务 PID 和端口是否就绪 | `agents/heartbeat.md` |
| smoke-tester | subagent | E2E 冒烟测试：截图、日志、UI分析、模拟点击（服务需提前就绪） | `agents/smoke-tester.md` |

---

## 核心规则索引

各规则详情见对应约束文件，此处仅列编号与概要。

| 编号 | 概要 | 位置 |
|:----:|------|:----:|
| R-0 | 语言强制规范 — 所有思考与输出使用简体中文 | 本文件开头 |
| R-6 | 完整工作流闭环 — 不可跳过任何阶段 | `constraints/contract-mechanism.md` |
| R-7 | 禁止跳过 Coordinator | `constraints/agent-system.md` |
| R-8 | 合同必须 — 仅修改 files_to_modify 指定文件，30min 有效期 | `constraints/contract-mechanism.md` |
| R-9 | 网络搜索前必须先执行 date | `constraints/agent-system.md` |
| R-10 | Builder 构建前检查工作区洁净 | `constraints/agent-system.md` |
| R-11 | 禁止无差别杀进程 | `constraints/agent-system.md` |
| R-12 | 后台服务必须通过 Service-Agent 管理 | `constraints/agent-system.md` |
| R-13 | 后台服务必须有心跳验证 | `constraints/agent-system.md` |
| R-14 | 自动修复循环（≤3次） | `constraints/contract-mechanism.md` |
| R-15 | Hook 文档实现一致性 | `constraints/contract-mechanism.md` |
| P-01 | 模型列表一致性（项目初始化后适用） | `constraints/agent-system.md` |
| P-02 | 全链路 Trace ID — UUID 贯穿全链路 | `constraints/contract-mechanism.md` |
| P-03 | Harness Engineering 六支柱覆盖率评估 | `constraints/agent-system.md` |
| P-04 | validate-contract 文件存在性检查已修复，由 post-edit-verify 替代 | `constraints/contract-mechanism.md`（已知局限） |

---

## 事故记录索引

事故记录存放于 `.opencode/incidents/` 目录：

| 事故编号 | 日期 | 关联任务 | 简述 | 状态 |
|---------|------|---------|------|:----:|
| [INC-20260516-001](.opencode/incidents/INC-20260516-001.md) | 2026-05-16 | DOCS-001 | validate-contract.sh 对新建文件存在性检查误报 | 已修复 |

---

## 约束文档

详细约束规则通过 `opencode.jsonc` 的 `instructions` 字段引用，位于 `.opencode/constraints/` 目录：
- `agent-system.md` — Agent 角色分离与工作区隔离
- `arch-layering.md` — 三层架构依赖规则
- `contract-mechanism.md` — 合同机制与生命周期
- `tech-stack/typescript.md` — TypeScript 约束
- `tech-stack/react.md` — React 编码约束

合同模板：`.opencode/contracts/contract-schema.json`

验证工具：`tools/validate-contract`（OpenCode 原生工具）

---

> **注意**：约束文档中 `arch-layering.md` 的架构描述和 `tech-stack/` 下的技术栈约束为通用模板，
> 应在项目初始化后根据实际技术栈调整具体内容。
