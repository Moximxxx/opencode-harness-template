#!/bin/bash
# incident-analyzer.sh — 事故分析
# 解析错误日志并分类

set -euo pipefail

INPUT="${1:-}"

if [ -z "$INPUT" ]; then
    echo "Usage: incident-analyzer.sh <log_file>"
    exit 1
fi

if [ -f "$INPUT" ]; then
    CONTENT=$(cat "$INPUT")
else
    CONTENT="$INPUT"
fi

echo "事故分析"
echo "------------------------"

# 错误分类
if echo "$CONTENT" | grep -qiE "SyntaxError|ParseError"; then
    echo "类型: syntax_error"
elif echo "$CONTENT" | grep -qiE "TypeError|cannot read property"; then
    echo "类型: type_error"
elif echo "$CONTENT" | grep -qiE "ESLint|lint.*error"; then
    echo "类型: lint_error"
elif echo "$CONTENT" | grep -qiE "Test.*failed|Assertion.*failed"; then
    echo "类型: test_failure"
elif echo "$CONTENT" | grep -qiE "ECONNREFUSED|404|500|network"; then
    echo "类型: api_error"
elif echo "$CONTENT" | grep -qiE "Memory|ENOMEM"; then
    echo "类型: resource_error"
else
    echo "类型: unknown"
fi

# 提取文件路径
echo "------------------------"
echo "相关文件:"
echo "$CONTENT" | grep -oE "[^[:space:]]+\.(ts|tsx|js|jsx):[0-9]+" | head -5

exit 0
