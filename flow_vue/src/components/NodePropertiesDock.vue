<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import {
  useFlowchart,
  ROOT_GROUP_ID,
  type FlowPort,
  type PortDirection,
  type PortValueType,
  type PortKind,
  type EdgeRoute,
} from '@/stores/flowchart'

const emit = defineEmits<{
  collapse: []
  toggleMaximize: []
}>()

defineProps<{
  maximized: boolean
}>()

const { state: settings } = useAppSettings()
const fc = useFlowchart()
const {
  selectedNode,
  selectedEdge,
  selectedCount,
  state,
  updateNodeLabel,
  updateNodePosition,
  updateNodeClassName,
  updateNodeScalable,
  updateNodeSize,
  updateNodePorts,
  updateNodeSettings,
  updateEdgeRoute,
  setEdgeMessagePriority,
  removeEdge,
} = fc

const t = computed(() => messages[settings.locale])

const labelDraft = ref('')
watch(
  () => selectedNode.value?.id,
  () => {
    labelDraft.value = selectedNode.value?.label ?? ''
  },
  { immediate: true },
)
watch(
  () => selectedNode.value?.label,
  (v) => {
    if (selectedNode.value) labelDraft.value = v ?? ''
  },
)

const xDraft = ref(0)
const yDraft = ref(0)
const classDraft = ref('')
const scalableDraft = ref(true)
const wDraft = ref(120)
const hDraft = ref(48)
const conditionDraft = ref('')
const loopModeDraft = ref('foreach')

watch(
  () => selectedNode.value,
  (n) => {
    if (n) {
      if ((n.type === 'container' || n.type === 'group') && !n.scalable) {
        updateNodeScalable(n.id, true)
      }
      xDraft.value = Math.round(n.x)
      yDraft.value = Math.round(n.y)
      classDraft.value = n.className
      scalableDraft.value = n.type === 'container' || n.type === 'group' ? true : n.scalable
      wDraft.value = Math.round(n.width)
      hDraft.value = Math.round(n.height)
      conditionDraft.value =
        n.type === 'decision' && typeof n.settings.condition === 'string'
          ? n.settings.condition
          : ''
      loopModeDraft.value =
        n.type === 'for-node' && typeof n.settings.loopMode === 'string'
          ? String(n.settings.loopMode)
          : 'foreach'
      scriptDraft.value =
        n.type === 'script-node' && typeof n.settings.script === 'string'
          ? n.settings.script
          : ''
    }
  },
  { deep: true, immediate: true },
)

const multiHint = computed(() =>
  t.value.propMulti.replace(
    '{n}',
    String(selectedCount.value),
  ),
)

const portsMessageInherent = computed(
  () =>
    selectedNode.value?.ports.filter(
      (p) => p.kind === 'message' && p.origin === 'inherent',
    ) ?? [],
)
const portsInherentNumeric = computed(
  () =>
    selectedNode.value?.ports.filter(
      (p) => p.kind === 'numeric' && p.origin === 'inherent',
    ) ?? [],
)
const portsUser = computed(
  () => selectedNode.value?.ports.filter((p) => p.origin === 'user') ?? [],
)

const scriptDraft = ref('')

const edgeRouteDraft = ref<EdgeRoute>('straight')
const edgePriorityDraft = ref(0)

watch(
  () => selectedEdge.value?.id,
  () => {
    const e = selectedEdge.value
    if (e) {
      edgeRouteDraft.value = (e.route ?? 'straight') as EdgeRoute
      edgePriorityDraft.value = e.messagePriority ?? 0
    }
  },
  { immediate: true },
)

const selectedEdgeIsMessage = computed(() => {
  const e = selectedEdge.value
  if (!e) return false
  const s = state.nodes.find((n) => n.id === e.source)
  const p = s?.ports.find((x) => x.id === e.sourcePortId)
  return p?.kind === 'message'
})

function groupDisplayName(groupId: string) {
  if (groupId === ROOT_GROUP_ID) return t.value.propGroupRoot
  const n = state.nodes.find((x) => x.id === groupId)
  return n ? n.label : groupId
}

function commitEdgeRoute() {
  const e = selectedEdge.value
  if (!e) return
  updateEdgeRoute(e.id, edgeRouteDraft.value)
}

function commitEdgePriority() {
  const e = selectedEdge.value
  if (!e) return
  setEdgeMessagePriority(e.id, edgePriorityDraft.value)
}

function deleteSelectedEdge() {
  const e = selectedEdge.value
  if (!e) return
  removeEdge(e.id)
}

