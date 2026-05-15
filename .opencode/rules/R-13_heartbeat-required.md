# R-13: 后台服务必须有心跳验证
> 分组: Agent | 严重: 强制

## 规则
service-agent 返回 PID 后，Coordinator 必须委派 heartbeat 轮询检查服务就绪。heartbeat 返回 `READY` 后才能委派后续任务。超时未就绪 → 委派 crash-doctor。

## 来源
agent-system.md / R-13 (原编号)
