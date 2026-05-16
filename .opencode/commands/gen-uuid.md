---
description: 生成 32 位 UUID（用于 trace_id）
---

输出以下 UUID（仅输出 32 位十六进制字符串，不要换行、不要额外文字）：

!`node -e "console.log(require('crypto').randomUUID().replace(/-/g, ''))"`
