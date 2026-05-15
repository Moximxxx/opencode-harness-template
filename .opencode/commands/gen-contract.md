---
description: 生成任务合同骨架（自动填入 timestamp 和 trace_id）
agent: general
subtask: true
---

请基于以下输入生成任务合同 JSON 骨架。

**自动生成字段**：
- **timestamp**：当前 Unix 时间戳 — !`powershell -Command "[DateTimeOffset]::Now.ToUnixTimeSeconds()"`
- **trace_id**：32 位 UUID — !`powershell -Command "[guid]::NewGuid().ToString()"`

**用户提供的字段**：$ARGUMENTS

请生成一个完整的合同 JSON，将自动生成的 timestamp 和 trace_id 填入，其余字段从参数中获取。
合同格式参考 `.opencode/contracts/contract-schema.json`。
