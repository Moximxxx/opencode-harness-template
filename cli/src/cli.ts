/**
 * 主 CLI 逻辑模块
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { promptQuestions } from './prompt-questions.js';
import { fetchTemplate } from './template-fetcher.js';
import { resolvePlaceholders } from './placeholder-resolver.js';
import type { Answers } from './types.js';

/** 复制时忽略的目录/文件列表 */
const IGNORE_LIST: ReadonlySet<string> = new Set([
  '.git',
  'node_modules',
  'dist',
]);

/**
 * 递归复制目录内容
 * @param src 源路径
 * @param dest 目标路径
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORE_LIST.has(entry.name)) {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      if (fs.existsSync(destPath)) {
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `文件 ${entry.name} 已存在，是否覆盖？`,
            default: false,
          },
        ]);
        if (!overwrite) {
          continue;
        }
      }
      fs.cpSync(srcPath, destPath, { force: true });
    }
  }
}

/**
 * 显示欢迎 banner
 */
function showBanner(): void {
  console.log('');
  console.log(chalk.cyan.bold('╔══════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║     create-opencode-harness             ║'));
  console.log(chalk.cyan.bold('║     一键初始化 OpenCode 多 Agent 工作流  ║'));
  console.log(chalk.cyan.bold('╚══════════════════════════════════════════╝'));
  console.log('');
}

/**
 * 显示确认摘要
 */
function showSummary(answers: Answers): void {
  console.log('');
  console.log(chalk.yellow('📋 配置摘要'));
  console.log(chalk.yellow('━'.repeat(40)));
  console.log(`   ${chalk.bold('项目名称')}    : ${answers.projectName}`);
  console.log(`   ${chalk.bold('前端框架')}    : ${answers.frontend}`);
  console.log(`   ${chalk.bold('业务逻辑')}    : ${answers.backend}`);
  console.log(`   ${chalk.bold('运行时')}      : ${answers.runtime}`);
  console.log(`   ${chalk.bold('构建工具')}    : ${answers.buildTool}`);
  console.log(`   ${chalk.bold('测试框架')}    : ${answers.testFramework}`);
  console.log(`   ${chalk.bold('包管理器')}    : ${answers.packageManager}`);
  console.log(`   ${chalk.bold('目标目录')}    : ${answers.targetDir}`);
  console.log(chalk.yellow('━'.repeat(40)));
  console.log('');
}

/**
 * CLI 主入口
 */
export async function main(): Promise<void> {
  showBanner();

  // 1. 收集用户输入
  const spinner = ora('正在准备...').start();
  spinner.stop();
  const answers: Answers = await promptQuestions();

  // 2. 显示确认摘要
  showSummary(answers);

  // 3. 拉取模板
  const templateDir = await fetchTemplate(answers.targetDir);

  // 4. 替换占位符
  const resolveSpinner = ora('正在替换占位符...').start();
  try {
    resolvePlaceholders(templateDir, answers);
    resolveSpinner.succeed('占位符替换完成');
  } catch (error: unknown) {
    resolveSpinner.fail('占位符替换失败');
    throw error;
  }

  // 5. 将处理后的文件写入目标目录
  const copySpinner = ora('正在写入目标目录...').start();
  try {
    await copyDirectory(templateDir, answers.targetDir);
    copySpinner.succeed('文件写入完成');
  } catch (error: unknown) {
    copySpinner.fail('文件写入失败');
    throw error;
  }

  // 6. 成功消息
  console.log('');
  console.log(chalk.green.bold('✅ opencode-harness 已成功初始化！'));
  console.log('');
  console.log(chalk.cyan('下一步操作：'));
  console.log(chalk.cyan(`  cd ${answers.projectName}`));
  console.log(chalk.cyan(`  ${answers.packageManager} install`));
  console.log(chalk.cyan('  然后使用 OpenCode 开始开发！'));
  console.log('');
}
