# R-14: 自动修复循环
> 分组: 流程 | 严重: 强制

## 规则
code-reviewer 审查发现问题时，Coordinator 委派 Analyzer 分析修复方案，基于修复计划生成 fix_contract 并重派 task-executor 修复。最多重试 3 次，超过则升级为失败，加载 crash-doctor skill 诊断，委派 retro 记录。每次修复决策由 Analyzer 的分析结果驱动。

## 来源
contract-mechanism.md / R-14 (原编号)
