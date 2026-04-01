<script setup lang="ts">
import { computed, reactive } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import { useFlowchart } from '@/stores/flowchart'
import NodeLibraryGlyph from '@/components/NodeLibraryGlyph.vue'

const { state: settings } = useAppSettings()
const { addNode } = useFlowchart()

const t = computed(() => messages[settings.locale])

type NodeKind =
  | 'container'
  | 'process'
  | 'decision'
  | 'terminal'
  | 'var-string'
  | 'var-int'
  | 'var-float'
  | 'var-vector'
  | 'var-matrix'
  | 'var-table'
  | 'var-list'
  | 'for-node'
  | 'type-convert'
  | 'script-node'

const groupKeys = [
  'container',
  'process',
  'logic',
  'convert',
  'script',
  'variable',
] as const

const expanded = reactive(
  Object.fromEntries(groupKeys.map((k) => [k, true])) as Record<(typeof groupKeys)[number], boolean>,
)

function labelFor(kind: NodeKind): string {
  const m: Record<NodeKind, string> = {
    container: t.value.addContainer,
    process: t.value.addProcess,
    decision: t.value.addDecision,
    terminal: t.value.addTerminal,
    'var-string': t.value.addVarString,
    'var-int': t.value.addVarInt,
    'var-float': t.value.addVarFloat,
    'var-vector': t.value.addVarVector,
    'var-matrix': t.value.addVarMatrix,
    'var-table': t.value.addVarTable,
    'var-list': t.value.addVarList,
    'for-node': t.value.addForNode,
    'type-convert': t.value.addTypeConvert,
    'script-node': t.value.addScriptNode,
  }
  return m[kind]
}

function add(kind: NodeKind) {
  addNode(kind, labelFor(kind))
}

function toggleGroup(key: (typeof groupKeys)[number]) {
  expanded[key] = !expanded[key]
}
</script>

