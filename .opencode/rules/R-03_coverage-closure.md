# R-03: 覆盖率闭环
> 分组: 合同 | 严重: 强制

## 规则
`coverage_checklist` 中每个功能点必须标注：
- `assert:描述` — 已测试且有断言
- `SKIP:原因` — 不可测试，已标注原因
不允许空白或 TODO。

## 来源
contract-mechanism.md / R-03
