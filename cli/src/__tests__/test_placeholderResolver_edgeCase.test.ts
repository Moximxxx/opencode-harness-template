/**
 * 测试：placeholder-resolver 边界场景
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { resolvePlaceholders } from '../placeholder-resolver.js';
import type { Answers } from '../types.js';

const mockAnswers: Answers = {
  projectName: 'test',
  frontend: 'React',
  backend: '无',
  runtime: 'Node.js',
  buildTool: 'Vite',
  testFramework: '无',
  packageManager: 'npm',
  targetDir: '/tmp/test-target',
};

describe('placeholder-resolver edge cases', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-harness-edge-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('当模板目录中没有 AGENTS.md 时不应报错', () => {
    // 不创建 AGENTS.md
    expect(() => resolvePlaceholders(tempDir, mockAnswers)).not.toThrow();
  });

  it('当模板目录中没有 README.md 时不应报错', () => {
    // 不创建 README.md
    expect(() => resolvePlaceholders(tempDir, mockAnswers)).not.toThrow();
  });

  it('当模板目录中没有 harness.config.json 时不应报错', () => {
    // 不创建配置
    expect(() => resolvePlaceholders(tempDir, mockAnswers)).not.toThrow();
  });

  it('空文件不应导致报错', () => {
    fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '', 'utf-8');
    fs.writeFileSync(path.join(tempDir, 'README.md'), '', 'utf-8');

    expect(() => resolvePlaceholders(tempDir, mockAnswers)).not.toThrow();
  });

  it('当用户选择"无"时，技术栈数组应排除"无"', () => {
    const configPath = path.join(tempDir, 'harness.config.json');
    const config = {
      version: '1.0.0',
      analyzed_at: null,
      project: { name: '', path: '', is_git_repo: false },
      detected: {
        tech_stack: [],
        layers: '',
        build_system: '',
        detected_patterns: [],
      },
      suggested_constraints: [],
      file_stats: {},
    };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    resolvePlaceholders(tempDir, mockAnswers);

    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    // frontend=React, backend=无, runtime=Node.js → 应排除"无"
    expect(parsed.detected.tech_stack).toEqual(['React', 'Node.js']);
    expect(parsed.detected.tech_stack).not.toContain('无');
  });

  it('当文件中没有占位符时不应修改内容', () => {
    const content = '# 无占位符的文件\n\n普通内容\n';
    const agentsPath = path.join(tempDir, 'AGENTS.md');
    fs.writeFileSync(agentsPath, content, 'utf-8');

    resolvePlaceholders(tempDir, mockAnswers);

    const result = fs.readFileSync(agentsPath, 'utf-8');
    expect(result).toBe(content);
  });
});
