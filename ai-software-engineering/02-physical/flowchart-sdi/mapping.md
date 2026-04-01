# 模型与源码映射（初版）

实现子项目根目录为 **`flow_vue/`**；下表路径均相对该目录。

| 元素 | 路径 |
|------|------|
| 应用入口 | `src/main.ts` |
| 根布局、工作区栈、底部输出 Dock、全屏与快捷键 | `src/App.vue` |
| 分割条（预览/编辑、库宽、属性区宽） | `src/composables/usePanelSplitters.ts`、`src/composables/useDockResize.ts` |
| 浏览器全屏封装 | `src/composables/useFullscreen.ts` |
| Windows 风格菜单与标题栏 | `src/components/MenuBar.vue` |
| 工具栏（运行控制、全屏） | `src/components/EditorToolbar.vue` |
| 节点属性 Dock | `src/components/NodePropertiesDock.vue` |
| 底部输出 Dock | `src/components/OutputConsoleDock.vue` |
| 预览区 | `src/components/PreviewPanel.vue` |
| 节点库 | `src/components/NodeLibraryPanel.vue` |
| 编辑区 | `src/components/FlowchartEditor.vue` |
| 状态栏 / Log | `src/components/AppStatusBar.vue`、`src/components/LogDialog.vue` |
| 流程图状态 | `src/stores/flowchart.ts` |
| 节点/运行时输出文本 | `src/stores/nodeConsole.ts`（`consolePrint` 等） |
| 应用诊断日志 | `src/stores/appLog.ts` |
| 全局样式（字号、行高） | `src/style.css` |
