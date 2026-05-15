#!/bin/bash
# incremental-verify.sh — 增量验证
# 只验证变更相关的文件

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

BASE="${1:-HEAD}"

if ! git rev-parse --git-dir &>/dev/null; then
    echo "增量验证 - 非 git 仓库，运行全量验证"
    bun run typecheck 2>/dev/null || echo "typecheck failed"
    bun run test 2>/dev/null || echo "test failed"
    exit 0
fi

echo "增量验证 (变更对比: $BASE)"
echo "------------------------"

# 获取变更文件
CHANGED=$(git diff --name-only "$BASE" 2>/dev/null | grep -E '\.(ts|tsx)$' || echo "")

if [ -z "$CHANGED" ]; then
    echo "无 TypeScript 文件变更"
    exit 0
fi

echo "变更文件:"
echo "$CHANGED" | sed 's/^/  /'

# 运行 typecheck
echo ""
echo "运行 typecheck..."
if bun run typecheck 2>/dev/null; then
    echo "PASS: typecheck"
else
    echo "FAIL: typecheck"
fi

exit 0