<template>
  <section id="node-library-panel" class="panel" aria-label="node library">
    <h2 class="title">{{ t.nodeLibrary }}</h2>

    <div class="groups" role="list">
      <div class="group" role="listitem">
        <button type="button" class="group-head" @click="toggleGroup('container')">
          <span class="chev">{{ expanded.container ? '▼' : '▶' }}</span>
          <span>{{ t.libGroupContainer }}</span>
        </button>
        <div v-show="expanded.container" class="group-body">
          <button type="button" class="node-tile" :title="t.addContainer" @click="add('container')">
            <NodeLibraryGlyph type="container" />
            <span class="tile-lbl">{{ t.addContainer }}</span>
          </button>
        </div>
      </div>

      <div class="group" role="listitem">
        <button type="button" class="group-head" @click="toggleGroup('process')">
          <span class="chev">{{ expanded.process ? '▼' : '▶' }}</span>
          <span>{{ t.libGroupProcess }}</span>
        </button>
        <div v-show="expanded.process" class="group-body">
          <button type="button" class="node-tile" :title="t.addProcess" @click="add('process')">
            <NodeLibraryGlyph type="process" />
            <span class="tile-lbl">{{ t.addProcess }}</span>
          </button>
        </div>
      </div>

      <div class="group" role="listitem">
        <button type="button" class="group-head" @click="toggleGroup('logic')">
          <span class="chev">{{ expanded.logic ? '▼' : '▶' }}</span>
          <span>{{ t.libGroupLogic }}</span>
        </button>
        <div v-show="expanded.logic" class="group-body group-body--multi">
          <button type="button" class="node-tile" :title="t.addDecision" @click="add('decision')">
            <NodeLibraryGlyph type="decision" />
            <span class="tile-lbl">{{ t.addDecision }}</span>
          </button>
          <button type="button" class="node-tile" :title="t.addForNode" @click="add('for-node')">
            <NodeLibraryGlyph type="for-node" />
            <span class="tile-lbl">{{ t.addForNode }}</span>
          </button>
          <button type="button" class="node-tile" :title="t.addTerminal" @click="add('terminal')">
            <NodeLibraryGlyph type="terminal" />
            <span class="tile-lbl">{{ t.addTerminal }}</span>
          </button>
        </div>
      </div>

      <div class="group" role="listitem">
        <button type="button" class="group-head" @click="toggleGroup('convert')">
          <span class="chev">{{ expanded.convert ? '▼' : '▶' }}</span>
          <span>{{ t.libGroupConvert }}</span>
        </button>
        <div v-show="expanded.convert" class="group-body">
          <button type="button" class="node-tile" :title="t.addTypeConvert" @click="add('type-convert')">
            <NodeLibraryGlyph type="type-convert" />
            <span class="tile-lbl">{{ t.addTypeConvert }}</span>
          </button>
        </div>
      </div>

      <div class="group" role="listitem">
        <button type="button" class="group-head" @click="toggleGroup('script')">
          <span class="chev">{{ expanded.script ? '▼' : '▶' }}</span>
          <span>{{ t.libGroupScript }}</span>
        </button>
        <div v-show="expanded.script" class="group-body">
          <button type="button" class="node-tile" :title="t.addScriptNode" @click="add('script-node')">
            <NodeLibraryGlyph type="script-node" />
            <span class="tile-lbl">{{ t.addScriptNode }}</span>
          </button>
        </div>
      </div>

      <div class="group" role="listitem">
        <button type="button" class="group-head" @click="toggleGroup('variable')">
          <span class="chev">{{ expanded.variable ? '▼' : '▶' }}</span>
          <span>{{ t.libGroupVariable }}</span>
        </button>
        <div v-show="expanded.variable" class="group-body group-body--multi">
          <button type="button" class="node-tile" @click="add('var-string')">
            <NodeLibraryGlyph type="var-string" />
            <span class="tile-lbl">{{ t.addVarString }}</span>
          </button>
          <button type="button" class="node-tile" @click="add('var-int')">
            <NodeLibraryGlyph type="var-int" />
            <span class="tile-lbl">{{ t.addVarInt }}</span>
          </button>
          <button type="button" class="node-tile" @click="add('var-float')">
            <NodeLibraryGlyph type="var-float" />
            <span class="tile-lbl">{{ t.addVarFloat }}</span>
          </button>
          <button type="button" class="node-tile" @click="add('var-vector')">
            <NodeLibraryGlyph type="var-vector" />
            <span class="tile-lbl">{{ t.addVarVector }}</span>
          </button>
          <button type="button" class="node-tile" @click="add('var-matrix')">
            <NodeLibraryGlyph type="var-matrix" />
            <span class="tile-lbl">{{ t.addVarMatrix }}</span>
          </button>
          <button type="button" class="node-tile" @click="add('var-table')">
            <NodeLibraryGlyph type="var-table" />
            <span class="tile-lbl">{{ t.addVarTable }}</span>
          </button>
          <button type="button" class="node-tile" @click="add('var-list')">
            <NodeLibraryGlyph type="var-list" />
            <span class="tile-lbl">{{ t.addVarList }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--surface);
  min-height: 0;
  height: 100%;
  overflow: auto;
}
.title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  flex-shrink: 0;
}
.groups {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.group {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  overflow: hidden;
}
.group-head {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  margin: 0;
  padding: 0.35rem 0.45rem;
  border: none;
  background: var(--surface);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
  text-align: left;
  cursor: pointer;
}
.group-head:hover {
  background: var(--bg);
  color: var(--text);
}
.chev {
  font-size: 9px;
  width: 1rem;
  flex-shrink: 0;
}
.group-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.35rem 0.45rem 0.5rem;
  border-top: 1px solid var(--border);
}
.group-body--multi {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.35rem;
}
.node-tile {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.25rem;
  padding: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  cursor: default;
  text-align: center;
}
.node-tile:hover {
  border-color: var(--accent);
}
.tile-lbl {
  font-size: 0.72rem;
  line-height: 1.2;
  color: var(--muted);
}
</style>
