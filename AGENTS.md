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
    // Phase 1: 生成全链路 Trace ID（使用 /gen-uuid 命令，R-16）
    // Phase 2: 委派 analyzer 子 Agent 做只读分析（纯分析不决策）
    //          Analyzer 输出: 方案对比（含优缺点）、task_type、files_to_modify、
    //          constraints、verification、coverage_checklist、
    //          recommended_subagent、requires_build、suggested_skills、risks
    // Phase 3: 基于 Analyzer 输出使用 /gen-contract 命令生成任务合同 JSON 骨架
    //          （自动填入 timestamp + trace_id），填充其余字段后写入
    //          .opencode/contracts/{YYYYMMDD}/{YYYYMMDD}_TYPE_NNN.json，status = pending
    // Phase 4: 调用 validate-contract 工具验证合同（Schema + 时效性）
    //          FAIL → coordinator 修正 → GOTO Phase 4
    // Phase 5: 按三层结构执行 pre_task hooks（全局 → Agent 特定 → 合同）
    //          统一协议：PASS(0)/BLOCK(1)/WARN(2)
    //          BLOCK → 合同→failed，加载 crash-doctor skill 诊断 → GOTO retro
    //          注：contract-enforcer/secret-leak-scan/dangerous-command-guard 已迁移为 Plugin
    //              在框架层自动拦截，无需 coordinator 手动调用
    //          加载 analyzer.suggested_skills（如有）
    // Phase 6: 合同→active，委派 analyzer.recommended_subagent 执行
    //          （代码修改 → task-executor，纯构建 → builder）
    //          每个委派对应一种合同类型：FIX/FEAT/DOCS/BUILD
    // Phase 7: 按三层结构执行 post_task hooks
    // Phase 8: 执行失败 → 加载 crash-doctor skill 诊断 → 委派 retro 记录 → GOTO retro
    // Phase 9: 代码审查 → 委派 code-reviewer（REVIEW 合同）
    //          审查 FAIL 且 retry_count < 3 → 委派 analyzer 分析修复方案
    //          → 基于修复计划生成 fix_contract → 委派 task-executor → 重新审查
    //          审查 FAIL 且 retry_count ≥ 3 → 失败，加载 crash-doctor skill → GOTO retro
    // Phase 10: 构建验证（条件触发）→ 委派 builder（BUILD 合同）
    // Phase 11: 合同→completed
    // Phase 12: 复盘 → 委派 retro（RETRO 合同），强制（R-06）
    //           retro 输出复盘报告、事故记录、约束更新建议
    // Phase 13: Git 操作（复盘后，仅 completed 时执行）
    //           加载 git-commit skill → 生成 GIT 合同 → git add/commit/push
```
> 完整工作流详情见 `.opencode/agents/coordinator.md`（委派流程）和 `.opencode/constraints/contract-mechanism.md`（合同机制与阶段链）。

### Agent 列表

| Agent | 类型 | 职责 | 提示词文件 |
|-------|------|------|-----------|
| coordinator | primary | 任务入口与出口：决策、合同、委派、验证 | `agents/coordinator.md` |
| analyzer | subagent | 纯分析不决策：方案对比、依赖追踪、影响评估、架构审计 | `agents/analyzer.md` |
| task-executor | subagent | 代码编写（合同范围内） | `agents/task-executor.md` |
| builder | subagent | 构建、部署 | `agents/builder.md` |
| code-reviewer | subagent | 代码审查 | `agents/code-reviewer.md` |
| retro | subagent | 复盘、约束更新、事故记录 | `agents/retro.md` |
| tester | subagent | 统一测试：单元测试、E2E 测试、UI 冒烟测试 | `agents/tester.md` |

---

## 核心规则索引

所有规则存放在 `.opencode/rules/` 目录，每个规则一个独立文件。AGENTS.md 仅保留 R-0（语言规范）。

### 规则体系说明
- **R-XX**: 规则（Rules），编号从 R-01 到 R-18，按主题分组
  - **合同组 (R-01~R-07)**：任务合同生命周期与工作流完整性
  - **Agent 组 (R-08~R-13)**：各 Agent 角色协作规范
  - **流程组 (R-14~R-18)**：质量控制与追溯机制
- **INC-YYYYMMDD-NNN**: 事故记录（Incidents），独立编号空间，存放于 `.opencode/incidents/`
- **P 前缀已废弃**：原 P-01~P-04 已并入 R-16~R-18 或作为已知局限脚注

| 编号 | 概要 | 文件 |
|:----:|------|------|
| R-0 | 语言强制规范 — 所有思考与输出使用简体中文 | 本文件开头 |
| R-01 | 源码修改前必须先有合同 | `rules/R-01_source-modification-contract.md` |
| R-02 | 合同必须覆盖所有修改文件 | `rules/R-02_coverage-all-files.md` |
| R-03 | 覆盖率闭环 — assert:/SKIP: | `rules/R-03_coverage-closure.md` |
| R-04 | 任务完成后更新合同状态 | `rules/R-04_status-update.md` |
| R-05 | 合同命名规范 | `rules/R-05_contract-naming.md` |
| R-06 | 完整工作流闭环 — 不可跳过任何阶段 | `rules/R-06_workflow-integrity.md` |
| R-07 | 合同范围与时效 — files_to_modify + 30min | `rules/R-07_contract-scope.md` |
| R-08 | 禁止跳过 Coordinator | `rules/R-08_coordinator-gate.md` |
| R-09 | 网络搜索前必须先执行 date | `rules/R-09_web-search-timestamp.md` |
| R-10 | Builder 构建前检查工作区洁净 | `rules/R-10_builder-workspace-clean.md` |
| R-11 | 禁止无差别杀进程 | `rules/R-11_no-indiscriminate-kill.md` |
| R-12 | 后台进程管理规范 — 启动/停止/清理必须记录 PID | `rules/R-12_background-process-management.md` |
| R-13 | 服务就绪检查 — 使用 heartbeat skill 进行心跳验证 | `rules/R-13_heartbeat-required.md` |
| R-14 | 自动修复循环（≤3次） | `rules/R-14_auto-retry-loop.md` |
| R-15 | Hook 文档实现一致性 | `rules/R-15_hook-implementation.md` |
| R-16 | 全链路 Trace ID（原 P-02） | `rules/R-16_trace-id.md` |
| R-17 | 六支柱覆盖率评估（原 P-03） | `rules/R-17_six-pillars-coverage.md` |
| R-18 | 模型列表一致性（原 P-01，项目初始化后适用） | `rules/R-18_model-list-consistency.md` |

---

## 事故记录索引

事故记录存放于 `.opencode/incidents/` 目录：

| 事故编号 | 日期 | 关联任务 | 简述 | 状态 |
|---------|------|---------|------|:----:|
| [INC-20260516-001](.opencode/incidents/INC-20260516-001.md) | 2026-05-16 | DOCS-001 | validate-contract.sh 对新建文件存在性检查误报 | 已修复 |

---

## 约束文档

技术/代码规范约束位于 `.opencode/constraints/` 目录：
- `contract-mechanism.md` — 合同机制与生命周期
- `tech-stack/typescript.md` — TypeScript 约束
- `tech-stack/react.md` — React 编码约束

> 多 Agent 架构规范见本文件 Agent 列表与工作流章节。
> 详细规则见 `.opencode/rules/` 目录。

合同模板：`.opencode/contracts/contract-schema.json`

验证工具：`tools/validate-contract`（OpenCode 原生工具）

---

> **注意**：`tech-stack/` 下的技术栈约束为通用模板，应在项目初始化后根据实际技术栈调整具体内容。

---

