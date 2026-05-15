# R-06: 完整工作流闭环
> 分组: 合同 | 严重: 强制

## 规则
每个任务必须按顺序走完完整工作流：Plan → Contract → Validate → Hooks → Execute → Review →（修复循环≤3）→ Build → Retro → Git。不可跳过任何阶段。

## 违反后果
- 跳过 Plan → 合同无效
- 跳过 Review → 不得标记 completed
- 跳过 Retro → 禁止 Git 提交
- 连续 2 次违规 → 委派 crash-doctor 诊断

## 来源
contract-mechanism.md / R-06
