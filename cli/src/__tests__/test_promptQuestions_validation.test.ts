/**
 * 测试：prompt-questions 验证逻辑
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

import { describe, it, expect } from 'vitest';
import { validateProjectName } from '../prompt-questions.js';

describe('validateProjectName', () => {
  it('空名称应返回错误信息', () => {
    const result = validateProjectName('');
    expect(result).toBe('项目名称不能为空');
  });

  it('仅空格的名称应返回错误信息', () => {
    const result = validateProjectName('   ');
    expect(result).toBe('项目名称不能为空');
  });

  it('含特殊字符的名称应返回错误信息', () => {
    const result = validateProjectName('my project');
    expect(result).toBe('项目名称只能包含字母、数字、中划线和下划线');
  });

  it('含中文的名称应返回错误信息', () => {
    const result = validateProjectName('我的项目');
    expect(result).toBe('项目名称只能包含字母、数字、中划线和下划线');
  });

  it('含点号的名称应返回错误信息', () => {
    const result = validateProjectName('my.project');
    expect(result).toBe('项目名称只能包含字母、数字、中划线和下划线');
  });

  it('合法的字母数字名称应返回 true', () => {
    const result = validateProjectName('myproject');
    expect(result).toBe(true);
  });

  it('含中划线的合法名称应返回 true', () => {
    const result = validateProjectName('my-project');
    expect(result).toBe(true);
  });

  it('含下划线的合法名称应返回 true', () => {
    const result = validateProjectName('my_project');
    expect(result).toBe(true);
  });

  it('含数字的合法名称应返回 true', () => {
    const result = validateProjectName('my2project');
    expect(result).toBe(true);
  });

  it('复杂合法名称应返回 true', () => {
    const result = validateProjectName('my-awesome_project-v2');
    expect(result).toBe(true);
  });
});
