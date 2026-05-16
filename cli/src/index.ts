#!/usr/bin/env node

/**
 * create-opencode-harness CLI 入口
 * Trace ID: 3fa1a6338e5d49ac94d068385a8ebe96
 */

import { main } from './cli.js';

async function run(): Promise<void> {
  try {
    await main();
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error(`\x1b[31m✖ 初始化失败：${message}\x1b[0m`);
    console.error('\x1b[33m提示：请确保网络连接正常，或尝试手动克隆模板：\x1b[0m');
    console.error('\x1b[33m  git clone --depth 1 https://github.com/Moxin-x/opencode-harness-template.git\x1b[0m');
    process.exit(1);
  }
}

await run();
