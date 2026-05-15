---
name: architecture-review
description: 架构评审，确保代码符合架构分层约束。
---

# Architecture Review Skill

## 架构检查点

1. 三层依赖方向: Layer 3 → Layer 2 → Layer 1
2. 跨层通信通过接口（IPC、回调）
3. 无循环依赖
4. 模块职责单一

## 检查命令

```bash
# 检查 renderer 是否直接引用 electron
grep -rn "require('electron')" src/renderer/
# 检查 renderer 是否直接调用 Node.js API
grep -rn "fs\.\|process\.\|path\." src/renderer/
```
