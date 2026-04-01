# 系统设计

## 与子系统边界

```mermaid
flowchart LR
  subgraph shell [壳层与布局]
    L[上条带: 预览 | 节点库]
    E[下区: 编辑画布]
    S[状态栏与 Log]
  end
  subgraph core [流程图核心]
    M[文档模型]
    P[预览]
    N[节点库]
  end
  L --> M
  N --> M
  E --> M
  M --> P
```

## 与 `00-concept` 的一致性

- **SDI**：单会话单文档；布局与 `product-design.md` 一致。
- **程序间接口**：导出 JSON 见 `interface-design.md`，字段级见 `02-physical/flowchart-sdi/spec.md`。

## 与 `02-physical` 目标对应

| 物理目标 ID | 说明 |
|-------------|------|
| `flowchart-sdi` | 主 SPA；源码根为 `flow_vue/`（含 `src/` 等） |

## 与 `03-ops`

用户操作路径、开发与构建入口见运维文档。
