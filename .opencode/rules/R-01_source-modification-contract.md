# R-01: 源码修改前必须先有合同
> 分组: 合同 | 严重: 强制

## 规则
Edit/Write 操作前必须通过 `contract-enforcer` Plugin 门禁（位于 `.opencode/plugins/`）：无有效合同→拦截，合同过期(>30min)→拦截，文件不在 files_to_modify 中→拦截，文件被其他活跃合同锁定→拦截。

## 门禁
Plugin 自动拦截，无需手动调用。原 Shell hook `coordinator-guard.sh` 已迁移为 Plugin。

## 来源
contract-mechanism.md / R-01
