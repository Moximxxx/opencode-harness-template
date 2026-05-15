#!/bin/bash
# git-diff-analyzer.sh — Git 变更分析
# 分析 git diff 提取变更文件并分类

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

if ! git rev-parse --git-dir &>/dev/null; then
    echo "ERROR: not a git repository"
    exit 1
fi

BASE="${1:-HEAD}"

echo "变更分析 (base: $BASE)"
echo "------------------------"

# 变更统计
git diff --numstat "$BASE" 2>/dev/null | awk '
{
    additions += $1
    deletions += $2
    files++
}
END {
    print "文件数: " files
    print "新增: +" additions
    print "删除: -" deletions
}
'

echo ""
echo "变更文件:"

git diff --name-only "$BASE" 2>/dev/null | while read -r file; do
    ext="${file##*.}"
    case "$ext" in
        ts|tsx|js|jsx)
            echo "  [source] $file"
            ;;
        json|yaml|yml)
            echo "  [config] $file"
            ;;
        md|mdx)
            echo "  [docs]   $file"
            ;;
        css|scss)
            echo "  [style]  $file"
            ;;
        *)
            echo "  [other]  $file"
            ;;
    esac
done

exit 0
