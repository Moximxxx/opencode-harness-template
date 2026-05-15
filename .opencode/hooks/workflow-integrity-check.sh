#!/bin/bash
# workflow-integrity-check.sh — 工作流完整性验证
# 检查合同字段是否完整（trace_id/constraints/verification/coverage_checklist 非空）
# 协议: RESULT: PASS/WARN
# 作为 task-executor 的 pre_task 钩子

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/.opencode/contracts"

# 找到最新合同文件
CONTRACT_FILE=$(find "$CONTRACTS_DIR" -name "*.json" ! -name "contract-schema.json" -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
if [ -z "$CONTRACT_FILE" ]; then
    CONTRACT_FILE=$(find "$CONTRACTS_DIR" -name "*.json" ! -name "contract-schema.json" -print0 2>/dev/null | head -1 | tr -d '\0')
fi

if [ -z "$CONTRACT_FILE" ] || [ ! -f "$CONTRACT_FILE" ]; then
    echo "RESULT: WARN 未找到有效合同文件"
    exit 2
fi

ISSUES=0
TASK_ID=$(grep -o '"task_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONTRACT_FILE" 2>/dev/null | head -1 | sed 's/.*"task_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "unknown")

# 验证 trace_id
if ! grep -q '"trace_id"[[:space:]]*:[[:space:]]*"[a-f0-9]\{8\}-[a-f0-9]\{4\}-[a-f0-9]\{4\}-[a-f0-9]\{4\}-[a-f0-9]\{12\}"' "$CONTRACT_FILE"; then
    echo "[INTEGRITY] $TASK_ID: trace_id missing or not UUID format"
    ISSUES=$((ISSUES + 1))
fi

# 验证 constraints 非空数组
if ! grep -q '"constraints"[[:space:]]*:[[:space:]]*\[[[:space:]]*"[^"]' "$CONTRACT_FILE"; then
    echo "[INTEGRITY] $TASK_ID: constraints is empty"
    ISSUES=$((ISSUES + 1))
fi

# 验证 verification 非空数组
if ! grep -q '"verification"[[:space:]]*:[[:space:]]*\[[[:space:]]*"[^"]' "$CONTRACT_FILE"; then
    echo "[INTEGRITY] $TASK_ID: verification is empty"
    ISSUES=$((ISSUES + 1))
fi

# 验证 coverage_checklist 非空且有 assert 项
if grep -q '"coverage_checklist"[[:space:]]*:[[:space:]]*{' "$CONTRACT_FILE"; then
    CHECKLIST_LINES=$(grep -c '"assert:\|"SKIP:' "$CONTRACT_FILE" 2>/dev/null || echo "0")
    if [ "$CHECKLIST_LINES" -eq 0 ]; then
        echo "[INTEGRITY] $TASK_ID: coverage_checklist has no assert or SKIP entries"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo "[INTEGRITY] $TASK_ID: coverage_checklist missing"
    ISSUES=$((ISSUES + 1))
fi

if [ "$ISSUES" -gt 0 ]; then
    echo "RESULT: WARN $TASK_ID: $ISSUES integrity issue(s) found"
    exit 2
fi

echo "RESULT: PASS $TASK_ID: contract integrity verified"
exit 0
