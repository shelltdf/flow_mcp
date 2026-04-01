# flowchart-sdi 物理规格

## 运行环境

- 现代浏览器（ES Module）；开发态 Node.js 用于 Vite。

## 布局 DOM 映射（初版）

| 区域 | 建议容器 id / 类 | 行为 |
|------|------------------|------|
| 上条带左：预览 | `preview-panel` | 展示缩略预览 |
| 上条带右：节点库 | `node-library-panel` | 节点类型列表与添加 |
| 下：编辑 | `flowchart-editor` | 主编辑画布：SVG 2D 视图，`translate`+`scale` 视口变换；背景网格图案；过逻辑中心 `(EDITOR_W/2, EDITOR_H/2)` 的十字中心线（`vector-effect: non-scaling-stroke`）；中键拖动平移、滚轮缩放（指针处为缩放锚点） |

### 画布坐标

- 节点/边坐标仍为 **世界坐标**（与导出 JSON 一致），范围默认约束在 `0…EDITOR_W` × `0…EDITOR_H` 内；视口 **pan/zoom 仅影响显示**，不改变模型坐标。

### 文件（流程图 JSON）

| 操作 | 行为概要 |
|------|----------|
| **新建** | 清空 `nodes`/`edges`，重置未保存状态；文档名为本地化「未命名 / Untitled」+ `.flow.json`。 |
| **打开** | 解析 UTF-8 JSON，校验 `version === 1` 与节点/边形状后载入；若当前有未保存更改则先确认。 |
| **保存** | 序列化为与 `exportDocument` 相同结构；若存在 `FileSystemFileHandle` 则写入该句柄，否则触发「另存为」类行为。 |
| **另存为** | 优先 `showSaveFilePicker`；不支持时降级为提示文件名并触发下载。 |
| 状态栏 | `app-statusbar` | 摘要；点击打开 Log |
| Log 弹层 | `app-log-dialog` | 纯文本 + 复制全文 |

## 数据：导出 JSON

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | number | 当前为 `1` |
| `nodes` | array | 见下表 |
| `edges` | array | 见下表 |

**节点项**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一 |
| `type` | string | 与节点库类型 id 一致：`container`（容器）、`process`（流程）、`decision`（判断）、`terminal`（起止） |
| `x` | number | 画布坐标 |
| `y` | number | 画布坐标 |
| `label` | string | 可选 |

**边项**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一 |
| `source` | string | 节点 id |
| `target` | string | 节点 id |

## 错误与退出

- 浏览器 SPA 无进程退出码；控制台错误用于开发排障。

## 重要过程

1. **添加节点**：从节点库选择 → `nodes` 追加 → 预览更新。
2. **导出**：序列化当前模型为上述 JSON，触发浏览器下载或剪贴板（实现可选其一，初版下载）。
