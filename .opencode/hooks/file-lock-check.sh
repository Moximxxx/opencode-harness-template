#!/bin/bash
# file-lock-check.sh — 文件锁检查（pre_task 钩子）
# 用途：扫描所有 active 合同的 files_to_modify，检查是否与当前合同存在文件重叠
# 协议：RESULT: PASS/BLOCK/WARN
# 参数：$1 = 当前合同 JSON 文件路径

set -euo pipefail

CURRENT_CONTRACT="${1:-}"

if [ -z "$CURRENT_CONTRACT" ] || [ ! -f "$CURRENT_CONTRACT" ]; then
    echo "RESULT: WARN 未提供当前合同路径，跳过 file-lock-check"
    exit 2
fi

# 提取当前合同 ID 和 files_to_modify
CURRENT_ID=""
CURRENT_FILES=""

if command -v jq &>/dev/null; then
    CURRENT_ID=$(jq -r '.task_id // "unknown"' "$CURRENT_CONTRACT")
    CURRENT_FILES=$(jq -r '.files_to_modify[]' "$CURRENT_CONTRACT" 2>/dev/null || true)
else
    CURRENT_ID=$(grep -o '"task_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$CURRENT_CONTRACT" 2>/dev/null | head -1 | sed 's/.*"task_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "unknown")
    CURRENT_FILES=$(grep -o '"files_to_modify"[[:space:]]*:[[:space:]]*\[[^]]*\]' "$CURRENT_CONTRACT" 2>/dev/null | grep -o '"[^"]*"' | grep -v 'files_to_modify' || true)
fi

if [ -z "$CURRENT_FILES" ]; then
    echo "RESULT: WARN 无法解析当前合同 files_to_modify，跳过 file-lock-check"
    exit 2
fi

# 扫描所有 active 合同（排除当前合同）
CONFLICTS=""
CONTRACTS_DIR=".opencode/contracts"

for CONTRACT_FILE in $(find "$CONTRACTS_DIR" -name '*.json' ! -name 'contract-schema.json' 2>/dev/null); do
    # 跳过当前合同自身
    [ "$CONTRACT_FILE" = "$CURRENT_CONTRACT" ] && continue

    CONTRACT_STATUS=""
    CONTRACT_TASK_ID=""
    CONTRACT_FILES=""

    if command -v jq &>/dev/null; then
        CONTRACT_STATUS=$(jq -r '.status // "unknown"' "$CONTRACT_FILE")
        CONTRACT_TASK_ID=$(jq -r '.task_id // "unknown"' "$CONTRACT_FILE")
        CONTRACT_FILES=$(jq -r '.files_to_modify[]' "$CONTRACT_FILE" 2>/dev/null || true)
    else
        CONTRACT_STATUS=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONTRACT_FILE" 2>/dev/null | head -1 | sed 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "unknown")
        CONTRACT_TASK_ID=$(grep -o '"task_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONTRACT_FILE" 2>/dev/null | head -1 | sed 's/.*"task_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "unknown")
        CONTRACT_FILES=$(grep -o '"files_to_modify"[[:space:]]*:[[:space:]]*\[[^]]*\]' "$CONTRACT_FILE" 2>/dev/null | grep -o '"[^"]*"' | grep -v 'files_to_modify' || true)
    fi

    # 只检查 active 合同
    [ "$CONTRACT_STATUS" != "active" ] && continue

    # 逐文件检查重叠
    while IFS= read -r FILE; do
        [ -z "$FILE" ] && continue
        FILE="${FILE//\"/}"
        while IFS= read -r CURRENT_FILE; do
            CURRENT_FILE="${CURRENT_FILE//\"/}"
            if [ -n "$CURRENT_FILE" ] && [ "$CURRENT_FILE" = "$FILE" ]; then
                CONFLICTS="$CONFLICTS\n  文件 '$FILE' 被合同 $CONTRACT_TASK_ID 锁定"
            fi
        done <<< "$CURRENT_FILES"
    done <<< "$CONTRACT_FILES"
done

if [ -n "$CONFLICTS" ]; then
    echo -e "RESULT: BLOCK 文件锁冲突，以下文件已被其他活跃合同锁定:$CONFLICTS"
    exit 1
fi

echo "RESULT: PASS 文件锁检查通过，无冲突"
exit 0
