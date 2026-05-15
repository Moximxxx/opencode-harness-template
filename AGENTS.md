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
    // ---------- Phase 1: 生成全链路 Trace ID ----------
    trace_id = coordinator.generate_uuid()
    // trace_id 在 Plan 阶段即开始使用，贯穿全链路（P-02）

    // ---------- Phase 2: 委派计划分析（强制）----------
    // Plan 接收原始用户需求，不是合同
    plan = coordinator.delegate(plan, {
        user_task: user_task,
        trace_id: trace_id
    })
    // Plan 输出结构化报告，含合同所需全部字段:
    // { task_type, files_to_modify, constraints, verification,
    //   coverage_checklist, recommended_subagent, requires_build,
    //   suggested_skills, risks }

    // ---------- Phase 3: 基于 Plan 输出生成任务合同 ----------
    contract = coordinator.generate_contract({
        trace_id: trace_id,
        goal: user_task,
        files_to_modify: plan.files_to_modify,
        constraints: plan.constraints,
        verification: plan.verification,
        coverage_checklist: plan.coverage_checklist,
        tech_stack_constraints: [...],
        hooks: { pre_task: [...], post_task: [...] }
    })
    // 写入 .opencode/contracts/{YYYYMMDD}/{YYYYMMDD}_TYPE_NNN.json
    contract.status = pending
    // 合同必填: task_id, timestamp, trace_id, goal, files_to_modify,
    //          constraints, verification, coverage_checklist, status

    // ---------- Phase 4: 验证合同 ----------
    validation = validate_contract(contract)
    // validate_contract 读取 contract-schema.json 做 JSON Schema 校验
    // 返回值: { valid: bool, errors: string[] }
    IF validation.result == FAIL:
        // 合同不规范，打回给 coordinator 修正
        coordinator.fix_contract(contract, validation.errors)
        GOTO validation

    // ---------- Phase 5: 前置钩子（三层结构）----------
    // 第一层: 全局钩子 — 所有 Agent 自动执行
    // 第二层: Agent 特定钩子 — 按 AGENT_ROLE 匹配
    // 第三层: 合同钩子 — 由合同 hooks.pre_task 声明
    // 统一协议：RESULT: PASS/BLOCK/WARN
    hook_results = coordinator.execute_hooks(contract.hooks.pre_task, {
        agent_role: plan.recommended_subagent,
        global_pre: ["workspace-clean", "diff-size-guard"],
        agent_pre: {  // 按 AGENT_ROLE 匹配
            "task-executor": ["resource-guard", "file-lock-check"],
            "smoke-tester": ["resource-guard"]
        }
    })
    IF any hook in hook_results == BLOCK:
        contract.status = failed
        coordinator.delegate(crash-doctor, {
            error: "Hook BLOCK",
            hook_results: hook_results,
            trace_id: trace_id
        })
        GOTO retro_phase
    IF plan.suggested_skills not empty:
        coordinator.load_skills(plan.suggested_skills)
        // 技能文档位于 .opencode/skills/{name}/SKILD.md

    // ---------- Phase 6: 委派执行 ----------
    contract.status = active
    // 根据 plan.recommended_subagent 决定委派目标:
    //   - 代码修改 → task-executor
    //   - 纯构建   → builder
    result = coordinator.delegate(plan.recommended_subagent, contract)
    // result 结构: { success: bool, handoff: report, files_modified: string[] }

    // ---------- Phase 7: 后置钩子（三层结构）----------
    // 第一层: 全局钩子 — 所有 Agent 自动执行
    // 第二层: Agent 特定钩子 — 按 AGENT_ROLE 匹配
    // 第三层: 合同钩子 — 由合同 hooks.post_task 声明
    // 统一协议：RESULT: PASS/BLOCK/WARN
    post_hook_results = coordinator.execute_hooks(contract.hooks.post_task, {
        agent_role: plan.recommended_subagent,
        global_post: ["entropy-cleanup"],
        agent_post: {  // 按 AGENT_ROLE 匹配
            "task-executor": ["post-edit-verify", "arch-constraint-check", "secret-leak-scan"]
        }
    })
    IF any hook in post_hook_results == BLOCK:
        contract.status = failed
        coordinator.delegate(crash-doctor, {
            error: "Post-hook BLOCK",
            hook_results: post_hook_results,
            trace_id: trace_id
        })
        GOTO retro_phase

    // ---------- Phase 8: 执行结果判断 ----------
    IF result.success == false:
        contract.status = failed
        crash = coordinator.delegate(crash-doctor, result.errors)
        // crash 诊断事故根因
        coordinator.handle_failure(result.handoff, crash)
        GOTO retro_phase

    // ---------- Phase 9: 代码审查 + Plan 驱动的修复循环（≤3次）----------
    retry_count = 0
    label review_loop:
    IF plan.task_type == code_modification:
        review = coordinator.delegate(code-reviewer, {
            contract: contract,
            modified_files: result.files_modified
        })
        // code-reviewer 对照 constraints 逐文件审查
        // review 结构: { pass: bool, issues: [{severity, file, line, message}] }

        IF review.pass == false AND retry_count < 3:
            retry_count = retry_count + 1
            // ★ 修复分析 — Plan 接收审查问题，输出修复方案
            fix_plan = coordinator.delegate(plan, {
                task: "fix_repair",
                original_contract: contract,
                review_issues: review.issues,
                retry_count: retry_count,
                trace_id: trace_id
            })
            // fix_plan 输出: 修复策略 + 调整后的 files_to_modify /
            //   constraints / verification / coverage_checklist

            // 基于修复计划生成 fix_contract
            fix_contract = coordinator.create_fix_contract(
                original_contract = contract,
                fix_plan = fix_plan,
                issues = review.issues,
                retry_count = retry_count
            )
            // fix_contract 保留原始 trace_id，更新 retry_count

            fix_result = coordinator.delegate(task-executor, fix_contract)
            IF fix_result.success == false:
                contract.status = failed
                crash = coordinator.delegate(crash-doctor, fix_result.errors)
                GOTO retro_phase
            GOTO review_loop

        ELSE IF review.pass == false AND retry_count >= 3:
            contract.status = failed
            crash = coordinator.delegate(crash-doctor, result.errors)
            GOTO retro_phase

    // ---------- Phase 10: 构建验证（条件触发）----------
    IF plan.requires_build == true:
        build_result = coordinator.delegate(builder, contract)
        IF build_result.success == false:
            contract.status = failed
            crash = coordinator.delegate(crash-doctor, build_result.errors)
            coordinator.handle_failure(build_result.handoff, crash)
            GOTO retro_phase

    // ---------- Phase 11: 完成 ----------
    contract.status = completed
    // coordinator 汇总所有子 Agent 的交接报告

    // ---------- Phase 12: 复盘（强制，R-6）----------
    label retro_phase:
    retro = coordinator.delegate(retro, {
        contract: contract,
        plan: plan,
        fix_plan: fix_plan,        // 可能为 null（无修复时）
        execution_result: result,
        review: review,            // 可能为 null
        build_result: build_result  // 可能为 null
    })
    // retro 输出:
    //   1. 落盘复盘报告 → .opencode/retros/{task_id}.md
    //   2. 如有事故 → 写入 .opencode/incidents/INC-YYYY-MMDD-NNN.md
    //   3. 如有新约束 → 更新 AGENTS.md + .opencode/constraints/
    // 4. 返回复盘结论: PENDING / NO_ACTION / NEW_CONSTRAINT / UPDATE_CONSTRAINT

    // ---------- Phase 13: Git 操作（复盘后）----------
    // 复盘确认通过后执行最终 git commit + push
    // 仅当 contract.status == completed 时执行
    IF contract.status == completed:
        // 加载 git-commit skill 获取提交规范
        coordinator.load_skill("git-commit")
        // 生成 Git 操作合同
        git_contract = coordinator.generate_git_contract(
            contract = contract,
            commit_type = plan.task_type,  // feat / fix / refactor / etc.
            files = result.files_modified
        )
        git_result = coordinator.delegate(task-executor, git_contract)
        // git 操作失败不影响任务完成状态
        IF git_result.success == false:
            log("WARN: Git 操作失败，任务本身已完成")

    RETURN coordinator.generate_handoff(
        contract, plan, result, review, fix_plan, build_result, retro
    )
