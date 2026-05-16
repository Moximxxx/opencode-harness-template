---
description: 生成任务合同骨架（自动填入 timestamp 和 trace_id）
---

请基于以下自动生成的值和用户需求，生成一个完整的任务合同 JSON。

**自动生成的值**：
- trace_id（32 位）: !`node -e "console.log(require('crypto').randomUUID().replace(/-/g, ''))"`
- timestamp（Unix 秒）: !`node -e "console.log(Math.floor(Date.now() / 1000))"`

**用户需求**：$ARGUMENTS

**输出要求**：
- 生成符合 `.opencode/contracts/contract-schema.json` 格式的完整合同 JSON
- 将上述 trace_id 和 timestamp 填入对应字段
- 其余字段（task_id, goal, files_to_modify, constraints, verification, coverage_checklist）从用户需求中提取
- 只输出合同 JSON，不要额外说明文字或代码块标记
