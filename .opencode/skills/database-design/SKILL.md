---
name: database-design
description: 数据库设计规范，包括表结构、索引和查询优化。
---

# Database Design Skill

## 设计原则

- 使用规范化设计（3NF）
- 主键使用 UUID 或自增 ID
- 外键约束保证数据完整性
- 索引覆盖高频查询字段

## 命名规范

- 表名: 复数、小写、下划线分隔（users, user_roles）
- 字段名: 小写、下划线分隔（created_at, updated_at）
- 外键: `{table}_id`
