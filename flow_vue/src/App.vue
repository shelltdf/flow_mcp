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
import { useFullscreen } from '@/composables/useFullscreen'
import OutputConsoleDock from '@/components/OutputConsoleDock.vue'

const SPLITTER_PX = 4

const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

const consoleCollapsed = ref(true)
const consoleHeightPx = ref(160)

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

const libraryCollapsed = ref(false)
const libraryMaximized = ref(false)
const libraryWidthPx = ref(240)

const libraryPanelWidth = computed(() => {
  if (libraryCollapsed.value) return 0
  if (libraryMaximized.value && shellRef.value) {
    return Math.min(Math.floor(shellRef.value.clientWidth * 0.48), 640)
  }
  return libraryWidthPx.value
})

function startLibraryResize(e: MouseEvent) {
  e.preventDefault()
  libraryMaximized.value = false
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

function onLibraryCollapse() {
  libraryCollapsed.value = true
  libraryMaximized.value = false
}

function onLibraryToggleMaximize() {
  libraryMaximized.value = !libraryMaximized.value
}

function toggleLibraryEdge() {
  libraryCollapsed.value = !libraryCollapsed.value
  if (!libraryCollapsed.value) {
    libraryMaximized.value = false
  }
}

/** 全窗口聚焦：仅保留菜单栏、工具栏与当前面板；退出时恢复布局 */
type WorkspaceSnapshot = {
  upperPx: number
  libraryCollapsed: boolean
  libraryMaximized: boolean
  libraryWidthPx: number
  dockCollapsed: boolean
  dockMaximized: boolean
  dockWidthPx: number
}

const workspaceFocus = ref<'preview' | 'editor' | null>(null)
const workspaceSnapshot = ref<WorkspaceSnapshot | null>(null)

function saveWorkspaceSnapshot() {
  workspaceSnapshot.value = {
    upperPx: upperPx.value,
    libraryCollapsed: libraryCollapsed.value,
    libraryMaximized: libraryMaximized.value,
    libraryWidthPx: libraryWidthPx.value,
    dockCollapsed: dockCollapsed.value,
    dockMaximized: dockMaximized.value,
    dockWidthPx: dockWidthPx.value,
  }
}

function restoreWorkspaceSnapshot() {
  const s = workspaceSnapshot.value
  if (!s) return
  upperPx.value = s.upperPx
  libraryCollapsed.value = s.libraryCollapsed
  libraryMaximized.value = s.libraryMaximized
  libraryWidthPx.value = s.libraryWidthPx
  dockCollapsed.value = s.dockCollapsed
  dockMaximized.value = s.dockMaximized
  dockWidthPx.value = s.dockWidthPx
  workspaceSnapshot.value = null
}

function togglePreviewMaximize() {
  if (workspaceFocus.value === 'preview') {
    workspaceFocus.value = null
    restoreWorkspaceSnapshot()
    nextTick(() => layoutInitialSizes())
  } else {
    if (workspaceFocus.value === null) {
      saveWorkspaceSnapshot()
    }
    workspaceFocus.value = 'preview'
  }
}

function toggleEditorMaximize() {
  if (workspaceFocus.value === 'editor') {
    workspaceFocus.value = null
    restoreWorkspaceSnapshot()
    nextTick(() => layoutInitialSizes())
  } else {
    if (workspaceFocus.value === null) {
      saveWorkspaceSnapshot()
    }
    workspaceFocus.value = 'editor'
  }
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
  const h = el.clientHeight
  if (!workspaceSized) {
    workspaceSized = true
  }
  if (workspaceFocus.value !== null) return
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
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', layoutInitialSizes)
  window.removeEventListener('keydown', onGlobalKeydown)
})

function openLog() {
  logOpen.value = true
}

function closeLog() {
  logOpen.value = false
}

