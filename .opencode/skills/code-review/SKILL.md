---
name: code-review
description: 代码审查流程和检查点。
---

# Code Review Skill

## 审查维度

| 维度 | 关注点 |
|------|--------|
| 安全性 | 密钥泄露、输入验证 |
| 性能 | 重渲染、内存泄漏 |
| 可维护性 | 命名、函数长度、模块化 |
| 类型安全 | any 使用、类型断言 |
| 合同合规 | files_to_modify 范围 |

## 审查流程

1. 读取合同和 files_to_modify
2. 对比 git diff 确认变更范围
3. 对照 constraints 逐文件检查
4. 输出分级报告（严重/中等/轻微）
