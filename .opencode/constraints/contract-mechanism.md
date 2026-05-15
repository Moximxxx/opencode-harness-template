# 合同机制约束

> 所有源码修改必须先通过协调者生成任务合同，Hook 拦截无合同的修改。

## 机制说明

### 什么是任务合同

任务合同是一个 JSON 文件，位于 `.opencode/contracts/` 目录，定义：
- 任务目标和范围
- 需要修改的文件
- 涉及的约束规则
- 功能覆盖清单
- 验证标准

### 合同生命周期

```
[Plan 分析阶段] → pending（待执行）→ active（执行中）→ completed（已完成）/ failed（失败）
                      ↑
                      └── 30分钟超时，需重新创建
```

合同创建前，Coordinator 先委派 Plan 子 Agent 做只读分析。Plan 的结构化输出直接决定合同的
files_to_modify / constraints / verification / coverage_checklist 字段内容。
因此 Plan 阶段虽不在合同状态中体现，但所有合同字段必须来自 Plan 的分析而非 Coordinator 的猜测。

### 合同格式

```json
{
  "task_id": "FEAT-001",
  "timestamp": 1234567890,
  "trace_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "goal": "添加用户登录功能",
  "files_to_modify": ["src/login.tsx", "src/auth.ts"],
  "constraints": ["arch-layering", "contract-mechanism"],
  "tech_stack_constraints": ["typescript.md", "react.md"],
  "hooks": {
    "pre_task": ["pre-model-check"],
    "post_task": ["post-edit-verify"]
  },
  "verification": ["bun run typecheck", "bun run test"],
  "coverage_checklist": {
    "login_form": "assert: 登录表单可输入用户名密码并提交",
    "auth_api": "assert: 调用 /api/login 返回 token",
    "error_toast": "assert: 登录失败时显示错误提示"
  },
  "status": "pending"
}
```

## 规则

### R-01: 源码修改前必须先有合同

**Edit/Write 操作前必须通过 `coordinator-guard.sh` 门禁**（位于 `.opencode/hooks/`）：
- 无有效合同 → **拦截**
- 合同过期（>30分钟）→ **拦截**
- 文件不在 `files_to_modify` 中 → **拦截**

### R-02: 合同必须覆盖所有修改文件

`files_to_modify` 列出的文件是唯一允许修改的范围。

### R-03: 覆盖率闭环

`coverage_checklist` 中每个功能点必须：
- **assert:描述** — 已测试且有断言
- **SKIP:原因** — 不可测试，已标注原因
- 不允许空白或 TODO

### R-04: 任务完成后更新状态

将 `status` 从 `active` 改为 `completed` 或 `failed`。

### R-05: 合同命名规范

合同文件必须按照以下规范命名和组织：

1. **目录结构**: 按日期分文件夹，格式为 `.opencode/contracts/YYYYMMDD/`
2. **文件名格式**: `YYYYMMDD_TYPE_NNN.json`
   - `YYYYMMDD`: 创建合同的日期
    - `TYPE`: 任务类型缩写，基于子 Agent 职责：
      - `PLAN` — 分析计划（plan 子 Agent）
      - `FIX` — 代码修复/修改（task-executor 子 Agent）
      - `FEAT` — 需求开发（task-executor 子 Agent）
      - `BUILD` — 构建部署（builder 子 Agent）
      - `REVIEW` — 代码审查（code-reviewer 子 Agent）
      - `RETRO` — 复盘（retro 子 Agent）
      - `DOCTOR` — 崩溃诊断（crash-doctor 子 Agent）
   - `NNN`: 3 位数字编号，从 001 开始
3. **task_id**: 应与文件名中的 `TYPE_NNN` 部分对应，格式为 `TYPE-NNN`（如 `FIX-001`）
4. **示例**: `contracts/20260510/20260510_FIX_001.json` → `task_id: "FIX-001"`

**注意**: 旧格式的合同文件（直接放在 contracts/ 根目录）将在下次整理时迁移。

## 验证方法

```bash
# 检查是否有有效合同
ls -t .opencode/contracts/*.json | head -1 | xargs stat -c %Y
# 如果输出时间距今超过 30 分钟，合同已过期

# 检查覆盖率是否有 TODO
grep -c "TODO" .opencode/contracts/*.json
# 非零表示有未完成项
```

## 事故案例

> 事故：主 agent 跳过协调者直接修改源码，导致多个任务并行修改同一文件，产生冲突。
> 根因：无合同机制，无协调，无文件锁。
> 修复：Hook 拦截 + 协调者委派 + 合同文件锁。

## Hook 目录

Hook（钩子/护栏）是任务执行前/后的插桩检查点，遵循统一的 RESULT: PASS/BLOCK/WARN 协议。

