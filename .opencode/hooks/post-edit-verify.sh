#!/bin/bash
# post-edit-verify.sh — 后置文件存在性验证 Hook
# 用法: bash post-edit-verify.sh [contract_file]
# 检查 files_to_modify 中的文件在任务执行后是否已存在
# 协议: RESULT: PASS/BLOCK/WARN

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/../contracts"

if [ -n "${1:-}" ]; then
    CONTRACT_FILE="$1"
else
    CONTRACT_FILE=$(find "$CONTRACTS_DIR" -name "*.json" ! -name "contract-schema.json" -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
fi

if [ -z "$CONTRACT_FILE" ] || [ ! -f "$CONTRACT_FILE" ]; then
    echo "RESULT: WARN 未找到有效合同文件用于后置验证"
    exit 2
fi

# 解析合同获取 files_to_modify 和项目根目录
# contractDir: .opencode/contracts/YYYYMMDD → projectRoot: 项目根
CONTRACT_DIR="$(dirname "$CONTRACT_FILE")"
PROJECT_ROOT="$(cd "$CONTRACT_DIR/../.." && pwd)"

node -e "
var fs = require('fs');
var path = require('path');

var contract = JSON.parse(fs.readFileSync('$CONTRACT_FILE', 'utf8'));
var projectRoot = '$PROJECT_ROOT';
var taskId = contract.task_id || 'unknown';
var files = contract.files_to_modify || [];

if (files.length === 0) {
    console.log('RESULT: PASS 合同 ' + taskId + ' 无 files_to_modify（只读 Agent 合同）');
    process.exit(0);
}

var missing = [];
files.forEach(function(f) {
    var fullPath = path.join(projectRoot, f);
    if (!fs.existsSync(fullPath)) {
        missing.push(f);
    }
});

if (missing.length === 0) {
    console.log('RESULT: PASS 所有文件已就位: ' + files.join(', '));
    process.exit(0);
} else {
    console.log('RESULT: WARN 以下文件缺失: ' + missing.join(', '));
    console.log('  提示: 若为新建文件任务，请确认 task-executor 已正确创建文件');
    process.exit(2);
}
"
exit $?
