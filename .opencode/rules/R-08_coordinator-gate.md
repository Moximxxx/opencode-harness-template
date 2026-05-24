# R-08: 禁止跳过 Coordinator
> 分组: Agent | 严重: 强制

## 规则
一切任务（含代码修改、构建、诊断、复盘、查询分析）必须通过 Coordinator 生成合同并委派给子 Agent 执行。禁止主 agent 绕过 Coordinator 直接执行 Edit / Write / Bash / Task。

AGENTS.md / R-08
AGENTS.md / R-08
