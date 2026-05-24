# R-06: 完整工作流闭环
> 分组: 合同 | 严重: 强制

## 规则
每个任务必须按顺序走完完整工作流：Analyzer → Contract → Validate → (Plugin 自动拦截) → Execute → Review →（修复循环≤3）→ Build → Retro → Git。不可跳过任何阶段。Plugin（contract-enforcer/secret-leak-scan/dangerous-command-guard）在框架层自动拦截，无需 coordinator 手动调用。

## 违反后果
- 跳过 Analyzer → 合同无效
- 跳过 Review → 不得标记 completed
- 跳过 Retro → 禁止 Git 提交
- 连续 2 次违规 → 加载 crash-doctor skill 诊断，委派 retro 记录

## 来源
contract-mechanism.md / R-06
