# R-16: 全链路 Trace ID
> 分组: 流程 | 严重: 强制

## 规则
Coordinator 接收用户任务后立即生成全局唯一的 trace_id（UUID v4 格式）。trace_id 贯穿 Plan → 合同 → Execute → Review → Build → Retro 全链路。所有子 Agent 的交接/审查/诊断/复盘报告必须携带同一 trace_id。

## 生成方式
使用 `/gen-uuid` 命令自动生成 32 位 UUID。

## 来源
contract-mechanism.md / P-02（原编号，已并入 R 体系）
