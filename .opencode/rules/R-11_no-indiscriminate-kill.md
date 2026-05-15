# R-11: 禁止无差别杀进程
> 分组: Agent | 严重: 强制

## 规则
后台进程清理必须按具体 PID 精确操作。禁止使用 `Stop-Process -Name "node"` 等无差别匹配进程名的操作。

## 来源
agent-system.md / R-11 (原编号)
