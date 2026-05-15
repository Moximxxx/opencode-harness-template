# Node.js 约束

> Node.js 开发规范和常见错误规避。

## 异步编程

### R-01: 禁止回调地狱，使用 async/await

```javascript
async function getUserData(userId) {
    const user = await getUser(userId);
    const orders = await getOrders(user.id);
    return { user, orders };
}
```

### R-02: 必须处理 Promise rejection

```javascript
async function fetchData() {
    try {
        const response = await fetch('/api/data');
        return response.json();
    } catch (error) {
        console.error('Fetch failed:', error);
        throw error;
    }
}
```

## 错误处理

### R-03: 错误必须包含上下文

```javascript
throw new Error(`Failed to process user ${userId}: ${originalError.message}`);
```

## 安全

### R-04: 禁止使用 eval

```javascript
// 正确：使用 JSON.parse（经过验证的输入）
const parsed = JSON.parse(userInput);
```

## 依赖管理

### R-05: 必须使用 lock 文件

```bash
# 确保 lock 文件被提交
git add package-lock.json
```

## 日志

### R-06: 使用结构化日志

```javascript
logger.info('User logged in', { userId, ip: req.ip });
```