function startConsoleResize(e: MouseEvent) {
  e.preventDefault()
  const shell = shellRef.value
  if (!shell) return
  const startY = e.clientY
  const startH = consoleHeightPx.value
  function move(ev: MouseEvent) {
    const dy = ev.clientY - startY
    const next = startH - dy
    const max = Math.min(
      Math.floor(shell.clientHeight * 0.62),
      Math.floor(window.innerHeight * 0.55),
    )
    consoleHeightPx.value = Math.max(72, Math.min(max, next))
  }
  function up() {
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

function onGlobalKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  if (!el) return
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return
  if (e.code === 'Space' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    toggleFullscreen()
  }
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
      :is-fullscreen="isFullscreen"
      @run="onToolbarRun"
      @pause="onToolbarPause"
      @stop="onToolbarStop"
      @toggle-fullscreen="toggleFullscreen"
    />
    <div class="workspace-stack">
    <main ref="shellRef" class="workspace-shell">
      <template v-if="workspaceFocus === null">
        <div class="library-edge" aria-label="node library dock edge">
          <button
            type="button"
            class="edge-btn"
            :title="libraryCollapsed ? t.libraryExpand : t.dockCollapse"
            @click="toggleLibraryEdge"
          >
            {{ libraryCollapsed ? '▶' : '◀' }}
          </button>
          <span class="edge-lbl">{{ t.libraryTitleShort }}</span>
        </div>

        <template v-if="!libraryCollapsed">
          <div class="lib-dock" :style="{ width: libraryPanelWidth + 'px' }">
            <header class="lib-dock-head">
              <span class="lib-dock-title">{{ t.nodeLibrary }}</span>
              <span class="lib-dock-actions">
                <button type="button" class="dock-btn" :title="t.dockMaximize" @click="onLibraryToggleMaximize">
                  {{ libraryMaximized ? '⧉' : '▢' }}
                </button>
                <button type="button" class="dock-btn" :title="t.dockCollapse" @click="onLibraryCollapse">
                  {{ t.dockCollapseBtn }}
                </button>
              </span>
            </header>
            <div class="lib-dock-body">
              <NodeLibraryPanel />
            </div>
          </div>
          <div
            class="splitter splitter-v"
            role="separator"
            :aria-label="t.splitterLibrary"
            @mousedown="startLibraryResize"
          />
        </template>
      </template>

      <div
        ref="mainRef"
        class="workspace-main"
        :class="{ 'workspace-main--solo': workspaceFocus !== null }"
      >
        <template v-if="workspaceFocus === null">
          <div class="upper" :style="{ height: upperPx + 'px' }">
            <PreviewPanel
              :maximized="false"
              @toggle-maximize="togglePreviewMaximize"
            />
          </div>
          <div
            class="splitter splitter-h"
            role="separator"
            :aria-label="t.splitterHorizontal"
            @mousedown="startHorizontal"
          />
          <div class="lower">
            <FlowchartEditor
              :maximized="false"
              @toggle-maximize="toggleEditorMaximize"
            />
          </div>
        </template>
        <PreviewPanel
          v-else-if="workspaceFocus === 'preview'"
          :maximized="true"
          @toggle-maximize="togglePreviewMaximize"
        />
        <FlowchartEditor
          v-else
          :maximized="true"
          @toggle-maximize="toggleEditorMaximize"
        />
      </div>

      <template v-if="workspaceFocus === null">
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
      </template>
    </main>
    <template v-if="!consoleCollapsed">
      <div
        class="splitter splitter-h console-splitter"
        role="separator"
        :aria-label="t.consoleSplitter"
        @mousedown="startConsoleResize"
      />
      <OutputConsoleDock
        :style="{ height: consoleHeightPx + 'px' }"
        @collapse="consoleCollapsed = true"
      />
    </template>
    <div
      v-else
      class="console-collapsed-bar"
      role="button"
      tabindex="0"
      :title="t.consoleExpandBar"
      @click="consoleCollapsed = false"
      @keydown.enter.prevent="consoleCollapsed = false"
    >
      {{ t.consoleExpandBar }}
    </div>
    </div>
    <AppStatusBar v-if="workspaceFocus === null" :on-open-log="openLog" />
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

.workspace-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
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

.library-edge {
  width: 26px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  border-right: 1px solid var(--border);
  background: var(--bg);
  gap: 8px;
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

.lib-dock-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  font-size: 13px;
}

.lib-dock-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lib-dock-actions {
  display: flex;
  gap: 0.2rem;
  flex-shrink: 0;
}

.dock-btn {
  padding: 0.15rem 0.35rem;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  cursor: default;
}

.dock-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.lib-dock-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.workspace-main--solo {
  min-height: 0;
  overflow: hidden;
}

.workspace-main--solo > :deep(section) {
  flex: 1;
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

.console-splitter {
  cursor: row-resize;
}

.console-collapsed-bar {
  flex-shrink: 0;
  min-height: 26px;
  padding: 0 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--border);
  background: var(--bg);
  font-size: 13px;
  line-height: 1.35;
  font-weight: 500;
  color: var(--muted);
  cursor: default;
  user-select: none;
}

.console-collapsed-bar:hover {
  color: var(--accent);
  background: var(--surface);
}

.lower {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.lower > * {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
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
  font-size: 12px;
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
  font-size: 11px;
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
