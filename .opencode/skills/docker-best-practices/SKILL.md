---
name: docker-best-practices
description: Docker 最佳实践，包括 Dockerfile 规范和多阶段构建。
---

# Docker Best Practices Skill

## Dockerfile 规范

- 使用官方基础镜像（如 node:18-alpine）
- 使用特定版本标签（非 latest）
- 多阶段构建减小镜像体积
- 非 root 用户运行应用
- 添加 HEALTHCHECK

## 多阶段构建示例

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
USER node
CMD ["node", "dist/index.js"]
```