### Pre_task 钩子（执行前）

| Hook 名称 | 类型 | 范围 | 检查内容 | 失败行为 |
|-----------|------|:----:|---------|---------|
| `pre-model-check` | 🛡️ 前馈/安全 | 特定 | Token 预算、上下文使用率、Prompt 注入检测 | BLOCK（安全违规）、WARN（Token 过高） |
| `resource-guard` | 🛡️ 前馈/治理 | 特定 | Token 上限(180K)、循环上限(200)、内存上限(2048MB) | BLOCK（超限熔断）、WARN（接近阈值） |
| `workspace-clean` | 🛡️ 前馈/治理 🔄 | 全局 | `git status --porcelain` 检查未提交源码变更 | WARN（有未提交变更） |
| `diff-size-guard` | 🛡️ 前馈/约束 🔄 | 全局 | 检查 files_to_modify 文件数（≤20）和估算变更行数（≤2000） | BLOCK（超限）、WARN（接近阈值） |
| `file-lock-check` | 🛡️ 前馈/安全 | 特定 | 扫描所有 active 合同的 files_to_modify 重叠 | BLOCK（文件被另一活跃合同锁定） |
| `coordinator-guard` | 🛡️ 前馈/安全 | 全局 | 编辑文件前检查是否在 active 合同范围内 | BLOCK（不在合同范围内） |
| `workflow-integrity-check` | 🛡️ 前馈/合同 | 特定 | 验证合同字段完整性（trace_id/constraints/verification/coverage_checklist 非空） | WARN（字段缺失） |

### Post_task 钩子（执行后）

| Hook 名称 | 类型 | 范围 | 检查内容 | 失败行为 |
|-----------|------|:----:|---------|---------|
| `post-edit-verify` | 🔍 反馈/代码 | 特定 | 语法检查、代码质量检测（TODO/console.log/any） | WARN（代码质量问题） |
| `post-tool-verify` | 🔍 反馈/工具 | 特定 | 工具调用输出格式验证、错误分类追踪 | WARN（工具调用异常） |
| `dual-check-hook` | 🔍 反馈/审查 | 特定 | Agent 自验 vs 工具独立校验比较 | WARN（不一致） |
| `self-improvement-trigger` | 🔄 反馈/自愈 | 全局 | 调用 incident-analyzer 触发事故驱动改进循环 | WARN（分析到问题） |
| `arch-constraint-check` | 🔍 反馈/架构 | 特定 | 对修改文件运行架构约束检查（分层违规、any 类型泄漏） | BLOCK（分层违规）、WARN（其他） |
| `secret-leak-scan` | 🔍 反馈/安全 | 特定 | 扫描修改文件中的硬编码密钥 | BLOCK（发现硬编码凭证） |
| `entropy-cleanup` | 🧹 治理/回收 🔄 | 全局 | 清理临时文件、过期追踪记录 | WARN（清理失败） |
| `validate-contract` | 🔍 反馈/合同 | 全局 | JSON Schema 校验 + 合同时效性(30min) + 文件存在性 | BLOCK（Schema 不通过）、WARN（过期） |

### Hook 执行顺序

Pre_task 按列表顺序依次执行，全部 PASS 后才委派 task-executor。
Post_task 在 task-executor 返回后按列表顺序执行，全部 PASS 后才进入 code-review 阶段。
任一 hook 返回 BLOCK 立即中断流程，合同状态→failed，委派 crash-doctor 诊断。

### 默认钩子
标有 🔄 的钩子是「默认钩子」，在**每次任务中自动执行**，不依赖合同显式声明。
默认钩子先执行，合同声明的钩子后执行。

### 钩子范围
- **全局**（Global）：不区分 Agent，所有执行者都会触发
- **特定**（Agent-Specific）：仅当当前 Agent 角色匹配时触发，由 `AGENT_ROLE` 环境变量控制

### 执行顺序（三层）
```
全局钩子 → Agent 特定钩子 → 合同钩子
```

## 工作流强制规则

### 完整阶段链
每个任务必须按顺序经历以下阶段，不可跳过：

| 阶段 | 执行者 | 产物 | 门禁 |
|------|--------|------|------|
| Plan | plan | 结构分析报告 | 必须包含 files_to_modify/constraints/verification |
| Contract | coordinator | 任务合同 JSON | validate-contract 工具 + workflow-integrity-check.sh |
| Execute | task-executor | 代码修改 + 交接报告 | coordinator-guard.sh（文件范围）+ file-lock-check.sh |
| Review | code-reviewer | 审查报告 | pass=false 时自动进入修复循环（≤3次） |
| Build | builder | 构建结果 | requires_build=true 时强制执行 |
| Retro | retro | 复盘报告 | 所有任务（成功或失败）必须执行 |
