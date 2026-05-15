---
name: api-design
description: API 设计规范，包括 RESTful 接口、错误处理和版本管理。
---

# API Design Skill

## RESTful 规范

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | /users | 列表 |
| GET | /users/:id | 详情 |
| POST | /users | 创建 |
| PUT | /users/:id | 更新 |
| DELETE | /users/:id | 删除 |

## 错误响应格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": []
  }
}
```

## 版本管理

- URL 版本: `/api/v1/users`
- Header 版本: `Accept: application/vnd.api.v1+json`
