import type { Plugin } from "@opencode-ai/plugin"

/**
 * secret-leak-scan — 密钥泄露扫描 Plugin
 * 
 * 在 write/edit 工具执行后，扫描写入内容是否包含疑似密钥/敏感信息。
 * 命中任何模式 → 抛出错误，阻止内容写入。
 */
export const SecretLeakScan: Plugin = async () => {
  return {
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "edit" && input.tool !== "write") return

      // 收集需要扫描的内容
      const textsToScan: string[] = []
      
      // edit 工具: newString
      if (input.tool === "edit" && input.args?.newString) {
        textsToScan.push(input.args.newString)
      }
      
      // write 工具: content
      if (input.tool === "write" && input.args?.content) {
        textsToScan.push(input.args.content)
      }

      if (textsToScan.length === 0) return

      for (const text of textsToScan) {
        const findings = scanSecrets(text)
        if (findings.length > 0) {
          throw new Error(
            `🔐 Secret-Leak-Scan: 检测到疑似密钥/敏感信息，已阻止写入！\n` +
            findings.map((f, i) => `  ${i + 1}. [${f.type}] ${f.masked}`).join("\n") +
            `\n  如果是测试用的假密钥，请使用明显的占位符（如 "YOUR_API_KEY"）。`
          )
        }
      }
    }
  }
}

interface Finding {
  type: string
  masked: string  // 脱敏后的内容
}

/** 密钥模式定义 */
const SECRET_PATTERNS: Array<{ type: string; regex: RegExp }> = [
  // OpenAI API Key
  { type: "OpenAI API Key", regex: /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/ },
  // GitHub Personal Access Token (classic)
  { type: "GitHub Token", regex: /ghp_[A-Za-z0-9]{36}/ },
  // GitHub Fine-grained Token
  { type: "GitHub Token", regex: /github_pat_[A-Za-z0-9_]{22,}/ },
  // AWS Access Key
  { type: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  // AWS Secret Key 的常见模式 (40 char base64-like)
  { type: "AWS Secret Key (疑似)", regex: /(?<=SecretAccessKey|aws_secret|AWS_SECRET).{20,60}[A-Za-z0-9+/=]{20,}/i },
  // JWT Token
  { type: "JWT Token", regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  // Private Key (PEM)
  { type: "Private Key (PEM)", regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  // Generic API Key 赋值模式
  { type: "API Key (疑似)", regex: /(?:api[_-]?key|apikey|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{20,}['"]/i },
  // Stripe Secret Key
  { type: "Stripe Key", regex: /sk_live_[A-Za-z0-9]{24,}/ },
  // Slack Token
  { type: "Slack Token", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
]

function scanSecrets(text: string): Finding[] {
  const findings: Finding[] = []
  for (const pattern of SECRET_PATTERNS) {
    const match = text.match(pattern.regex)
    if (match) {
      findings.push({
        type: pattern.type,
        masked: maskSecret(match[0])
      })
    }
  }
  return findings
}

/** 脱敏：只显示前 4 个字符 + 后 4 个字符 */
function maskSecret(secret: string): string {
  if (secret.length <= 8) return secret[0] + "***" + secret[secret.length - 1]
  return secret.slice(0, 4) + "****" + secret.slice(-4)
}

export default SecretLeakScan
