# R-15: Hook/Plugin 实现一致性
> 分组: 流程 | 严重: 强制

## 规则
contract-mechanism.md「Hook 目录」中声明的每个 Shell hook 必须有对应的 `.opencode/hooks/{name}.sh` 脚本实现。Plugin 区块声明的每个 Plugin 必须有对应的 `.opencode/plugins/{name}.ts` 文件实现。尚未实现的必须在文档中显式标注「(未实现)」，禁止在合同的 hooks 数组中引用未实现的 hook。

## 来源
contract-mechanism.md / R-15
