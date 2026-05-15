# Agent 体系约束

> 多角色分离：协调者(Coordinator)、构建者(Builder)、服务者(Service-Agent)、心跳者(Heartbeat)、诊断者(Crash-Doctor)、冒烟测试者(Smoke-Tester)、复盘者(Retro)。

## 角色定义

| 角色 | 职责 | 写代码 | 触发条件 |
|------|------|--------|---------|
| Coordinator | 任务拆分、委派、验证 | 否 | **所有任务开始前必须调用** |
| Builder | 构建、部署 | 否 | 修改源码后需要构建 |
| Service-Agent | 启动/停止常驻后台服务 | 否 | 需要后台服务时 |
| Heartbeat | 检查服务 PID 和端口是否就绪 | 否 | 后台服务启动后 |
| Crash-Doctor | 崩溃分析、根因定位 | 否 | 进程崩溃/异常 |
| Retro | 复盘、约束更新、事故记录 | 否 | 任务完成/验证失败 |
| Smoke-Tester | E2E 冒烟测试（服务需提前就绪） | 否 | 服务就绪后执行测试 |

## 完整工作流链约束

### 强制交接物

每个阶段必须有明确的交接物传递给下一阶段：

| 阶段 | → 下一阶段 | 交接物 |
|------|:--------:|------|
| Coordinator 接收任务 | → Plan | 用户任务原始描述 + trace_id |
| Plan 分析 | → Coordinator | 结构报告（files_to_modify/constraints/verification/coverage_checklist/suggested_skills/risks） |
| Coordinator 生成合同 | → Task-Executor | 任务合同 JSON（validate-contract 通过） + 加载的 skills |
| Task-Executor 执行 | → Code-Reviewer | 交接报告（已修改文件列表 + 自验结果） |
| Code-Reviewer | → Coordinator | 审查报告（pass/issues 分级） |
| Coordinator | → Retro | 全链路数据（合同+plan+执行+审查+构建结果） |

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

### 后台服务必须由 Service-Agent 管理

启动 Vite、Electron 等常驻后台进程时，**必须通过 service-agent**。
service-agent 使用 `Start-Process -WindowStyle Hidden` 完全分离模式启动，立即返回 PID。

**禁止**：任何子 Agent 直接执行后台进程启动命令而不通过 service-agent。

### 后台服务启动后必须做心跳验证

service-agent 返回 PID 后，Coordinator 必须**委派 heartbeat** 轮询检查服务就绪。
heartbeat 返回 `READY` 后才能委派后续任务。超时未就绪 → 委派 crash-doctor。

### 构建/部署必须调用 Builder

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
