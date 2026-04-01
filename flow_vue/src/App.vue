<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import MenuBar from '@/components/MenuBar.vue'
import EditorToolbar from '@/components/EditorToolbar.vue'
import type { RunPhase } from '@/components/EditorToolbar.vue'
import PreviewPanel from '@/components/PreviewPanel.vue'
import NodeLibraryPanel from '@/components/NodeLibraryPanel.vue'
import FlowchartEditor from '@/components/FlowchartEditor.vue'
import NodePropertiesDock from '@/components/NodePropertiesDock.vue'
import AppStatusBar from '@/components/AppStatusBar.vue'
import LogDialog from '@/components/LogDialog.vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import { useFlowchart } from '@/stores/flowchart'
import { log } from '@/stores/appLog'
import { usePanelSplitters } from '@/composables/usePanelSplitters'
import { useFlowchartFiles } from '@/composables/useFlowchartFiles'
import { useDockResize } from '@/composables/useDockResize'

const SPLITTER_PX = 4

const { state: settings } = useAppSettings()
const fc = useFlowchart()
const {
  openInputRef,
  fileNew,
  fileOpen,
  onOpenFileChange,
  fileSave,
  fileSaveAs,
} = useFlowchartFiles(() => settings.locale)

const t = computed(() => messages[settings.locale])
const logOpen = ref(false)

const shellRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)
const { upperPx, startHorizontal } = usePanelSplitters(mainRef, {
  initialUpperPx: 220,
  initialLeftPx: 360,
  minUpper: 96,
  minLower: 140,
  minLeft: 120,
  minRight: 120,
  splitterSize: SPLITTER_PX,
})

const libraryWidthPx = ref(240)

function startLibraryResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startW = libraryWidthPx.value
  function move(ev: MouseEvent) {
    const dx = ev.clientX - startX
    libraryWidthPx.value = Math.max(160, Math.min(560, startW + dx))
  }
  function up() {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

const runPhase = ref<RunPhase>('idle')

function onToolbarRun() {
  runPhase.value = 'running'
  log('info', 'toolbar: run')
}

function onToolbarPause() {
  runPhase.value = 'paused'
  log('info', 'toolbar: pause')
}

function onToolbarStop() {
  runPhase.value = 'idle'
  log('info', 'toolbar: stop')
}

const dockCollapsed = ref(false)
const dockMaximized = ref(false)
const dockWidthPx = ref(280)

const dockPanelWidth = computed(() => {
  if (dockCollapsed.value) return 0
  if (dockMaximized.value && shellRef.value) {
    return Math.min(Math.floor(shellRef.value.clientWidth * 0.48), 640)
  }
  return dockWidthPx.value
})

const { start: startDockResize } = useDockResize(dockWidthPx, {
  min: 200,
  getMax: () => {
    if (!shellRef.value) return 560
    return Math.min(560, Math.floor(shellRef.value.clientWidth * 0.5))
  },
})

function onDockCollapse() {
  dockCollapsed.value = true
}

function toggleDockEdge() {
  dockCollapsed.value = !dockCollapsed.value
  if (!dockCollapsed.value) {
    dockMaximized.value = false
  }
}

function onDockToggleMaximize() {
  dockMaximized.value = !dockMaximized.value
}

let workspaceSized = false

function layoutInitialSizes() {
  const el = mainRef.value
  if (!el) return
  const w = el.clientWidth
  const h = el.clientHeight
  const innerW = Math.max(0, w - SPLITTER_PX)
  if (!workspaceSized) {
    workspaceSized = true
  }
  const maxU = Math.max(96, h - 140 - SPLITTER_PX)
  upperPx.value = Math.min(Math.max(96, upperPx.value), maxU)
}

onMounted(() => {
  log('info', 'app mounted')
  fc.newDocument(settings.locale === 'zh' ? '未命名.flow.json' : 'Untitled.flow.json')
  nextTick(() => {
    layoutInitialSizes()
  })
  window.addEventListener('resize', layoutInitialSizes)
})

onUnmounted(() => {
  window.removeEventListener('resize', layoutInitialSizes)
})

function openLog() {
  logOpen.value = true
}

function closeLog() {
  logOpen.value = false
}
</script>

<template>
  <div class="app-root">
    <input
      ref="openInputRef"
      type="file"
      class="sr-only"
      accept=".json,application/json"
      aria-hidden="true"
      tabindex="-1"
      @change="onOpenFileChange"
    />
    <MenuBar
      :document-title="fc.fileMeta.displayName"
      @file-new="fileNew"
      @file-open="fileOpen"
      @file-save="fileSave"
      @file-save-as="fileSaveAs"
    />
    <EditorToolbar
      :phase="runPhase"
      @run="onToolbarRun"
      @pause="onToolbarPause"
      @stop="onToolbarStop"
    />
    <main ref="shellRef" class="workspace-shell">
      <div class="lib-dock" :style="{ width: libraryWidthPx + 'px' }">
        <NodeLibraryPanel />
      </div>
      <div
        class="splitter splitter-v"
        role="separator"
        :aria-label="t.splitterLibrary"
        @mousedown="startLibraryResize"
      />
      <div ref="mainRef" class="workspace-main">
        <div class="upper" :style="{ height: upperPx + 'px' }">
          <PreviewPanel />
        </div>
        <div
          class="splitter splitter-h"
          role="separator"
          :aria-label="t.splitterHorizontal"
          @mousedown="startHorizontal"
        />
        <div class="lower">
          <FlowchartEditor />
        </div>
      </div>

      <template v-if="!dockCollapsed">
        <div
          class="splitter splitter-v splitter-dock"
          role="separator"
          :aria-label="t.splitterDock"
          @mousedown="startDockResize"
        />
        <div
          class="dock-display"
          :style="{ width: dockPanelWidth + 'px', minWidth: dockMaximized ? '200px' : undefined }"
        >
          <NodePropertiesDock
            :maximized="dockMaximized"
            @collapse="onDockCollapse"
            @toggle-maximize="onDockToggleMaximize"
          />
        </div>
      </template>

      <div class="dock-edge" aria-label="dock edge">
        <button type="button" class="edge-btn" :title="dockCollapsed ? t.dockExpand : t.dockCollapse" @click="toggleDockEdge">
          {{ dockCollapsed ? '◀' : '▶' }}
        </button>
        <span class="edge-lbl">{{ t.dockTitleShort }}</span>
      </div>
    </main>
    <AppStatusBar :on-open-log="openLog" />
    <LogDialog :open="logOpen" @close="closeLog" />
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  background: var(--bg);
}

.workspace-shell {
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  min-height: 0;
  padding: 0;
  margin: 0;
  border: 1px solid var(--win-frame-border);
  border-top: none;
  background: var(--surface);
}

.lib-dock {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--border);
  background: var(--surface);
}

.workspace-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.upper {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.splitter {
  flex-shrink: 0;
  background: var(--win-splitter);
  z-index: 2;
}

.splitter-v {
  width: 4px;
  cursor: col-resize;
  border-left: 1px solid var(--win-menu-border);
  border-right: 1px solid var(--win-menu-border);
}

.splitter-v:hover {
  background: var(--win-splitter-hover);
}

.splitter-h {
  height: 4px;
  cursor: row-resize;
  border-top: 1px solid var(--win-menu-border);
  border-bottom: 1px solid var(--win-menu-border);
}

.splitter-h:hover {
  background: var(--win-splitter-hover);
}

.lower {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dock-display {
  flex-shrink: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dock-edge {
  width: 26px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  border-left: 1px solid var(--border);
  background: var(--bg);
  gap: 8px;
}

.edge-btn {
  width: 22px;
  padding: 2px 0;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text);
  font-size: 11px;
  line-height: 1.2;
  cursor: default;
}

.edge-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.edge-lbl {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 10px;
  color: var(--muted);
  user-select: none;
  letter-spacing: 0.06em;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
