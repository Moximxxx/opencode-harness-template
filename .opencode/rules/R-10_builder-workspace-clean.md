# R-10: Builder 构建前工作区洁净检查
> 分组: Agent | 严重: 强制

## 规则
Builder 在执行构建前必须检查工作区是否洁净：`git status --porcelain` 应无未提交的源码变更。修改源码后需要构建/部署时，必须调用 Builder。

## 来源
agent-system.md / R-10 (原编号)
