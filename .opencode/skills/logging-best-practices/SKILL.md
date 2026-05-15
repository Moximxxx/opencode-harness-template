---
name: logging-best-practices
description: 日志记录规范，包括日志级别、格式和敏感信息处理。
---

# Logging Best Practices Skill

## 日志级别

| 级别 | 用途 |
|------|------|
| DEBUG | 开发调试 |
| INFO | 正常操作 |
| WARN | 可能有问题 |
| ERROR | 需要关注 |
| CRITICAL | 系统不可用 |

## 规则

- 不在生产环境使用 DEBUG
- 不记录敏感信息（密码、token）
- 使用结构化日志
- 日志包含请求 ID 用于追踪

## 示例

```typescript
logger.info('User login', { userId, ip: req.ip });
```
