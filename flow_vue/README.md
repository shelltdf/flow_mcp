# flow_mcp — 流程图 SDI（Vue）

单窗口（SDI）流程图编辑壳：上方左侧为**预览**，上方右侧为**节点库**，下方为**编辑区**。工程文档位于仓库根目录 `ai-software-engineering/`，本目录 `flow_vue/` 为 Vue 实现（与文档目录分离）。

## 快速开始

在 **`flow_vue/`** 下：

```bash
npm install
python dev.py
```

或在仓库根目录：

```bash
python flow_vue/dev.py
```

浏览器打开终端提示的本地 URL（通常为 `http://localhost:5173`）。

## 工程脚本

| 脚本 | 说明 |
|------|------|
| `python dev.py` | 开发服务器 |
| `python build.py` | 构建到 `dist/` |
| `python test.py` | 运行 smoke 测试 |
| `python run.py` | 预览 `dist/`（需先构建） |
| `python publish.py` | 同构建，产出可分发静态文件 |

## 文档与合规

- 四阶段文档：`ai-software-engineering/`
- 第三方许可证：仓库根目录 `THIRD_PARTY_LICENSES.md`（与 `flow_vue/package.json` 生产依赖对应）
