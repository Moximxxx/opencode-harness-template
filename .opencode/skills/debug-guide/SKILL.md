---
name: debug-guide
description: 调试方法论和常见问题排查。
---

# Debug Guide Skill

## 调试步骤

1. 复现问题
2. 缩小范围
3. 检查日志
4. 分析调用栈
5. 验证修复

## 常用命令

```bash
# 查看日志
tail -f app.log

# 检查类型
bun run typecheck

# 运行单个测试
bun run test -- --testPathPattern=name

# 检查 git 变更
git diff
git log --oneline -10
```
