# TypeScript 约束

> TypeScript 开发规范和常见错误规避。

## 类型安全

### R-01: 必须启用 strict 模式

**原因**：strict 模式启用所有严格类型检查，避免常见错误。

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### R-02: 禁止使用 any

**原因**：any 会绕过所有类型检查，失去 TypeScript 的意义。

```typescript
// 正确：使用 unknown 或具体类型
function process(data: unknown): Record<string, unknown> {
    if (typeof data === 'object' && data !== null) {
        return data as Record<string, unknown>;
    }
    throw new Error('Invalid data');
}
```

## 接口与类型

### R-03: 优先使用接口，类型别名用于联合/交叉类型

```typescript
// 优先接口：描述对象结构
interface User {
    id: string;
    name: string;
    email: string;
}

// 类型别名：描述联合或交叉类型
type Status = 'pending' | 'approved' | 'rejected';
```

## 函数

### R-04: 函数返回值类型必须显式声明

```typescript
function add(a: number, b: number): number {
    return a + b;
}
```

## 异步

### R-05: 必须使用 async/await，禁止裸 Promise

```typescript
async function fetchUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
}
```

## 最佳实践

### R-06: 使用 satisfies 验证类型

```typescript
const config = {
    port: 3000,
    host: 'localhost'
} satisfies Config;
```
