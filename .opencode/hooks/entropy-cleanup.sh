#!/bin/bash
# entropy-cleanup.sh — 工作区清理（post_task 钩子）
# 用途：清理过期合同、临时文件、孤立 PID 文件
# 协议：RESULT: PASS/BLOCK/WARN
# 用法：bash entropy-cleanup.sh [--dry-run] [--retention-days=7]

set -euo pipefail

DRY_RUN=false
RETENTION_DAYS=7

# 解析参数
for arg in "$@"; do
    case "$arg" in
        --dry-run)
            DRY_RUN=true
            ;;
        --retention-days=*)
            RETENTION_DAYS="${arg#*=}"
            ;;
    esac
done

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/.opencode/contracts"
TMP_DIR="$PROJECT_ROOT/.opencode/tmp"
CLEANED_COUNT=0
WARN_COUNT=0

# ================================================================
# 1. 清理过期合同（仅非 active 状态 + 超过保留期的）
# ================================================================
cleanup_contracts() {
    if [ ! -d "$CONTRACTS_DIR" ]; then
        return
    fi
    
    local now
    now=$(date +%s)
    local cutoff=$((now - RETENTION_DAYS * 86400))
    
    while IFS= read -r -d '' contract_file; do
        # 跳过 schema 文件
        [[ "$(basename "$contract_file")" == "contract-schema.json" ]] && continue
        
        local status
        status=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' "$contract_file" 2>/dev/null | head -1 | sed 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
        
        # 只清理非 active 的合同
        [[ "$status" == "active" ]] && continue
        
        local timestamp
        timestamp=$(grep -o '"timestamp"[[:space:]]*:[[:space:]]*[0-9]*' "$contract_file" 2>/dev/null | grep -o '[0-9]*' || echo "0")
        
        if [ "$timestamp" -lt "$cutoff" ]; then
            if $DRY_RUN; then
                echo "[DRY RUN] 将删除过期合同: $(basename "$contract_file") ($(( (now - timestamp) / 86400 )) 天前)"
            else
                rm -f "$contract_file"
                echo "[CLEANUP] 已删除过期合同: $(basename "$contract_file")"
            fi
            CLEANED_COUNT=$((CLEANED_COUNT + 1))
        fi
    done < <(find "$CONTRACTS_DIR" -name '*.json' -print0 2>/dev/null)
}

# ================================================================
# 2. 清理 .opencode/tmp/ 临时文件
# ================================================================
cleanup_temp_files() {
    if [ ! -d "$TMP_DIR" ]; then
        return
    fi
    
    local now
    now=$(date +%s)
    # 临时文件保留 24 小时
    local cutoff=$((now - 86400))
    
    while IFS= read -r -d '' tmp_file; do
        local mtime
        mtime=$(stat -c %Y "$tmp_file" 2>/dev/null || stat -f %m "$tmp_file" 2>/dev/null | cut -d. -f1 || echo "$now")
        
        if [ "$mtime" -lt "$cutoff" ]; then
            if $DRY_RUN; then
                echo "[DRY RUN] 将删除过期临时文件: ${tmp_file#$PROJECT_ROOT/}"
            else
                rm -f "$tmp_file"
                echo "[CLEANUP] 已删除过期临时文件: ${tmp_file#$PROJECT_ROOT/}"
            fi
            CLEANED_COUNT=$((CLEANED_COUNT + 1))
        fi
    done < <(find "$TMP_DIR" -type f -print0 2>/dev/null)
}

# ================================================================
# 3. 清理孤立 PID 文件（对应进程已不存在）
# ================================================================
cleanup_orphan_pids() {
    if [ ! -d "$TMP_DIR" ]; then
        return
    fi
    
    while IFS= read -r -d '' pid_file; do
        local pid
        pid=$(cat "$pid_file" 2>/dev/null || echo "")
        
        if [ -z "$pid" ]; then
            if $DRY_RUN; then
                echo "[DRY RUN] 将删除空 PID 文件: ${pid_file#$PROJECT_ROOT/}"
            else
                rm -f "$pid_file"
            fi
            CLEANED_COUNT=$((CLEANED_COUNT + 1))
            continue
        fi
        
        # 检查进程是否存在
        if ! kill -0 "$pid" 2>/dev/null; then
            if $DRY_RUN; then
                echo "[DRY RUN] 将删除孤立 PID 文件: ${pid_file#$PROJECT_ROOT/} (PID $pid 已不存在)"
            else
                rm -f "$pid_file"
                echo "[CLEANUP] 已删除孤立 PID 文件: ${pid_file#$PROJECT_ROOT/} (PID $pid)"
            fi
            CLEANED_COUNT=$((CLEANED_COUNT + 1))
        fi
    done < <(find "$TMP_DIR" -name '*.pid' -print0 2>/dev/null)
}

# ================================================================
# 执行清理
# ================================================================
cleanup_contracts
cleanup_temp_files
cleanup_orphan_pids

# ================================================================
# 输出结果
# ================================================================
if $DRY_RUN; then
    echo "RESULT: PASS 干运行模式完成，将清理 $CLEANED_COUNT 个过期文件"
elif [ "$CLEANED_COUNT" -gt 0 ]; then
    echo "RESULT: PASS 清理完成，共清理 $CLEANED_COUNT 个过期文件"
else
    echo "RESULT: PASS 无需清理"
fi

exit 0
