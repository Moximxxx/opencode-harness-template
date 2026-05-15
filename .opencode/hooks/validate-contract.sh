#!/bin/bash
# validate-contract.sh — 合同 JSON Schema 校验 Hook
# 用法: bash validate-contract.sh [contract_file]
#   不传参: 自动校验 contracts/ 下最新的 .json 合同
#   传参:   校验指定合同文件
# 协议: RESULT: PASS/BLOCK/WARN

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/../contracts"
SCHEMA_FILE="$CONTRACTS_DIR/contract-schema.json"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo "RESULT: BLOCK Schema 文件不存在: $SCHEMA_FILE"
    exit 1
fi

# 确定目标合同
if [ -n "${1:-}" ]; then
    CONTRACT_FILE="$1"
else
    # 优先按日期子目录查找
    CONTRACT_FILE=$(find "$CONTRACTS_DIR" -name "*.json" ! -name "contract-schema.json" -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
    if [ -z "$CONTRACT_FILE" ]; then
        CONTRACT_FILE=$(find "$CONTRACTS_DIR" -name "*.json" ! -name "contract-schema.json" -print0 2>/dev/null | head -1 | tr -d '\0')
    fi
fi

if [ -z "$CONTRACT_FILE" ] || [ ! -f "$CONTRACT_FILE" ]; then
    echo "RESULT: WARN 未找到有效合同文件"
    exit 2
fi

CONTRACT_NAME=$(basename "$CONTRACT_FILE")

# 使用 node + ajv 进行 JSON Schema 校验
node -e "
var Ajv = require('ajv');
var fs   = require('fs');
var path = require('path');

var schema   = JSON.parse(fs.readFileSync('$SCHEMA_FILE', 'utf8'));
var contract = JSON.parse(fs.readFileSync('$CONTRACT_FILE', 'utf8'));

var ajv = new Ajv({ allErrors: true });
var validate = ajv.compile(schema);
var valid = validate(contract);

var errors = [];
if (!valid) {
    validate.errors.forEach(function(e) {
        errors.push((e.instancePath || '/') + ': ' + e.message);
    });
}

// 自定义校验: 时效性 (30 分钟)
if (typeof contract.timestamp === 'number') {
    var age = Math.floor(Date.now() / 1000) - contract.timestamp;
    if (age > 1800) {
        errors.push('/timestamp: 合同已过期 (' + Math.floor(age/60) + ' 分钟前，超过 30 分钟上限)');
    }
}

// 自定义校验: 文件存在性
var contractDir = path.dirname('$CONTRACT_FILE');
var projectRoot = path.resolve(contractDir, '..', '..');
if (Array.isArray(contract.files_to_modify)) {
    contract.files_to_modify.forEach(function(f) {
        if (!fs.existsSync(path.join(projectRoot, f))) {
            errors.push('/files_to_modify/' + f + ': 文件不存在: ' + f);
        }
    });
}

if (errors.length === 0) {
    console.log('RESULT: PASS 合同验证通过: ' + (contract.task_id || 'unknown'));
    process.exit(0);
} else {
    console.log('RESULT: BLOCK 合同校验失败: ' + (contract.task_id || '(无 task_id)'));
    errors.forEach(function(e, i) {
        console.log('  ' + (i+1) + '. ' + e);
    });
    process.exit(1);
}
" 2>&1

exit $?
