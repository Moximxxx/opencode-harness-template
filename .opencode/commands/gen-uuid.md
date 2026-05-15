---
description: 生成 32 位 UUID（用于 trace_id）
agent: general
subtask: true
---

生成一个 32 位 UUID（格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx）。

使用 PowerShell 生成：
!`powershell -Command "[guid]::NewGuid().ToString()"`
