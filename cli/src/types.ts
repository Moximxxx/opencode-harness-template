/**
 * CLI 工具类型定义
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

/** 用户交互式问答的回答 */
export interface Answers {
  projectName: string;
  frontend: string;
  backend: string;
  runtime: string;
  buildTool: string;
  testFramework: string;
  packageManager: string;
  targetDir: string;
}

/** Harness 配置文件结构 */
export interface HarnessConfig {
  version: string;
  analyzed_at: string | null;
  project: {
    name: string;
    path: string;
    is_git_repo: boolean;
  };
  detected: {
    tech_stack: string[];
    layers: string;
    build_system: string;
    detected_patterns: string[];
  };
  suggested_constraints: string[];
  file_stats: Record<string, unknown>;
}
