# R-01: 源码修改前必须先有合同
> 分组: 合同 | 严重: 强制

## 规则
Edit/Write 操作前必须通过 `coordinator-guard.sh` 门禁：无有效合同→拦截，合同过期(>30min)→拦截，文件不在 files_to_modify 中→拦截。

## 门禁
`bash .opencode/hooks/coordinator-guard.sh <file_path>`

## 来源
contract-mechanism.md / R-01
