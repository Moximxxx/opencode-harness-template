#!/bin/bash
# verify_arch.sh — 架构约束验证
# 检查 UI 层是否直接调用了运行时 API

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ISSUES=0

echo "架构约束验证..."

# 检查 UI 层是否直接引用了运行时模块
# 项目初始化后根据实际架构调整检查路径和模式
if [ -d "$PROJECT_ROOT/src/renderer" ]; then
    NODE_API_USAGE=$(grep -rn "fs\.\|process\.\|path\." "$PROJECT_ROOT/src/renderer/" 2>/dev/null | grep -v "__tests__\|\.test\.\|\.spec\." || true)
    if [ -n "$NODE_API_USAGE" ]; then
        echo "[VIOLATION] renderer 直接调用 Node.js API:"
        echo "$NODE_API_USAGE"
        ISSUES=$((ISSUES + 1))
    fi
fi

if [ "$ISSUES" -gt 0 ]; then
    echo "RESULT: FAIL $ISSUES architecture violation(s) found"
    exit 1
fi

echo "RESULT: PASS architecture constraints verified"
exit 0