/** 「通用」折叠：连接属性之上的表单项 */
const generalExpanded = ref(true)
/** 「连接属性（端口）」折叠 */
const portsExpanded = ref(true)
/** 「当前类型功能」折叠（位于端口分类之下） */
const typeFeaturesExpanded = ref(true)

function typeLabel(type: string) {
  const m: Record<string, string> = {
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
    group: t.value.propTypeGroup,
  }
  return m[type] ?? type
}

function commitLabel() {
  const n = selectedNode.value
  if (!n) return
  updateNodeLabel(n.id, labelDraft.value)
}

function commitPos() {
  const n = selectedNode.value
  if (!n) return
  updateNodePosition(n.id, xDraft.value, yDraft.value)
}

function commitClass() {
  const n = selectedNode.value
  if (!n) return
  updateNodeClassName(n.id, classDraft.value)
}

function commitScalable() {
  const n = selectedNode.value
  if (!n) return
  updateNodeScalable(n.id, scalableDraft.value)
}

function commitSize() {
  const n = selectedNode.value
  if (!n || !n.scalable) return
  updateNodeSize(n.id, wDraft.value, hDraft.value)
}

function commitCondition() {
  const n = selectedNode.value
  if (!n || n.type !== 'decision') return
  updateNodeSettings(n.id, { condition: conditionDraft.value })
}

function commitLoopMode() {
  const n = selectedNode.value
  if (!n || n.type !== 'for-node') return
  updateNodeSettings(n.id, { loopMode: loopModeDraft.value })
}

function commitScript() {
  const n = selectedNode.value
  if (!n || n.type !== 'script-node') return
  updateNodeSettings(n.id, { script: scriptDraft.value })
}

function dirLabel(d: PortDirection) {
  const m: Record<PortDirection, string> = {
    in: t.value.dirIn,
    out: t.value.dirOut,
    inout: t.value.dirInout,
    none: t.value.dirNone,
  }
  return m[d]
}

function vtLabel(v: PortValueType) {
  const m: Record<PortValueType, string> = {
    string: t.value.vtString,
    int: t.value.vtInt,
    float: t.value.vtFloat,
    vector: t.value.vtVector,
    matrix: t.value.vtMatrix,
    table: t.value.vtTable,
    list: t.value.vtList,
  }
  return m[v]
}

function kindLabel(k: PortKind) {
  return k === 'message' ? t.value.propKindMessage : t.value.propKindNumeric
}

const kindOptions: PortKind[] = ['numeric', 'message']

function commitPorts(ports: FlowPort[]) {
  const n = selectedNode.value
  if (!n) return
  updateNodePorts(n.id, ports.map((p) => ({ ...p })))
}

function patchPortById(portId: string, patch: Partial<FlowPort>) {
  const n = selectedNode.value
  if (!n) return
  const idx = n.ports.findIndex((p) => p.id === portId)
  if (idx < 0) return
  const cur = n.ports[idx]
  let safe: Partial<FlowPort> = { ...patch }
  if (cur.origin === 'inherent') {
    safe = {}
    if (patch.valueDisplay !== undefined) safe.valueDisplay = patch.valueDisplay
  }
  const next = n.ports.map((p, i) => (i === idx ? { ...p, ...safe } : p))
  commitPorts(next)
}

function addUserPort() {
  const n = selectedNode.value
  if (!n) return
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const p: FlowPort = {
    id,
    name: 'user',
    direction: 'in',
    valueType: 'string',
    kind: 'numeric',
    valueDisplay: '',
    origin: 'user',
  }
  commitPorts([...n.ports, p])
}

function removePortById(portId: string) {
  const n = selectedNode.value
  if (!n) return
  const p = n.ports.find((x) => x.id === portId)
  if (!p || p.origin !== 'user') return
  commitPorts(n.ports.filter((x) => x.id !== portId))
}

const dirOptions: PortDirection[] = ['in', 'out', 'inout', 'none']
const vtOptions: PortValueType[] = [
  'string',
  'int',
  'float',
  'vector',
  'matrix',
  'table',
  'list',
]

function onLabelBlur() {
  commitLabel()
}

function onPosBlur() {
  commitPos()
}

function onClassBlur() {
  commitClass()
}

function onSizeBlur() {
  commitSize()
}

function typeFeatureText(type: string) {
  if (type === 'group') return t.value.typeFeature_group
  if (type === 'container') return t.value.typeFeature_container
  if (type.startsWith('var-')) return t.value.typeFeature_var
  const m: Record<string, string> = {
    process: t.value.typeFeature_process,
    decision: t.value.typeFeature_decision,
    terminal: t.value.typeFeature_terminal,
    'for-node': t.value.typeFeature_for,
    'type-convert': t.value.typeFeature_typeConvert,
    'script-node': t.value.typeFeature_script,
  }
  return m[type] ?? '—'
}
</script>

