# 模型与源码映射（初版）

实现子项目根目录为 **`flow_vue/`**；下表路径均相对该目录。

| 元素 | 路径 |
|------|------|
| 应用入口 | `src/main.ts` |
| 根布局 / 分割条 | `src/App.vue`、`src/composables/usePanelSplitters.ts` |
| Windows 风格菜单与标题栏 | `src/components/MenuBar.vue` |
| 节点属性 Dock | `src/components/NodePropertiesDock.vue` |
| 右侧 Dock 分割拖动 | `src/composables/useDockResize.ts` |
| 预览区 | `src/components/PreviewPanel.vue` |
| 节点库 | `src/components/NodeLibraryPanel.vue` |
| 编辑区 | `src/components/FlowchartEditor.vue` |
| 状态栏 / Log | `src/components/AppStatusBar.vue`、`src/components/LogDialog.vue` |
| 流程图状态 | `src/stores/flowchart.ts`（Composable 亦可） |
