# 开发维护说明书

## 仓库结构

| 路径 | 说明 |
|------|------|
| `ai-software-engineering/` | 四阶段工程文档（与实现分离） |
| `flow_vue/` | Vue + Vite 实现子项目 |
| `flow_vue/src/` | Vue 源码 |
| `flow_vue/package.json` | npm 依赖与脚本 |
| `flow_vue/vite.config.ts` | Vite 配置 |
| `flow_vue/build.py` 等 | 工程操作入口（封装 npm；可从仓库根执行 `python flow_vue/dev.py`） |
| `flow_vue/src/stores/nodeConsole.ts` | 底部 **输出** 区文本：`consolePrint`、`consoleClear`、`consoleTextPlain`（与 `appLog` 诊断日志分离） |
| `flow_vue/src/composables/useFullscreen.ts` | 浏览器全屏状态与 `toggle` |
| `flow_vue/src/components/OutputConsoleDock.vue` | 底部输出 Dock UI |

## 环境

- Node.js 18+（建议 LTS）
- npm 或兼容客户端

## 依赖安装

```bash
cd flow_vue
npm install
```

## 常用命令

| 操作 | 命令 |
|------|------|
| 开发服务器 | 在 `flow_vue/` 下 `python dev.py` / `npm run dev`，或根目录 `python flow_vue/dev.py` |
| 构建 | `python build.py` 或 `npm run build`（工作目录 `flow_vue/`） |
| 预览构建结果 | `python run.py` 或 `npm run preview`（工作目录 `flow_vue/`） |
| 测试 | `python test.py`（工作目录 `flow_vue/`） |
| 发布目录 | `python publish.py`（输出 `flow_vue/dist/`） |

## 全屏与快捷键

- 工具栏 **全屏** 使用 Fullscreen API（`document.documentElement`）。
- 全局 **Ctrl+空格**（在可编辑输入框外）切换全屏；实现见 `App.vue` 中 `keydown` 监听。

## 节点向输出区写信息

```ts
import { consolePrint, consoleClear } from '@/stores/nodeConsole'

consolePrint('一行输出')
consolePrint('多行\n输出')
```

## 文档同步

修改功能或对外行为时，按 `.cursor/rules/sync-and-mapping.mdc` 回写 `ai-software-engineering/` 相应阶段。

## License 汇总

第三方运行时依赖见仓库根目录 `THIRD_PARTY_LICENSES.md`（与 `flow_vue/package.json` 生产依赖对应）。
