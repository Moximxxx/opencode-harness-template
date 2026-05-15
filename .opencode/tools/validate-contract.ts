import { tool } from "@opencode-ai/plugin"
import * as fs from "fs"
import * as path from "path"
import Ajv from "ajv"

// ================================================================
// 通用合同验证工具
// ================================================================
// 读取 contracts/contract-schema.json 作为校验规范，对所有合同文件
// 执行 JSON Schema 验证 + 时效性检查 + 文件存在性检查。
// 如需修改校验规则，只需编辑 contract-schema.json，无需改动本工具。
// ================================================================

interface CustomError {
  path: string
  message: string
}

/** 校验合同时效性（30 分钟过期） */
function checkFreshness(timestamp: number): CustomError | null {
  const ageSeconds = Math.floor(Date.now() / 1000) - timestamp
  if (ageSeconds > 1800) {
    return {
      path: "/timestamp",
      message: `合同已过期（${Math.floor(ageSeconds / 60)} 分钟前，超过 30 分钟上限）`,
    }
  }
  return null
}

/** 校验 files_to_modify 中的文件在磁盘上存在 */
function checkFilesExist(
  files: string[],
  contractDir: string
): CustomError[] {
  const errors: CustomError[] = []
  const projectRoot = path.resolve(contractDir, "..", "..")
  for (const f of files) {
    const absPath = path.resolve(projectRoot, f)
    if (!fs.existsSync(absPath)) {
      errors.push({ path: `/files_to_modify/${f}`, message: `文件不存在: ${f}` })
    }
  }
  return errors
}

export default tool({
  description:
    "通用合同验证工具。读取 contract-schema.json 作为校验规范，对指定合同执行 JSON Schema 验证 + 时效性检查 + 文件存在性检查。Coordinator 委派子 Agent 前必须调用。",
  args: {
    contract_path: tool.schema
      .string()
      .optional()
      .describe("合同文件路径。不指定则自动读取 contracts/ 目录下最新的 .json 文件"),
  },
  async execute(args, context) {
    const contractsDir = path.join(context.worktree, ".opencode", "contracts")
    const schemaPath = path.join(contractsDir, "contract-schema.json")

    // --- 加载 Schema ---
    if (!fs.existsSync(schemaPath)) {
      return `❌ Schema 文件不存在: ${schemaPath}`
    }
    let schema: object
    try {
      schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"))
    } catch (e) {
      return `❌ Schema 文件无法解析: ${schemaPath}\n${String(e)}`
    }

    // --- 确定合同文件 ---
    let contractPath: string
    if (args.contract_path) {
      contractPath = path.resolve(context.worktree, args.contract_path)
    } else {
      const files = fs
        .readdirSync(contractsDir)
        .filter((f) => f.endsWith(".json") && f !== "contract-schema.json" && !f.endsWith(".jsonc"))
        .map((f) => ({
          name: f,
          mtime: fs.statSync(path.join(contractsDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime)

      if (files.length === 0) {
        return "❌ 未找到任何合同文件（.opencode/contracts/ 目录下无 .json 合同）"
      }
      contractPath = path.join(contractsDir, files[0].name)
    }

    if (!fs.existsSync(contractPath)) {
      return `❌ 合同文件不存在: ${contractPath}`
    }

    // --- 解析 JSON ---
    let contract: unknown
    try {
      contract = JSON.parse(fs.readFileSync(contractPath, "utf-8"))
    } catch (e) {
      return `❌ 合同文件无法解析为 JSON: ${contractPath}\n${String(e)}`
    }

    // --- JSON Schema 校验 ---
    const ajv = new Ajv({ allErrors: true })
    const validate = ajv.compile(schema)
    const schemaValid = validate(contract)

    const allErrors: CustomError[] = []

    if (!schemaValid) {
      for (const err of validate.errors || []) {
        const p = err.instancePath || `/${err.params.missingProperty || ""}`
        allErrors.push({ path: p, message: err.message || "未知错误" })
      }
    }

    // --- 自定义校验（Schema 无法覆盖的运行时规则）---
    const obj = contract as Record<string, unknown>

    if (typeof obj.timestamp === "number") {
      const freshErr = checkFreshness(obj.timestamp)
      if (freshErr) allErrors.push(freshErr)
    }

    if (Array.isArray(obj.files_to_modify)) {
      allErrors.push(...checkFilesExist(obj.files_to_modify as string[], path.dirname(contractPath)))
    }

    // --- 输出 ---
    const contractId = typeof obj.task_id === "string" ? obj.task_id : null

    if (allErrors.length === 0) {
      return `✅ 合同验证通过: ${contractId} (文件: ${path.basename(contractPath)})`
    }

    return [
      `❌ 合同校验失败: ${contractId || "(无 task_id)"} (文件: ${path.basename(contractPath)})`,
      "",
      ...allErrors.map((e, i) => `  ${i + 1}. ${e.path}: ${e.message}`),
      "",
      "请修正合同后重新验证。未通过验证的合同不得委派子 Agent 执行。",
    ].join("\n")
  },
})
