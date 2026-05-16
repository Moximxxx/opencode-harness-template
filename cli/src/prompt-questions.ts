/**
 * 交互式问题模块
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

import inquirer from 'inquirer';
import path from 'node:path';
import process from 'node:process';
import type { Answers } from './types.js';

/** 验证项目名称：非空且不含特殊字符 */
export function validateProjectName(input: string): string | boolean {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return '项目名称不能为空';
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return '项目名称只能包含字母、数字、中划线和下划线';
  }
  return true;
}

/** 获取默认项目名（当前目录名） */
function getDefaultProjectName(): string {
  return path.basename(process.cwd());
}

/** 收集用户输入的问答 */
export async function promptQuestions(): Promise<Answers> {
  const defaultName = getDefaultProjectName();

  const answers = await inquirer.prompt<Answers>([
    {
      type: 'input',
      name: 'projectName',
      message: '项目名称：',
      default: defaultName,
      validate: validateProjectName,
    },
    {
      type: 'list',
      name: 'frontend',
      message: '选择前端框架：',
      choices: ['React', 'Vue', 'Angular', 'Svelte', '无'],
      default: 'React',
    },
    {
      type: 'list',
      name: 'backend',
      message: '选择业务逻辑层：',
      choices: ['Node.js', 'Python', 'Go', 'Rust', '无'],
      default: 'Node.js',
    },
    {
      type: 'list',
      name: 'runtime',
      message: '选择运行时：',
      choices: ['Node.js', 'Deno', 'Bun'],
      default: 'Node.js',
    },
    {
      type: 'list',
      name: 'buildTool',
      message: '选择构建工具：',
      choices: ['Vite', 'Webpack', 'Turbopack', 'esbuild', 'tsc'],
      default: 'Vite',
    },
    {
      type: 'list',
      name: 'testFramework',
      message: '选择测试框架：',
      choices: ['Vitest', 'Jest', 'Playwright', 'Cypress', '无'],
      default: 'Vitest',
    },
    {
      type: 'list',
      name: 'packageManager',
      message: '选择包管理器：',
      choices: ['npm', 'yarn', 'pnpm', 'bun'],
      default: 'npm',
    },
  ]);

  return {
    ...answers,
    targetDir: process.cwd(),
  };
}
