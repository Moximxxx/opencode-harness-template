import type { Plugin } from "@opencode-ai/plugin"

/**
 * dangerous-command-guard — 危险命令拦截 Plugin
 * 
 * 在 bash 工具执行前，检查命令是否包含危险模式。
 * 系统级危险 → BLOCK（直接拒绝）
 * 项目级危险 → WARN（仅警告不阻止，Console 输出）
 */
export const DangerousCommandGuard: Plugin = async ({ client }) => {
  // 系统级危险：必须拦截
  const BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\brm\s+-rf\s+\/(?:\s|$|[;&|])/, reason: "禁止删除根目录 (rm -rf /)" },
    { pattern: /:(){ :\|:& };:/, reason: "禁止 Fork Bomb" },
    { pattern: /\bgit\s+push\s+--force\b.*\b(main|master)\b/, reason: "禁止 force push 到 main/master 分支" },
    { pattern: /\bgit\s+push\s+-f\b.*\b(main|master)\b/, reason: "禁止 force push 到 main/master 分支" },
    { pattern: /\bDROP\s+DATABASE\b/i, reason: "禁止 DROP DATABASE 命令" },
    { pattern: /\bDROP\s+TABLE\b.*\bCASCADE\b/i, reason: "禁止 DROP TABLE ... CASCADE" },
    { pattern: /\bshutdown\b/, reason: "禁止关机/重启命令" },
    { pattern: /\bchmod\s+777\s+\/(?:\s|$|[;&|])/, reason: "禁止对根目录 chmod 777" },
    { pattern: /\bmkfs\./, reason: "禁止格式化磁盘" },
    { pattern: /\bdd\s+if=.*of=\/dev\//, reason: "禁止直接写磁盘设备" },
  ]

  // 项目级危险：仅警告
  const WARNED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\brm\s+-rf\s+\.(?:\s|$|[;&|])/, reason: "危险操作：删除当前目录 (rm -rf .)，请确认路径" },
    { pattern: /\bchmod\s+-R\s+777\b/, reason: "安全隐患：递归设置 777 权限" },
    { pattern: /\bgit\s+reset\s+--hard\b/, reason: "注意：git reset --hard 会丢失未提交的更改" },
    { pattern: /\bgit\s+clean\s+-fd\b/, reason: "注意：git clean -fd 会删除未追踪的文件" },
  ]

  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") return

      const command = output.args?.command || ""
      if (!command) return

      // 检查系统级危险
      for (const { pattern, reason } of BLOCKED_PATTERNS) {
        if (pattern.test(command)) {
          throw new Error(`🚫 Dangerous-Command-Guard (BLOCK): ${reason}\n   命令: ${command.slice(0, 200)}`)
        }
      }

      // 检查项目级危险
      for (const { pattern, reason } of WARNED_PATTERNS) {
        if (pattern.test(command)) {
          // 使用 client.app.log 记录警告
          try {
            await client.app.log({
              body: {
                service: "dangerous-command-guard",
                level: "warn",
                message: `WARN: ${reason}`,
                extra: { command: command.slice(0, 200) }
              }
            })
          } catch {
            // 日志失败不影响主流程
          }
          // 不阻止执行，仅记录
          return
        }
      }
    }
  }
}

export default DangerousCommandGuard