<template>
  <div id="dock-node-properties" class="dock-root">
    <header class="dock-head">
      <span class="dock-title">{{ t.dockNodeProps }}</span>
      <span class="dock-actions">
        <button type="button" class="dock-btn" :title="t.dockMaximize" @click="emit('toggleMaximize')">
          {{ maximized ? '⧉' : '▢' }}
        </button>
        <button type="button" class="dock-btn" :title="t.dockCollapse" @click="emit('collapse')">
          {{ t.dockCollapseBtn }}
        </button>
      </span>
    </header>
    <div class="dock-body">
      <template v-if="selectedEdge">
        <div class="edge-props">
          <span class="lbl edge-title">{{ t.propEdgeTitle }}</span>
          <label class="field">
            <span class="lbl">{{ t.propEdgeId }}</span>
            <input class="inp readonly" type="text" readonly :value="selectedEdge.id" />
          </label>
          <label class="field">
            <span class="lbl">{{ t.propEdgeRoute }}</span>
            <select v-model="edgeRouteDraft" class="inp" @change="commitEdgeRoute">
              <option value="straight">{{ t.edgeRouteStraight }}</option>
              <option value="curve">{{ t.edgeRouteCurve }}</option>
              <option value="polyline">{{ t.edgeRoutePolyline }}</option>
            </select>
          </label>
          <label v-if="selectedEdgeIsMessage" class="field">
            <span class="lbl">{{ t.propEdgePriority }}</span>
            <input
              v-model.number="edgePriorityDraft"
              class="inp"
              type="number"
              min="0"
              step="1"
              @change="commitEdgePriority"
            />
          </label>
          <button type="button" class="btn-danger" @click="deleteSelectedEdge">
            {{ t.propEdgeDelete }}
          </button>
        </div>
      </template>
      <p v-else-if="selectedCount > 1" class="multi">{{ multiHint }}</p>
      <template v-else-if="selectedNode">
        <div class="dock-section">
          <button
            type="button"
            class="section-toggle"
            :aria-expanded="generalExpanded"
            @click="generalExpanded = !generalExpanded"
          >
            <span class="section-chevron">{{ generalExpanded ? '▼' : '▶' }}</span>
            <span>{{ t.sectionGeneral }}</span>
          </button>
          <div v-show="generalExpanded" class="section-body">
            <label class="field">
              <span class="lbl">{{ t.propId }}</span>
              <input class="inp readonly" type="text" readonly :value="selectedNode.id" />
            </label>
            <label class="field">
              <span class="lbl">{{ t.propType }}</span>
              <input class="inp readonly" type="text" readonly :value="typeLabel(selectedNode.type)" />
            </label>
            <label class="field">
              <span class="lbl">{{ t.propGroup }}</span>
              <input
                class="inp readonly"
                type="text"
                readonly
                :value="groupDisplayName(selectedNode.groupId)"
                :title="selectedNode.groupId"
              />
            </label>
            <label class="field">
              <span class="lbl">{{ t.propLabel }}</span>
              <input
                v-model="labelDraft"
                class="inp"
                type="text"
                @blur="onLabelBlur"
                @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
              />
            </label>
            <label class="field">
              <span class="lbl">{{ t.propClassName }}</span>
              <input
                v-model="classDraft"
                class="inp"
                type="text"
                @blur="onClassBlur"
                @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
              />
            </label>
            <label class="field row-check">
              <input
                v-model="scalableDraft"
                type="checkbox"
                :disabled="selectedNode.type === 'container' || selectedNode.type === 'group'"
                :title="
                  selectedNode.type === 'container' || selectedNode.type === 'group'
                    ? t.propScalableContainerLocked
                    : undefined
                "
                @change="commitScalable"
              />
              <span class="lbl">{{ t.propScalable }}</span>
            </label>
            <template v-if="selectedNode.type === 'decision'">
              <label class="field">
                <span class="lbl">{{ t.settingCondition }}</span>
                <textarea
                  v-model="conditionDraft"
                  class="inp textarea"
                  rows="3"
                  @blur="commitCondition"
                />
              </label>
            </template>
            <template v-if="selectedNode.type === 'for-node'">
              <label class="field">
                <span class="lbl">{{ t.settingLoopMode }}</span>
                <select v-model="loopModeDraft" class="inp" @change="commitLoopMode">
                  <option value="foreach">{{ t.loopModeForeach }}</option>
                  <option value="count">{{ t.loopModeCount }}</option>
                  <option value="while">{{ t.loopModeWhile }}</option>
                </select>
              </label>
            </template>
            <template v-if="selectedNode.type === 'script-node'">
              <label class="field">
                <span class="lbl">{{ t.settingScript }}</span>
                <textarea
                  v-model="scriptDraft"
                  class="inp textarea"
                  rows="6"
                  @blur="commitScript"
                />
              </label>
            </template>
            <div class="row2">
            <label class="field half">
              <span class="lbl">X</span>
              <input
                v-model.number="xDraft"
                class="inp"
                type="number"
                @blur="onPosBlur"
              />
            </label>
            <label class="field half">
              <span class="lbl">Y</span>
              <input
                v-model.number="yDraft"
                class="inp"
                type="number"
                @blur="onPosBlur"
              />
            </label>
            </div>
            <div v-if="selectedNode.scalable" class="row2">
              <label class="field half">
                <span class="lbl">{{ t.propWidth }}</span>
                <input
                  v-model.number="wDraft"
                  class="inp"
                  type="number"
                  :min="40"
                  @blur="onSizeBlur"
                />
              </label>
              <label class="field half">
                <span class="lbl">{{ t.propHeight }}</span>
                <input
                  v-model.number="hDraft"
                  class="inp"
                  type="number"
                  :min="28"
                  @blur="onSizeBlur"
                />
              </label>
            </div>
          </div>
        </div>

        <div class="dock-section">
          <button
            type="button"
            class="section-toggle"
            :aria-expanded="portsExpanded"
            @click="portsExpanded = !portsExpanded"
          >
            <span class="section-chevron">{{ portsExpanded ? '▼' : '▶' }}</span>
            <span>{{ t.propPorts }}</span>
          </button>
          <div v-show="portsExpanded" class="ports-block section-body">
          <h4 class="port-section-title">{{ t.sectionPortsMessage }}</h4>
          <p class="port-hint">{{ t.propLockedHint }}</p>
          <div v-for="p in portsMessageInherent" :key="p.id" class="port-block">
            <div class="port-row-line">
              <input
                class="inp port-name readonly"
                type="text"
                readonly
                :value="p.name"
                :title="p.name"
              />
              <input class="inp port-sel readonly" type="text" readonly :value="dirLabel(p.direction)" />
              <input class="inp port-sel readonly" type="text" readonly :value="kindLabel(p.kind)" />
              <input class="inp port-sel readonly" type="text" readonly :value="vtLabel(p.valueType)" />
            </div>
            <input
              class="inp port-display"
              type="text"
              :value="p.valueDisplay"
              :placeholder="t.propValueDisplayPh"
              @change="patchPortById(p.id, { valueDisplay: ($event.target as HTMLInputElement).value })"
            />
          </div>

          <h4 class="port-section-title">{{ t.sectionPortsInherentNumeric }}</h4>
          <p class="port-hint">{{ t.propLockedHint }}</p>
          <div v-for="p in portsInherentNumeric" :key="p.id" class="port-block">
            <div class="port-row-line">
              <input
                class="inp port-name readonly"
                type="text"
                readonly
                :value="p.name"
                :title="p.name"
              />
              <input class="inp port-sel readonly" type="text" readonly :value="dirLabel(p.direction)" />
              <input class="inp port-sel readonly" type="text" readonly :value="kindLabel(p.kind)" />
              <input class="inp port-sel readonly" type="text" readonly :value="vtLabel(p.valueType)" />
            </div>
            <input
              class="inp port-display"
              type="text"
              :value="p.valueDisplay"
              :placeholder="t.propValueDisplayPh"
              @change="patchPortById(p.id, { valueDisplay: ($event.target as HTMLInputElement).value })"
            />
          </div>

          <h4 class="port-section-title">{{ t.sectionPortsUser }}</h4>
          <div class="ports-head user-head">
            <button type="button" class="btn-small" @click="addUserPort">{{ t.propAddPort }}</button>
          </div>
          <div v-for="p in portsUser" :key="p.id" class="port-block">
            <div class="port-row-line">
              <input
                class="inp port-name"
                type="text"
                :value="p.name"
                @change="patchPortById(p.id, { name: ($event.target as HTMLInputElement).value })"
              />
              <select
                class="inp port-sel"
                :value="p.direction"
                @change="patchPortById(p.id, { direction: ($event.target as HTMLSelectElement).value as PortDirection })"
              >
                <option v-for="d in dirOptions" :key="d" :value="d">{{ dirLabel(d) }}</option>
              </select>
              <select
                class="inp port-sel"
                :value="p.kind"
                @change="patchPortById(p.id, { kind: ($event.target as HTMLSelectElement).value as PortKind })"
              >
                <option v-for="k in kindOptions" :key="k" :value="k">{{ kindLabel(k) }}</option>
              </select>
              <select
                class="inp port-sel"
                :value="p.valueType"
                @change="patchPortById(p.id, { valueType: ($event.target as HTMLSelectElement).value as PortValueType })"
              >
                <option v-for="v in vtOptions" :key="v" :value="v">{{ vtLabel(v) }}</option>
              </select>
              <button type="button" class="btn-remove" :title="t.propRemove" @click="removePortById(p.id)">
                ×
              </button>
            </div>
            <input
              class="inp port-display"
              type="text"
              :value="p.valueDisplay"
              :placeholder="t.propValueDisplayPh"
              @change="patchPortById(p.id, { valueDisplay: ($event.target as HTMLInputElement).value })"
            />
          </div>
          </div>
        </div>

        <div class="dock-section">
          <button
            type="button"
            class="section-toggle"
            :aria-expanded="typeFeaturesExpanded"
            @click="typeFeaturesExpanded = !typeFeaturesExpanded"
          >
            <span class="section-chevron">{{ typeFeaturesExpanded ? '▼' : '▶' }}</span>
            <span>{{ t.sectionTypeFeatures }}</span>
          </button>
          <div v-show="typeFeaturesExpanded" class="section-body">
            <p class="type-feature-desc">{{ typeFeatureText(selectedNode.type) }}</p>
          </div>
        </div>
      </template>
      <p v-else class="empty">{{ t.propNone }}</p>
    </div>
  </div>
