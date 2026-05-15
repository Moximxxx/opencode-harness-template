# React 约束

> React 开发规范和常见错误规避。

## Hooks 规则

### R-01: 只在顶层调用 Hooks

```jsx
// 正确：始终在顶层调用
function MyComponent({ show }) {
    const [value, setValue] = useState(0);
    return show ? <div>{value}</div> : null;
}
```

### R-02: 自定义 Hook 必须以 use 开头

```jsx
function useUser(userId) {
    const [user, setUser] = useState(null);
    useEffect(() => {
        fetchUser(userId).then(setUser);
    }, [userId]);
    return user;
}
```

## 状态管理

### R-03: 状态更新使用函数式更新

```jsx
function Counter() {
    const [count, setCount] = useState(0);
    const handleClick = () => {
        setCount(prev => prev + 1);
    };
    return <button onClick={handleClick}>{count}</button>;
}
```

### R-04: 状态应该保持最小化

```jsx
// 正确：计算得出而非存储派生状态
function MyComponent({ items, filter }) {
    const filteredItems = items.filter(item => item.name.includes(filter));
    return <List items={filteredItems} />;
}
```

## 渲染性能

### R-05: 列表必须提供 key

```jsx
{items.map(item => (
    <Item key={item.id} {...item} />
))}
```

## 副作用

### R-06: useEffect 必须有正确的依赖

```jsx
useEffect(() => {
    fetchData(id);
}, [id]);
```

### R-07: 清理副作用

```jsx
useEffect(() => {
    const subscription = eventSource.subscribe(data => setData(data));
    return () => {
        subscription.unsubscribe();
    };
}, []);
```
