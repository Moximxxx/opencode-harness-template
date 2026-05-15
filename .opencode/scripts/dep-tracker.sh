#!/bin/bash
# dep-tracker.sh — 依赖追踪
# 分析 TypeScript/JavaScript 文件的 import 依赖

set -euo pipefail

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
    echo "Usage: dep-tracker.sh <file>"
    exit 1
fi

if [ ! -f "$TARGET" ]; then
    echo "ERROR: File not found: $TARGET"
    exit 1
fi

echo "依赖分析: $TARGET"
echo "------------------------"

# 解析 import 语句
IMPORTS=$(grep -E "^import\s+.*from\s+" "$TARGET" 2>/dev/null | \
    sed -E "s/.*from\s+['\"]([^'\"]+)['\"].*/\1/" | \
    grep -v "^$\|^//" || echo "")

LOCAL_DEPS=()
EXTERNAL_DEPS=()

while IFS= read -r dep; do
    if [ -z "$dep" ]; then continue; fi
    if [[ "$dep" == ./* ]] || [[ "$dep" == ../* ]]; then
        LOCAL_DEPS+=("$dep")
    else
        EXTERNAL_DEPS+=("$dep")
    fi
done <<< "$IMPORTS"

echo "本地依赖 (${#LOCAL_DEPS[@]}):"
for dep in "${LOCAL_DEPS[@]}"; do
    echo "  $dep"
done

echo ""
echo "外部依赖 (${#EXTERNAL_DEPS[@]}):"
for dep in "${EXTERNAL_DEPS[@]}"; do
    echo "  $dep"
done

exit 0
