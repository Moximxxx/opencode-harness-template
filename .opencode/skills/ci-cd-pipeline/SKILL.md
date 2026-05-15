---
name: ci-cd-pipeline
description: CI/CD 流水线规范，四阶段流水线。
---

# CI/CD Pipeline Skill

## 四阶段流水线

```
Phase 1: typecheck → TypeScript 类型检查
Phase 2: lint → ESLint 代码检查
Phase 3: test → Vitest 测试套件
Phase 4: build → Vite 构建打包
```

## 失败行为

| 阶段 | 失败行为 |
|:----|:--------:|
| typecheck | BLOCK |
| lint | WARN |
| test | BLOCK |
| build | BLOCK |

## 命令

```bash
bun run verify   # typecheck + lint + test
bun run build    # 完整构建
```
