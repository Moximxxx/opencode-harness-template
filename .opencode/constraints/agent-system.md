# Agent 体系约束

> 多角色分离：协调者(Coordinator)、构建者(Builder)、服务者(Service-Agent)、心跳者(Heartbeat)、诊断者(Crash-Doctor)、冒烟测试者(Smoke-Tester)、复盘者(Retro)。

## 角色定义

| 角色 | 职责 | 写代码 | 触发条件 |
|------|------|--------|---------|
| Coordinator | 任务拆分、委派、验证 | 否 | **所有任务开始前必须调用** |
| Builder | 构建、部署（构建前需检查工作区洁净，R-10） | 否 | 修改源码后需要构建 |
| Service-Agent | 启动/停止常驻后台服务 | 否 | 需要后台服务时 |
| Heartbeat | 检查服务 PID 和端口是否就绪 | 否 | 后台服务启动后 |
| Crash-Doctor | 崩溃分析、根因定位 | 否 | 进程崩溃/异常 |
| Retro | 复盘、约束更新、事故记录 | 否 | 任务完成/验证失败 |
| Smoke-Tester | E2E 冒烟测试（服务需提前就绪） | 否 | 服务就绪后执行测试 |

## 完整工作流链约束

### 强制交接物

每个阶段必须有明确的交接物传递给下一阶段：

| 阶段 | → 下一阶段 | 合同类型 | 交接物 |
|------|:--------:|:---:|------|
| Coordinator 接收任务 | → Plan | PLAN | 用户任务原始描述 + trace_id |
| Plan 分析 | → Coordinator | (PLAN 合同输出) | 结构报告（files_to_modify/constraints/verification/coverage_checklist/suggested_skills/risks） |
| Coordinator 生成合同 | → 执行者 | FIX/FEAT/DOCS/BUILD | 任务合同 JSON（validate-contract 通过） + 加载的 skills |
| 执行者执行 | → Code-Reviewer | REVIEW | 交接报告（已修改文件列表 + 自验结果） |
| Code-Reviewer | → Coordinator | (REVIEW 合同输出) | 审查报告（pass/issues 分级） |
| Coordinator | → Retro | RETRO | 全链路数据（合同+plan+执行+审查+构建结果） |

### 禁止行为
- ❌ Coordinator 在没有 Plan 输出的情况下自行填写合同字段
- ❌ 跳过 validate-contract 直接委派 task-executor
- ❌ 跳过 code-reviewer 直接进入构建/复盘
- ❌ 跳过 retro 直接 Git 提交

## 强制调用规则

### 所有任务必须先调用 Coordinator

无论任务大小，在执行任何代码修改、构建、调试、测试之前，**必须先调用 Coordinator**。

```
用户任务 → Coordinator 分析 → 生成合同 → 委派执行
```

**禁止**：主 agent 跳过 Coordinator 直接执行。

### R-7: 禁止跳过 Coordinator

一切任务（含代码修改、构建、诊断、复盘、查询分析）必须通过 Coordinator 生成合同并委派给子 Agent 执行。禁止主 agent 绕过 Coordinator 直接执行 Edit / Write / Bash / Task。

### R-9: 网络搜索时间戳

网络搜索前必须先执行 `date` 获取当前时间，将时间加入搜索关键词。

### R-11: 禁止无差别杀进程

后台进程清理必须按具体 PID 精确操作，禁止使用 `Stop-Process -Name "node"` 等无差别匹配进程名的操作。

### 后台服务必须由 Service-Agent 管理（R-12）

启动 Vite、Electron 等常驻后台进程时，**必须通过 service-agent**。
service-agent 使用 `Start-Process -WindowStyle Hidden` 完全分离模式启动，立即返回 PID。

**禁止**：任何子 Agent 直接执行后台进程启动命令而不通过 service-agent。

### 后台服务启动后必须做心跳验证（R-13）

service-agent 返回 PID 后，Coordinator 必须**委派 heartbeat** 轮询检查服务就绪。
heartbeat 返回 `READY` 后才能委派后续任务。超时未就绪 → 委派 crash-doctor。

### R-10: Builder 构建前工作区洁净检查

Builder 在执行构建前必须检查工作区是否洁净：`git status --porcelain` 应无未提交的源码变更。
修改源码后需要构建/部署时，**必须调用 Builder**。

### 崩溃/异常必须调用 Crash-Doctor

出现进程崩溃、异常退出时，**必须调用 Crash-Doctor**。

### 任务完成必须调用 Retro

任何任务完成后（成功或失败），**必须调用 Retro** 进行复盘。

## 交接报告

每个子任务完成后，执行者必须向 Coordinator 输出交接报告：

```markdown
### 交接报告
- 完成状态：[成功/失败/部分]
- 已修改文件：[列表]
- 验证结果：[PASS/FAIL + 脚本输出]
- 遗留问题：[如有]
```

## 配置一致性

### P-01: 模型列表一致性（项目初始化后适用）

AI 模型列表需在各配置文件之间保持一致。项目初始化时应在相关源文件中统一模型定义。
→ 项目初始化后再确定具体文件范围

## 治理评估

### P-03: Harness Engineering 六支柱覆盖率评估

每次任务复盘必须对照 Harness Engineering 六支柱（上下文架构、架构约束、自验证循环、前馈控制、反馈控制、熵治理）评估当前覆盖率。任一支柱无对应钩子/脚本覆盖时，应在复盘报告中标注为缺口并列入后续任务规划。

## 工作区隔离

| Agent | 可修改文件 | 禁止操作 |
|-------|----------|---------|
| Coordinator | 无（只读+委派） | 不写代码 |
| Builder | 无（只执行脚本） | 不写代码 |
| Crash-Doctor | 无（只读日志） | 不写代码 |
| task-executor | 合同指定的文件 | 不碰其他文件 |

## 验证方法

```bash
# 检查是否所有源码修改都有合同
for f in $(git diff --name-only | grep -E '\.(ts|tsx)$'); do
    # 验证是否有对应合同
done
```