```

### Agent 列表

| Agent | 类型 | 职责 | 提示词文件 |
|-------|------|------|-----------|
| coordinator | primary | 任务入口与出口：拆分、合同、委派、验证 | `agents/coordinator.md` |
| plan | subagent | 只读分析、方案评审 | `agents/plan.md` |
| analyzer | subagent | 深度分析：依赖追踪、影响评估、架构审计（plan 的子代理） | `agents/analyzer.md` |
| task-executor | subagent | 代码编写（合同范围内） | `agents/task-executor.md` |
| builder | subagent | 构建、部署、冒烟测试 | `agents/builder.md` |
| code-reviewer | subagent | 代码审查 | `agents/code-reviewer.md` |
| crash-doctor | subagent | 崩溃诊断 | `agents/crash-doctor.md` |
| retro | subagent | 复盘、约束更新 | `agents/retro.md` |
| service-agent | subagent | 后台服务管理：启动/停止开发服务器等常驻进程 | `agents/service-agent.md` |
| heartbeat | subagent | 心跳监控：检查服务 PID 和端口是否就绪 | `agents/heartbeat.md` |
| smoke-tester | subagent | E2E 冒烟测试：截图、日志、UI分析、模拟点击（服务需提前就绪） | `agents/smoke-tester.md` |

---

## 核心规则

### R-0: 语言强制规范 — 所有思考过程与输出必须使用简体中文
→ 见本文件开头详细说明

### R-7: 禁止跳过 Coordinator
一切任务（含代码修改、构建、诊断、复盘、查询分析）必须通过 Coordinator 生成合同并委派给子 Agent 执行。禁止主 agent 绕过 Coordinator 直接执行 Edit / Write / Bash / Task。

### R-8: 合同必须
Task-Executor 仅能修改合同 `files_to_modify` 指定的文件，合同有效期 30 分钟。

### R-6: 完整工作流闭环（强制 — 不可跳过）

每个任务**必须**按顺序走完完整工作流：
Coordinator → Plan → Contract → Validate → Hooks → Task-Executor
→ Code-Reviewer →（自动修复循环 ≤3次）→ Builder → Retro → Git。

**违反后果**：
- 跳过 Plan 阶段直接生成合同 → **违规**，合同无效
- 跳过 Code-Review 阶段 → **违规**，任务不得标记为 completed
- 跳过 Retro 阶段 → **违规**，禁止 Git 提交
- 连续 2 次违规 → Coordinator 必须委派 crash-doctor 诊断流程缺陷

**物理门禁**：
- `coordinator-guard.sh`：编辑文件前检查是否在 active 合同范围内（被 R-8 引用）
- `workflow-integrity-check.sh`：合同完整性验证（trace_id/constraints 等非空）

**验证命令**：
```bash
bash .opencode/hooks/coordinator-guard.sh <file_path>
bash .opencode/hooks/workflow-integrity-check.sh
```

### R-9: 网络搜索时间戳
网络搜索前必须先执行 `date` 获取当前时间，将时间加入搜索关键词。

### R-10: Builder 构建前工作区洁净检查
Builder 执行构建前必须检查 `git status --porcelain`，如有未提交的源码变更需报告 WARNING。
→ 适用范围: builder

### R-11: 禁止无差别杀进程
后台进程清理必须按具体 PID 精确操作，禁止使用 `Stop-Process -Name "node"` 等无差别匹配进程名的操作。

### R-12: 后台服务必须通过 Service-Agent 管理
所有常驻后台进程必须由 service-agent 启动和停止。service-agent 使用完全分离模式启动，立即返回 PID。
→ 适用范围: coordinator, service-agent

### R-13: 后台服务必须有心跳验证
service-agent 启动后台服务后，Coordinator 必须委派 heartbeat agent 验证服务就绪，确认就绪后方可委派后续任务。
→ 适用范围: coordinator, heartbeat

### R-14: 自动修复循环（Auto-Retry Loop）
code-reviewer 审查发现问题时，Coordinator 应委派 Plan 分析修复方案，基于修复计划生成 fix_contract 并重派 task-executor 修复，最多重试 3 次。超过 3 次则升级为失败，委派 crash-doctor 诊断。每次重试的 fix_contract 必须保留原合同的 trace_id 并递增 retry_count。每次修复的决策由 Plan 驱动。

### P-01: 模型列表一致性（项目初始化后适用）
AI 模型列表需在各配置文件之间保持一致。项目初始化时应在相关源文件中统一模型定义。
→ 项目初始化后再确定具体文件范围

### P-02: 全链路 Trace ID
Coordinator 接收用户任务后立即生成全局唯一的 trace_id（UUID 格式），在 Plan 阶段即开始使用，贯穿 Plan → 合同 → Task-Executor → Code-Reviewer → Builder → Retro 全链路。所有子 Agent 的交接/审查/诊断/复盘报告必须携带同一 trace_id。
→ 适用范围: 所有 Agent（全局）

### R-15: Hook 文档实现一致性
contract-mechanism.md 的「Hook 目录」中声明的每个 hook 必须有对应的 `.opencode/hooks/{name}.sh` 脚本实现。尚未实现的 hook 必须在文档中显式标注「(未实现)」，且禁止在合同的 hooks 数组中引用未实现的 hook。

### P-03: Harness Engineering 六支柱覆盖率评估
每次任务复盘必须对照 Harness Engineering 六支柱（上下文架构、架构约束、自验证循环、前馈控制、反馈控制、熵治理）评估当前覆盖率。任一支柱无对应钩子/脚本覆盖时，应在复盘报告中标注为缺口并列入后续任务规划。

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
