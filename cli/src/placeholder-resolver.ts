/**
 * 占位符检测与替换模块
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Answers, HarnessConfig } from './types.js';

/** 技术栈表层级顺序（对应 AGENTS.md 中的表格行） */
const TECH_STACK_LAYERS: ReadonlyArray<{
  readonly key: keyof Answers;
  readonly label: string;
}> = [
  { key: 'frontend', label: '前端' },
  { key: 'backend', label: '业务逻辑' },
  { key: 'runtime', label: '运行时' },
  { key: 'buildTool', label: '构建工具' },
  { key: 'testFramework', label: '测试框架' },
  { key: 'packageManager', label: '包管理' },
];

/** AGENTS.md 中的技术栈表模板行 */
const TECH_TABLE_LINE_PATTERN = /^\| [\u4e00-\u9fff]+ \| _待定_ \|$/m;

/** 判断路径是否为 git 仓库 */
function isGitRepo(dirPath: string): boolean {
  const gitDir = path.join(dirPath, '.git');
  return fs.existsSync(gitDir);
}

/** 检查文件是否存在 */
function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

/**
 * 替换 AGENTS.md 中的占位符
 * - `_待定_` → 用户选择的技术栈
 * - `<pkg>` → 用户选择的包管理器
 */
function resolveAgentsMd(
  filePath: string,
  answers: Answers,
): void {
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. 替换技术栈表中的 _待定_（按层级顺序逐行替换）
  const lines = content.split('\n');
  let techIndex = 0;
  const resolvedLines = lines.map((line: string) => {
    if (TECH_TABLE_LINE_PATTERN.test(line) && techIndex < TECH_STACK_LAYERS.length) {
      const layer = TECH_STACK_LAYERS[techIndex];
      const value = String(answers[layer.key]);
      const newLine = line.replace('_待定_', value);
      techIndex++;
      return newLine;
    }
    return line;
  });
  content = resolvedLines.join('\n');

  // 2. 替换 <pkg> 为包管理器
  content = content.replaceAll('<pkg>', answers.packageManager);

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 替换 harness.config.json 中的占位字段
 */
function resolveHarnessConfig(
  filePath: string,
  answers: Answers,
): void {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const config: HarnessConfig = JSON.parse(raw);

  // 填充 project 字段
  config.project.name = answers.projectName;
  config.project.path = answers.targetDir;
  config.project.is_git_repo = isGitRepo(answers.targetDir);

  // 填充 detected 字段
  config.detected.tech_stack = [
    answers.frontend,
    answers.backend,
    answers.runtime,
  ].filter((t) => t !== '无');
  config.detected.build_system = answers.buildTool;
  config.analyzed_at = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 替换 README.md 中的占位说明
 */
function resolveReadmeMd(
  filePath: string,
  answers: Answers,
): void {
  let content = fs.readFileSync(filePath, 'utf-8');

  const placeholderPattern =
    /具体技术栈（前端、后端、构建工具等）待项目初始化后填充/;

  const replacement = `具体技术栈已配置：${answers.frontend}, ${answers.backend}, ${answers.buildTool}`;

  content = content.replace(placeholderPattern, replacement);

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 对模板目录中的文件执行占位符替换
 * @param templateDir 模板文件所在目录
 * @param answers 用户回答
 */
export function resolvePlaceholders(
  templateDir: string,
  answers: Answers,
): void {
  // 替换 AGENTS.md
  const agentsMdPath = path.join(templateDir, 'AGENTS.md');
  if (fileExists(agentsMdPath)) {
    resolveAgentsMd(agentsMdPath, answers);
  }

  // 替换 README.md
  const readmeMdPath = path.join(templateDir, 'README.md');
  if (fileExists(readmeMdPath)) {
    resolveReadmeMd(readmeMdPath, answers);
  }

  // 替换 harness.config.json
  const configPath = path.join(templateDir, 'harness.config.json');
  if (fileExists(configPath)) {
    resolveHarnessConfig(configPath, answers);
  }
}
