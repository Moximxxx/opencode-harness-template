---
name: test-writing
description: 单元测试编写规范，确保测试覆盖率和方法论。
---

# Test Writing Skill

## AAA 模式

```typescript
// Arrange
const input = { name: "test" };
// Act
const result = process(input);
// Assert
expect(result).toBeDefined();
```

## 命名规范

```
格式: test_{method}_{scenario}_{expected}

test_user_create_with_valid_email_succeeds
test_user_create_with_duplicate_email_raises_error
```

## 必须覆盖的场景

- Happy Path（正常流程）
- Edge Cases（边界条件）
- Error Cases（错误处理）
- Null/Empty（空值处理）

## 覆盖率要求

- 整体: 80%
- 新增代码: 90%
- 关键路径: 100%
