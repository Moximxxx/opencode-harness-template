# 崩溃诊断 (Crash Doctor)

> 崩溃诊断技能，用于分析运行时崩溃日志、定位根因、提供修复建议。

## 适用场景

| 场景 | 日志关键词 |
|------|-----------|
| App 启动后立即崩溃 | SIGSEGV / SIGABRT / CppCrash |
| 操作中突然退出 | exitCode / Crashed |
| 设备日志大量错误 | thread_list_lock / deadlock |
| 编译后冒烟失败 | Command crashed |
| 构建失败诊断 | build error / compilation failed |
| Hook 阻断诊断 | BLOCK / ERROR |

## 诊断流程

1. **收集日志**：拉取完整日志，grep 崩溃关键词
2. **分析崩溃类型**：SIGSEGV / SIGABRT / CppCrash / ANR / Build Error
3. **定位根因**：从调用栈找到崩溃函数，追踪调用链
4. **输出诊断报告**：根因 + 修复建议

## 诊断报告模板

```markdown
### 崩溃诊断报告
- **Trace ID**: [trace_id]
- **崩溃类型**: [SIGSEGV / SIGABRT / 构建失败 / 其他]
- **崩溃位置**: [文件:行号 / 函数名]
- **根因分析**: [分析]
- **修复建议**: [方案]
- **预防措施**: [建议]
```

## 约束

- 必须有日志证据支撑，不可猜测
- 诊断结论应引用具体的约束编号或规则
- 不直接修改代码，分析结论交给调用方决策
