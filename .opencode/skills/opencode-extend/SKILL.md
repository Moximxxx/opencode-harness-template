# OpenCode 扩展指南 — 命令、钩子与工具

> OpenCode 原生支持的三种扩展方式：自定义命令、插件钩子、自定义工具。
> 本指南基于 [OpenCode 官方文档](https://opencode.ai/docs) 整理。

## 扩展体系总览

| 扩展方式 | 目录 | 实现语言 | 用途 |
|---------|------|:---:|------|
| **Commands** | `.opencode/commands/` | Markdown / JSON | 封装重复性任务为用户命令 |
| **Plugins** | `.opencode/plugins/` | JS/TS | 生命周期钩子、事件监听、拦截器 |
| **Tools** | `.opencode/tools/` | JS/TS + 任意 | 给 LLM 新增可调用的工具函数 |

---

## 一、自定义命令 (Commands)

### 概述
命令是用户在 TUI 中通过 `/command-name` 调用的快捷操作，封装一个 Prompt 模板。

### 配置方式

**方式 A — Markdown 文件（推荐）**

文件放在 `.opencode/commands/<name>.md`，文件名即命令名。

```markdown
---
description: Run tests with coverage
agent: build
---
Run the full test suite with coverage report.
Focus on the failing tests and suggest fixes.
```

**方式 B — JSON 配置**

```jsonc
{
  "command": {
    "test": {
      "template": "Run the full test suite...",
      "description": "Run tests with coverage",
      "agent": "build"
    }
  }
}
```

### 模板语法

| 语法 | 作用 | 示例 |
|------|------|------|
| `$ARGUMENTS` | 全部参数 | `/deploy staging` → `staging` |
| `$1`, `$2`... | 位置参数 | `/create config.json src` |
| `` !`command` `` | 注入命令输出 | `` !`git log --oneline -10` `` |
| `@filename` | 引用文件内容 | `@src/components/Button.tsx` |

### 配置选项

| 选项 | 必填 | 说明 |
|------|:---:|------|
| `template` | ✅ | 发送给 LLM 的 prompt 模板 |
| `description` | ❌ | TUI 中显示的描述 |
| `agent` | ❌ | 指定执行此命令的 Agent |
| `subtask` | ❌ | 强制作为子任务执行（不污染主上下文） |
| `model` | ❌ | 覆盖默认模型 |

---

## 二、插件钩子 (Plugins)

### 概述
OpenCode 的插件系统是其**原生钩子机制**。插件可以拦截工具调用、监听会话事件、注入环境变量等。

### 加载方式

- **本地文件**：放入 `.opencode/plugins/` 或 `~/.config/opencode/plugins/`
- **npm 包**：在 `opencode.json` 中声明

```jsonc
{
  "plugin": [
    "opencode-helicone-session",
    "./my-local-plugin.ts"
  ]
}
```

### 基本结构

```ts
import type { Plugin } from "@opencode-ai/plugin"

export const MyPlugin: Plugin = async ({ project, client, $, directory, worktree }) => {
  return {
    // 在这里注册各种钩子
  }
}
```

插件函数接收的参数：
- `project` — 当前项目信息
- `directory` — 工作目录
- `worktree` — Git worktree 根目录
- `client` — OpenCode SDK 客户端
- `$` — Bun Shell API

### 可用事件钩子一览

#### 工具执行钩子
| 钩子 | 时机 | 用途 |
|------|------|------|
| `tool.execute.before` | 工具执行前 | 拦截/修改参数，拒绝危险操作 |
| `tool.execute.after` | 工具执行后 | 检查/记录工具结果 |

#### 消息/会话钩子
| 钩子 | 时机 |
|------|------|
| `chat.message` | 消息发送前修改 |
| `chat.params` | 修改 API 请求参数 |
| `session.created` | 会话创建时 |
| `session.compacted` | 上下文压缩时 |
| `session.error` | 会话出错时 |
| `session.idle` | 会话完成时 |

#### TUI/Shell 钩子
| 钩子 | 时机 |
|------|------|
| `shell.env` | 注入环境变量到所有 shell 执行 |
| `tui.prompt.append` | TUI prompt 追加内容 |
| `tui.toast.show` | 显示 toast 通知 |
| `command.execute.before` | 命令执行前 |

#### 文件/权限钩子
| 钩子 | 时机 |
|------|------|
| `file.edited` | 文件被编辑后 |
| `permission.ask` | 权限询问时 |

#### 实验性钩子
| 钩子 | 用途 |
|------|------|
| `experimental.session.compacting` | 自定义压缩上下文时的注入内容 |
| `experimental.chat.messages.transform` | 转换消息列表 |
| `experimental.chat.system.transform` | 转换系统 prompt |

### 实战示例

#### 拦截危险命令
```ts
// .opencode/plugins/safety-guard.ts
export const SafetyGuard = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        const cmd = output.args.command
        if (cmd.includes("rm -rf /") || cmd.includes("DROP DATABASE")) {
          throw new Error("🚫 危险操作被拦截")
        }
      }
    }
  }
}
```

#### 示例 5：合同门禁 + 文件锁（contract-enforcer）

完整实现见本项目 .opencode/plugins/contract-enforcer.ts。

核心思路：在 	ool.execute.before 拦截 edit/write 工具，读取 .opencode/contracts/ 目录下的 active 合同，检查文件是否在 iles_to_modify 范围内，同时检测文件锁冲突和合同过期（30 分钟）。

`	s
// 伪代码
"tool.execute.before": async (input, output) => {
  if (input.tool !== "edit" && input.tool !== "write") return
  const targetFile = extractTargetFile(input, output)
  const activeContracts = findActiveContracts(contractsDir)
  // 检查文件是否在任一 active 合同范围内
  // 检查是否有其他合同锁定了同一文件
  // 不符合 → throw Error 拦截
}
`

#### 示例 6：密钥扫描（secret-leak-scan）

完整实现见本项目 .opencode/plugins/secret-leak-scan.ts。

核心思路：在 	ool.execute.after 检查 write/edit 的内容，用正则扫描 10 种常见密钥模式（OpenAI/GitHub/AWS/JWT/Stripe/Slack 等），命中则脱敏显示并阻止写入。

#### 示例 7：危险命令分级拦截（dangerous-command-guard）

完整实现见本项目 .opencode/plugins/dangerous-command-guard.ts。

核心思路：区分两级防护：
- **BLOCK 级**（10 条）：系统级危险（rm -rf /、'@ + "$dropDb" + '@、mkfs 等），直接拒绝
- **WARN 级**（4 条）：项目级危险（rm -rf .、git reset --hard 等），仅日志记录不阻止

使用 client.app.log 记录 WARN 事件，便于事后审计。

---

#### 注入项目环境变量
```ts
// .opencode/plugins/project-env.ts
export const ProjectEnv = async ({ directory }) => {
  return {
    "shell.env": async (input, output) => {
      output.env.PROJECT_ROOT = input.cwd
      output.env.NODE_ENV = "development"
    }
  }
}
```

#### 自动桌面通知
```ts
// .opencode/plugins/notifier.ts
export const Notifier = async ({ $ }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        await $`osascript -e 'display notification "会话完成" with title "OpenCode"'`
      }
    }
  }
}
```

#### 上下文压缩增强
```ts
// .opencode/plugins/compaction.ts
export const Compaction = async (ctx) => {
  return {
    "experimental.session.compacting": async (input, output) => {
      output.context.push(`## 项目状态
- 当前任务: [描述]
- 已修改文件: [列表]
- 注意事项: [关键决策]`)
    }
  }
}
```

---

## 三、自定义工具 (Custom Tools)

### 概述
自定义工具让 LLM 调用你编写的函数。定义在 `.opencode/tools/` 目录，文件名即工具名。

### 基本结构

```ts
// .opencode/tools/database.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "查询项目数据库",
  args: {
    query: tool.schema.string().describe("SQL 查询语句"),
  },
  async execute(args, context) {
    // context.directory — 工作目录
    // context.worktree — Git worktree 根
    return `执行结果: ${args.query}`
  },
})
```

### 调用外部脚本

```ts
// .opencode/tools/python-tool.ts
export default tool({
  description: "使用 Python 执行计算",
  args: {
    a: tool.schema.number(),
    b: tool.schema.number(),
  },
  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/tools/calc.py")
    return (await Bun.$`python3 ${script} ${args.a} ${args.b}`.text()).trim()
  },
})
```

### 与内置工具的关系

自定义工具与内置工具共存。**同名时自定义工具覆盖内置工具**。如需禁用内置工具但不想覆盖，使用 `permission` 配置。

---

## 四、配置文件位置汇总

| 用途 | 位置 |
|------|------|
| 项目配置 | `./opencode.json` / `.opencode/opencode.json` |
| 全局配置 | `~/.config/opencode/opencode.json` |
| 项目 Agent | `.opencode/agents/<name>.md` |
| 项目命令 | `.opencode/commands/<name>.md` |
| 项目插件 | `.opencode/plugins/<name>.ts` |
| 项目工具 | `.opencode/tools/<name>.ts` |
| 项目技能 | `.opencode/skills/<name>/SKILL.md` |

**配置优先级**（从低到高）：
1. 远程配置 (`.well-known/opencode`)
2. 全局配置 (`~/.config/opencode/opencode.json`)
3. 自定义路径 (`OPENCODE_CONFIG` 环境变量)
4. 项目配置 (`opencode.json`)
5. `.opencode/` 目录（agents/commands/plugins 等）
6. 托管配置（系统级，用户不可覆盖）

---

## 五、与本项目的关系

本项目有自己的 `.opencode/hooks/` 目录，包含 shell 脚本形式的合同级护栏。这些是**项目自定义的工作流护栏**，通过 AGENTS.md 规则约束实现，属于上层应用逻辑。

OpenCode 的 **Plugins** 是框架级的原生钩子系统，粒度更细、覆盖面更广。

两者可共存互补：
- **OpenCode Plugins** → 框架层安全/环境/监控
- **`.opencode/hooks/`** → 工作流层合同验证/文件锁

---

## 六、快速检查清单

- [ ] 确认 `opencode.json` 声明了 `"$schema"` 以获得编辑器自动补全
- [ ] 需要封装重复任务 → 创建 `.opencode/commands/` 下的 Markdown 文件
- [ ] 需要拦截危险操作 → 创建 `.opencode/plugins/` 插件
- [ ] 需要给 LLM 增加自定义能力 → 创建 `.opencode/tools/` 工具
- [ ] **修改配置后必须重启 OpenCode** 才能生效
