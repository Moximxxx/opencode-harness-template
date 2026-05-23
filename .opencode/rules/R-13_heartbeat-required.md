# R-13: 服务就绪检查规范
> 分组: Agent | 严重: 强制

## 规则
后台服务启动后，必须使用 heartbeat skill 轮询检查服务就绪状态。服务返回 `READY` 后才能委派依赖该服务的后续任务。超时未就绪应收集日志并进行诊断。

## 检查流程
1. 服务启动后记录 PID
2. 使用 heartbeat skill 定期检查（建议间隔 10 秒，超时 120 秒）
3. `READY` → 继续后续任务
4. `WAITING` → 等待后重试
5. `DEAD` / 超时 → 收集日志，加载 crash-doctor skill 诊断

## 来源
agent-system.md / R-13（2026-05-23 重写：heartbeat Agent 降级为 skill）