</template>

<style scoped>
.dock-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--surface);
  border-left: 1px solid var(--border);
}
.dock-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  font-size: 12px;
}
.dock-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dock-actions {
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
  font-size: 11px;
  cursor: default;
}
.dock-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.dock-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0.45rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.dock-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.section-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  padding: 0.25rem 0.2rem;
  border: none;
  border-radius: 3px;
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.section-toggle:hover {
  background: var(--border);
}
.section-chevron {
  font-size: 10px;
  color: var(--muted);
  width: 1rem;
  flex-shrink: 0;
}
.section-body {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 11px;
}
.field.row-check {
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
}
.lbl {
  color: var(--muted);
}
.inp {
  padding: 0.3rem 0.35rem;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  width: 100%;
}
.inp.readonly {
  opacity: 0.85;
  cursor: default;
}
.row2 {
  display: flex;
  gap: 0.35rem;
}
.field.half {
  flex: 1;
  min-width: 0;
}
.empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
}
.multi {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}
.ports-main {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
}
.port-section-title {
  margin: 0.5rem 0 0.15rem;
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
}
.port-hint {
  margin: 0 0 0.35rem;
  font-size: 10px;
  color: var(--muted);
  line-height: 1.3;
}
.inp.readonly {
  opacity: 0.9;
  cursor: default;
  font-size: 10px;
}
.user-head {
  justify-content: flex-end;
  margin-bottom: 0.25rem;
}
.ports-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border);
}
.ports-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
}
.btn-small {
  padding: 0.15rem 0.4rem;
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text);
  cursor: default;
}
.btn-small:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.textarea {
  resize: vertical;
  min-height: 3.5rem;
}
.port-block {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.port-row-line {
  display: grid;
  grid-template-columns: 1fr minmax(3.2rem, auto) minmax(3.2rem, auto) minmax(3.2rem, auto) 1.4rem;
  gap: 0.25rem;
  align-items: center;
}
.port-display {
  font-size: 11px;
}
.port-name {
  min-width: 0;
}
.port-sel {
  padding: 0.2rem;
  font-size: 11px;
}
.btn-remove {
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--bg);
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  cursor: default;
}
.btn-remove:hover {
  border-color: #c00;
  color: #c00;
}
.edge-props {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.edge-title {
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.15rem;
}
.btn-danger {
  padding: 0.35rem 0.5rem;
  font-size: 12px;
  border: 1px solid #fecaca;
  border-radius: 3px;
  background: #fef2f2;
  color: #b91c1c;
  cursor: pointer;
  align-self: flex-start;
}
.btn-danger:hover {
  border-color: #f87171;
  background: #fee2e2;
}
.type-feature-desc {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--muted);
}
</style>
