/**
 * 测试：placeholder-resolver 正常替换场景
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { resolvePlaceholders } from '../placeholder-resolver.js';
import type { Answers } from '../types.js';

const SAMPLE_AGENTS_MD = `# AGENTS.md

## 技术栈（项目初始化后填充）

| 层级 | 技术 |
|------|------|
| 前端 | _待定_ |
| 业务逻辑 | _待定_ |
| 运行时 | _待定_ |
| 构建工具 | _待定_ |
| 测试框架 | _待定_ |
| 包管理 | _待定_ |

## 常用命令

\`\`\`bash
# <pkg> run dev
# <pkg> run build
# <pkg> run lint
# <pkg> run typecheck
# <pkg> run test
\`\`\`
`;

const SAMPLE_README_MD = `# 项目

> 具体技术栈（前端、后端、构建工具等）待项目初始化后填充。
`;

const SAMPLE_HARNESS_CONFIG = JSON.stringify(
  {
    version: '1.0.0',
    analyzed_at: null,
    project: {
      name: '',
      path: '',
      is_git_repo: false,
    },
    detected: {
      tech_stack: [],
      layers: '',
      build_system: '',
      detected_patterns: [],
    },
    suggested_constraints: [],
    file_stats: {},
  },
  null,
  2,
);

const mockAnswers: Answers = {
  projectName: 'my-project',
  frontend: 'React',
  backend: 'Node.js',
  runtime: 'Bun',
  buildTool: 'Vite',
  testFramework: 'Vitest',
  packageManager: 'pnpm',
  targetDir: '/tmp/test-target',
};

describe('placeholder-resolver happy path', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-harness-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('应该正确替换 AGENTS.md 中的 _待定_ 占位符', () => {
    const agentsPath = path.join(tempDir, 'AGENTS.md');
    fs.writeFileSync(agentsPath, SAMPLE_AGENTS_MD, 'utf-8');

    resolvePlaceholders(tempDir, mockAnswers);

    const content = fs.readFileSync(agentsPath, 'utf-8');
    expect(content).toContain('| 前端 | React |');
    expect(content).toContain('| 业务逻辑 | Node.js |');
    expect(content).toContain('| 运行时 | Bun |');
    expect(content).toContain('| 构建工具 | Vite |');
    expect(content).toContain('| 测试框架 | Vitest |');
    expect(content).toContain('| 包管理 | pnpm |');
    expect(content).not.toContain('_待定_');
  });

  it('应该正确替换 AGENTS.md 中的 <pkg> 占位符', () => {
    const agentsPath = path.join(tempDir, 'AGENTS.md');
    fs.writeFileSync(agentsPath, SAMPLE_AGENTS_MD, 'utf-8');

    resolvePlaceholders(tempDir, mockAnswers);

    const content = fs.readFileSync(agentsPath, 'utf-8');
    // 所有 <pkg> 应被替换为 pnpm
    const pkgMatches = content.match(/<pkg>/g);
    expect(pkgMatches).toBeNull();
    // 验证所有5个命令位置都被替换
    expect(content).toContain('# pnpm run dev');
    expect(content).toContain('# pnpm run build');
    expect(content).toContain('# pnpm run lint');
    expect(content).toContain('# pnpm run typecheck');
    expect(content).toContain('# pnpm run test');
  });

  it('应该正确替换 README.md 中的占位说明', () => {
    const readmePath = path.join(tempDir, 'README.md');
    fs.writeFileSync(readmePath, SAMPLE_README_MD, 'utf-8');

    resolvePlaceholders(tempDir, mockAnswers);

    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('具体技术栈已配置：React, Node.js, Vite');
    expect(content).not.toContain('待项目初始化后填充');
  });

  it('应该正确填充 harness.config.json', () => {
    const configPath = path.join(tempDir, 'harness.config.json');
    fs.writeFileSync(configPath, SAMPLE_HARNESS_CONFIG, 'utf-8');

    resolvePlaceholders(tempDir, mockAnswers);

    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    expect(config.project.name).toBe('my-project');
    expect(config.project.is_git_repo).toBe(false);
    expect(config.detected.tech_stack).toEqual(['React', 'Node.js', 'Bun']);
    expect(config.detected.build_system).toBe('Vite');
    expect(config.analyzed_at).toBeTruthy();
    expect(typeof config.analyzed_at).toBe('string');
  });
});
