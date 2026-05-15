---
name: git-commit
description: 规范化 Git 提交信息，使用 Conventional Commits 标准。
---

# Git Commit Skill

## 格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `build` | 构建系统 |
| `ci` | CI 配置 |
| `chore` | 其他变更 |

## 正确示例

```
feat(users): add password reset functionality
fix(auth): resolve token refresh race condition
refactor: move auth to separate service
```

## 验证命令

```bash
npx commitlint --from HEAD~1
```
