import type { Plugin } from "@opencode-ai/plugin"
import { readdirSync, readFileSync, existsSync } from "fs"
import { join, resolve } from "path"

/**
 * contract-enforcer — 合同门禁 + 文件锁 Plugin
 * 
 * 在 edit/write 工具执行前：
 * 1. 检查是否有 active 合同
 * 2. 检查要编辑的文件是否在合同的 files_to_modify 范围内
 * 3. 检查是否有文件锁冲突（其他 active 合同也在改同一个文件）
 * 4. 检查合同是否过期（>30分钟）
 * 
 * 白名单：.opencode/contracts/ 下的文件免除检查（允许写入合同文件）
 */
export const ContractEnforcer: Plugin = async ({ directory, worktree }) => {
  return {
    "tool.execute.before": async (input, output) => {
      // 只拦截编辑类操作
      if (input.tool !== "edit" && input.tool !== "write") return

      // 提取要编辑的文件路径
      const targetFile = extractTargetFile(input, output)
      if (!targetFile) return // 无法提取文件路径，放行

      // 白名单：.opencode/contracts/ 下的文件不需要合同
      const normalizedPath = targetFile.replace(/\\/g, "/")
      if (normalizedPath.includes(".opencode/contracts/")) return

      // 查找 active 合同
      const contractsDir = resolve(directory, ".opencode/contracts")
      const activeContracts = findActiveContracts(contractsDir)
      
      if (activeContracts.length === 0) {
        throw new Error(
          `🚫 Contract-Enforcer: 无 active 状态的合同，拒绝编辑: ${targetFile}\n` +
          `   请通过 Coordinator 创建任务合同后再修改文件。`
        )
      }

      // 检查文件是否在任一 active 合同的范围内
      let foundContract: string | null = null
      const lockingContracts: string[] = []

      for (const contract of activeContracts) {
        const files = contract.files_to_modify || []
        for (const f of files) {
          if (isPathMatch(f as string, targetFile)) {
            foundContract = contract.task_id
            break
          }
        }
        // 如果当前合同包含了这个文件，还要检查其他合同是否也锁定了它
        if (foundContract === contract.task_id) {
          for (const otherContract of activeContracts) {
            if (otherContract.task_id === contract.task_id) continue
            const otherFiles = otherContract.files_to_modify || []
            for (const f of otherFiles) {
              if (isPathMatch(f as string, targetFile)) {
                lockingContracts.push(otherContract.task_id)
                break
              }
            }
          }
          break
        }
      }

      if (foundContract && lockingContracts.length === 0) {
        // PASS：文件在合同范围内，无锁冲突
        return
      }

      if (foundContract && lockingContracts.length > 0) {
        throw new Error(
          `🚫 Contract-Enforcer: 文件锁冲突！\n` +
          `   文件: ${targetFile}\n` +
          `   当前合同: ${foundContract}\n` +
          `   被以下活跃合同锁定: ${lockingContracts.join(", ")}`
        )
      }

      throw new Error(
        `🚫 Contract-Enforcer: 文件不在任何 active 合同范围内: ${targetFile}\n` +
        `   活跃合同列表: ${activeContracts.map(c => c.task_id).join(", ") || "(无)"}\n` +
        `   请通过 Coordinator 将此文件加入合同 files_to_modify。`
      )
    }
  }
}

/** 从工具参数中提取目标文件路径 */
function extractTargetFile(input: any, output: any): string | null {
  // edit 工具: filePath
  if (input.tool === "edit" && output.args?.filePath) {
    return output.args.filePath
  }
  // write 工具: filePath
  if (input.tool === "write" && output.args?.filePath) {
    return output.args.filePath
  }
  return null
}

/** 标准化路径：反斜杠转正斜杠，去除 ./ 和 ../ 前缀 */
function normalizePath(p: string): string {
  return p
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\.\.\//g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
}

/** 路径匹配：支持精确匹配和通配符匹配 */
function isPathMatch(pattern: string, filePath: string): boolean {
  // 路径标准化：去除 \、./、../、多余斜杠
  const normPattern = normalizePath(pattern)
  const normPath = normalizePath(filePath)
  
  // 精确匹配
  if (normPattern === normPath) return true
  
  // 简单通配符：末尾 ** 匹配子目录
  if (normPattern.endsWith("/**")) {
    const prefix = normPattern.slice(0, -3)
    return normPath.startsWith(prefix + "/") || normPath === prefix
  }
  
  // 末尾 * 匹配该目录下所有文件
  if (normPattern.endsWith("/*")) {
    const prefix = normPattern.slice(0, -2)
    return normPath.startsWith(prefix + "/") && !normPath.slice(prefix.length + 1).includes("/")
  }
  
  return false
}

/** 查找所有 active 状态的合同 */
function findActiveContracts(dir: string): Array<{ task_id: string; files_to_modify: string[]; timestamp: number }> {
  const results: Array<{ task_id: string; files_to_modify: string[]; timestamp: number }> = []
  const now = Math.floor(Date.now() / 1000)

  function scanDir(path: string) {
    if (!existsSync(path)) return
    const entries = readdirSync(path, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(path, entry.name)
      if (entry.isDirectory()) {
        scanDir(fullPath)
      } else if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "contract-schema.json") {
        try {
          const content = readFileSync(fullPath, "utf-8")
          const contract = JSON.parse(content)
          if (contract.status === "active") {
            // 检查时效性（30分钟）
            const age = now - (contract.timestamp || 0)
            if (age <= 1800) {
              results.push({
                task_id: contract.task_id || "unknown",
                files_to_modify: contract.files_to_modify || [],
                timestamp: contract.timestamp || 0
              })
            }
          }
        } catch {
          // JSON 解析失败，跳过
        }
      }
    }
  }

  scanDir(dir)
  return results
}

export default ContractEnforcer
