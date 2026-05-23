# R-12: 后台进程管理规范
> 分组: Agent | 严重: 强制

## 规则
启动常驻后台进程时，必须使用完全分离模式启动，立即返回 PID 并写入 `.opencode/tmp/{service}.pid` 文件。停止服务必须按 PID 精确操作，严禁无差别杀进程（遵循 R-11）。禁止在子 Agent 中直接执行启动后不返回的后台进程命令。

## 启动规范
- 使用 `Start-Process -WindowStyle Hidden -PassThru` 完全分离启动
- 立即将 PID 写入 `.opencode/tmp/{service}.pid`
- 返回 PID 供后续心跳检查

## 停止规范
- 读取 PID 文件，按 PID 精确终止进程
- 删除 PID 文件
- 禁止 `Get-Process -Name "node" | Stop-Process -Force` 等无差别操作

## 来源
agent-system.md / R-12（2026-05-23 重写：service-agent 降级为通用规则）
