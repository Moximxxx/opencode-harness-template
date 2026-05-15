#!/bin/bash
# coordinator-guard.sh — 编辑文件前检查是否在合同范围内（pre_task 钩子）
# 用途：编辑文件前检查是否在 active 合同 files_to_modify 范围内
# 协议：RESULT: PASS/BLOCK/WARN
# 用法：bash coordinator-guard.sh <file_path>

set -euo pipefail

FILE_TO_EDIT="${1:-}"

if [ -z "$FILE_TO_EDIT" ]; then
    echo "RESULT: WARN 未提供要编辑的文件路径"
    exit 2
fi

# 规范化路径（移除 ./ 前缀）
FILE_TO_EDIT="${FILE_TO_EDIT#./}"

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/.opencode/contracts"

# 查找所有 active 状态的合同
ACTIVE_CONTRACTS=$(find "$CONTRACTS_DIR" -name '*.json' ! -name 'contract-schema.json' -print0 2>/dev/null | while IFS= read -r -d '' f; do
    status=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$f" 2>/dev/null | head -1 | sed 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    if [ "$status" = "active" ]; then
        echo "$f"
    fi
done)

if [ -z "$ACTIVE_CONTRACTS" ]; then
    echo "RESULT: BLOCK 无 active 状态的合同，拒绝编辑: $FILE_TO_EDIT"
    exit 1
fi

# 检查文件是否出现在任一 active 合同的 files_to_modify 中
FOUND=false
for CONTRACT_FILE in $ACTIVE_CONTRACTS; do
    # 检查过期（30分钟）
    TIMESTAMP=$(grep -o '"timestamp"[[:space:]]*:[[:space:]]*[0-9]*' "$CONTRACT_FILE" 2>/dev/null | grep -o '[0-9]*')
    if [ -n "$TIMESTAMP" ]; then
        NOW=$(date +%s)
        AGE=$((NOW - TIMESTAMP))
        if [ "$AGE" -gt 1800 ]; then
            echo "RESULT: WARN 合同已过期（${AGE}s），跳过: $(basename "$CONTRACT_FILE")"
            continue
        fi
    fi

    # 提取 files_to_modify
    FILES=$(grep -o '"files_to_modify"[[:space:]]*:[[:space:]]*\[[^]]*\]' "$CONTRACT_FILE" 2>/dev/null | grep -o '"[^"]*"' | grep -v 'files_to_modify' | sed 's/"//g')

    while IFS= read -r ALLOWED_FILE; do
        if [ -n "$ALLOWED_FILE" ] && [ "$ALLOWED_FILE" = "$FILE_TO_EDIT" ]; then
            CONTRACT_ID=$(grep -o '"task_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONTRACT_FILE" 2>/dev/null | head -1 | sed 's/.*"task_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
            echo "RESULT: PASS 文件 '$FILE_TO_EDIT' 在合同 '$CONTRACT_ID' 范围内"
            exit 0
        fi
    done <<< "$FILES"
done

echo "RESULT: BLOCK 文件 '$FILE_TO_EDIT' 不在任何 active 合同范围内"
exit 1
