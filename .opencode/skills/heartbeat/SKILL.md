# 心跳监控 (Heartbeat)

> 心跳监控技能，用于检查后台服务是否存活并就绪。

## 适用场景

- 服务启动后等待就绪
- 定期检查服务健康状态
- 冒烟测试前确认服务可用

## 检查方式

### 按 PID 检查进程存活
```powershell
$pid = Get-Content ".opencode/tmp/<service>.pid" -Raw -ErrorAction SilentlyContinue
$running = Get-Process -Id $pid -ErrorAction SilentlyContinue
if (-not $running) { return "DEAD" }
```

### 按端口/URL 检查服务就绪
```powershell
try {
    $req = Invoke-WebRequest -Uri "http://localhost:<port>" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($req.StatusCode -eq 200) { return "READY" }
} catch { return "WAITING" }
```

## 返回状态

| 状态 | 含义 | 建议动作 |
|------|------|---------|
| `READY` | 服务已就绪 | 继续后续任务 |
| `WAITING` | 服务启动中 | 等待后重试 |
| `DEAD` | 进程已死或超时 | 收集日志，启动崩溃诊断 |
| `UNKNOWN` | PID 文件不存在 | 确认服务名和启动流程 |

## 使用示例

```markdown
心跳检查：使用 heartbeat skill 检查 http://localhost:5173 是否就绪
- PID 文件：.opencode/tmp/vite.pid
- 检查 URL：http://localhost:5173
- 超时：120 秒
- 轮询间隔：10 秒
```
