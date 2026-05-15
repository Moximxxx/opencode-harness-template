# R-12: 后台服务必须通过 Service-Agent 管理
> 分组: Agent | 严重: 强制

## 规则
启动 Vite、Electron 等常驻后台进程时，必须通过 service-agent。service-agent 使用 `Start-Process -WindowStyle Hidden` 完全分离模式启动，立即返回 PID。禁止任何子 Agent 直接执行后台进程启动命令。

## 来源
agent-system.md / R-12 (原编号)
