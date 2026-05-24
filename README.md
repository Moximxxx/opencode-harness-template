# 🚀 opencode-harness-template

> **OpenCode 多 Agent 协同开发工作流模板** — 为基于 OpenCode AI 编程助手的项目提供开箱即用的多 Agent 协作基础设施。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 项目概览

本项目是一个 **Harness 模板**，定义了 OpenCode 环境下多 Agent 协同开发的标准化工作流。它不包含具体业务代码，而是提供了一套完整的**角色体系、合同机制、护栏钩子、架构约束和自动化流程**，帮助开发团队在 AI 辅助编程中保持代码质量和一致性。

---

## 🎯 核心设计理念

### 1. 🧑‍🤝‍🧑 多 Agent 角色分离

共 **7 个 Agent** 各司其职，职责明确，相互协作：

| Agent | 类型 | 职责 |
|-------|------|------|
| **Coordinator** | 主代理 | 任务入口与出口：决策、合同、委派、验证 |
| **Analyzer** | 子代理 | 纯分析不决策：方案对比、依赖追踪、影响评估、架构审计 |
| **Task-Executor** | 子代理 | 代码编写（合同范围内） |
| **Builder** | 子代理 | 构建、部署 |
| **Code-Reviewer** | 子代理 | 代码质量审查 |
| **Retro** | 子代理 | 复盘、约束更新、事故记录 |
| **Tester** | 子代理 | 统一测试：单元测试、E2E测试、UI冒烟测试 |

### 2. 📜 合同机制（Contract）

所有代码修改**必须先创建任务合同**。合同是一份 JSON 文件，定义了修改范围、约束规则、验证标准和功能覆盖清单。未经合同授权的修改将被 Hook 门禁系统拦截。

- 合同文件存放于 `.opencode/contracts/` 目录
- 遵循 JSON Schema 校验（`contract-schema.json`）
- 有效期 30 分钟，过期需重新创建

### 3. 🛡️ Hook 护栏系统

任务执行前/后的插桩检查点，分为三层：

| 层级 | 执行顺序 | 示例 |
|------|:--------:|------|
| 🌐 全局钩子 | 最先执行 | `workspace-clean`、`diff-size-guard` |
| 🤖 Agent 特定钩子 | 中间执行 | `resource-guard`、`file-lock-check` |
| 📄 合同钩子 | 最后执行 | `pre-model-check`、`post-edit-verify` |

每个 Hook 返回 `PASS` / `BLOCK` / `WARN` 结果，任一 `BLOCK` 将中断流程并触发诊断。

### 4. 🏗️ 三层架构约束

强制单向依赖规则，禁止反向和平层交叉依赖：

```
Layer 3: 前端/UI层 → Layer 2: 业务逻辑层 → Layer 1: 运行时层
```

- ❌ 不允许 Layer 1 调用 Layer 2
- ❌ 不允许 Layer 2 直接调用 Layer 3
- ❌ 不允许 Layer 3 跨层直接调用 Layer 1

### 5. 🔗 全链路 Trace ID

从任务开始即生成全局唯一的 UUID，贯穿全生命周期：

```
Analyzer → 合同 → Task-Executor → Code-Reviewer → Builder → Retro
```

所有子 Agent 的交接报告、审查报告、诊断报告、复盘报告均携带同一 Trace ID，确保全链路可追溯。

### 6. 🔄 自动修复循环

代码审查发现问题后自动触发修复流程：

- Code-Reviewer 发现问题 → Analyzer 分析修复策略
- 生成 `fix_contract` → Task-Executor 执行修复
- 最多重试 **3 次**
- 超过 3 次则升级为失败，加载 crash-doctor skill 诊断，委派 Retro 记录

---

## 🔧 完整工作流

```
用户任务
    │
    ▼
┌──────────────┐
│  Analyzer 分析 │  只读分析任务范围、约束、风险（多方案对比）
└──────┬───────┘
       ▼
┌──────────────┐
│  生成合同     │  定义 files_to_modify / constraints / verification
└──────┬───────┘
       ▼
┌──────────────┐
│  验证合同     │  JSON Schema 校验 + 时效性检查
└──────┬───────┘
       ▼
┌──────────────┐
│  前置 Hook    │  全局 → Agent 特定 → 合同钩子（三层）
└──────┬───────┘
       ▼
┌──────────────┐
│  执行代码     │  Task-Executor 按合同修改指定文件
└──────┬───────┘
       ▼
┌──────────────┐
│  后置 Hook    │  安全扫描、架构检查、熵清理
└──────┬───────┘
       ▼
┌──────────────┐
│  代码审查     │  Code-Reviewer 逐文件审查
└──────┬───────┘
       ▼
  ┌─────┴─────┐
  │ 通过       │  不通过（≤3次自动修复循环）
  └─────┬─────┘
        ▼
┌──────────────┐
│  构建验证     │  Builder 构建（条件触发）
└──────┬───────┘
       ▼
┌──────────────┐
│  复盘 Retro   │  约束更新、事故记录（必须执行）
└──────┬───────┘
       ▼
┌──────────────┐
│  Git 提交     │  复盘确认通过后执行
└──────────────┘
```

---

## 📁 项目目录结构

```
opencode-harness-template/
├── opencode.jsonc              # OpenCode 主配置
├── AGENTS.md                   # 工作流规范入口
├── LICENSE                     # MIT 许可证
├── README.md                   # 本文件
├── .gitignore                  # Git 忽略规则
└── .opencode/
    ├── agents/                 # Agent 提示词文件（7 个）
    ├── constraints/            # 约束规则文档
    │   ├── arch-layering.md    # 三层架构依赖规则
    │   ├── contract-mechanism.md # 合同机制与生命周期
    │   └── tech-stack/         # 技术栈约束模板
    ├── contracts/              # 任务合同（运行时文件）
    │   └── contract-schema.json # 合同 JSON Schema 模板
    ├── hooks/                  # Hook 护栏脚本
    ├── skills/                 # 技能文档（15 个）
    ├── scripts/                # 工具脚本
    ├── tools/                  # 验证工具
    └── rules/                  # 规则文件
```

---

## 🚀 快速开始

1. **安装 [OpenCode](https://opencode.ai/)**（如果尚未安装）
2. 将本项目中的 `opencode.jsonc` 放入你的项目根目录
3. 按需调整 `.opencode/constraints/` 中的约束规则
4. 所有任务自动通过 **Coordinator** 委派，无需手动调用子 Agent

> ⚠️ 本项目为通用工作流模板，具体技术栈（前端、后端、构建工具等）待项目初始化后填充。

---

## 📖 约束规则索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 架构分层约束 | `.opencode/constraints/arch-layering.md` | 三层架构单向依赖规则 |
| 合同机制约束 | `.opencode/constraints/contract-mechanism.md` | 合同生命周期、格式、Hook 目录 |

---

## 📄 许可证

本项目采用 **MIT License** 开源。

```
MIT License

Copyright (c) 2026 Qin JiaoYang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

完整内容请参见 [LICENSE](LICENSE) 文件。

---

## 🏷️ 相关资源

- [OpenCode 官方文档](https://opencode.ai/docs) — 了解更多关于 OpenCode 的配置和使用
- [AGENTS.md](AGENTS.md) — 工作流规范详细定义
- `.opencode/agents/` — 各 Agent 提示词定义
- `.opencode/skills/` — 技能文档集合
