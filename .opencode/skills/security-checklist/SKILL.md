---
name: security-checklist
description: 安全检查清单，包括依赖审计、密钥管理和常见漏洞防护。
---

# Security Checklist Skill

## 核心规则

- 禁止硬编码密钥（使用环境变量）
- 禁止在日志中记录敏感信息
- 所有外部输入必须验证
- 使用参数化查询防止注入

## 检查清单

- [ ] 密钥存储在环境变量中
- [ ] 密码使用 bcrypt/argon2 哈希
- [ ] 输入验证和净化
- [ ] HTTPS 强制启用
- [ ] 依赖安全审计已运行

## 验证命令

```bash
npm audit
grep -r "password\|secret\|api_key" src/ --include="*.ts" --include="*.tsx"
```
