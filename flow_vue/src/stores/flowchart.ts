import { reactive, computed } from 'vue'
import { log } from './appLog'
import {
  NODE_TITLE_H,
  minNodeHeightForOrderedPortRows,
  orderedPortsFromList,
} from '@/utils/flowNodeLayout'

/** 连接点方向：输入 / 输出 / 双向 / 不可连接 */
export type PortDirection = 'in' | 'out' | 'inout' | 'none'

/** 属性值类型 */
export type PortValueType =
  | 'string'
  | 'int'
  | 'float'
  | 'vector'
  | 'matrix'
  | 'table'
  | 'list'

/** 端口形态：数值（圆点）/ 消息（带三角突起的四边形） */
export type PortKind = 'numeric' | 'message'

/** 固有端口（不可改方向/形态/数据类型）与用户自定义端口 */
export type PortOrigin = 'inherent' | 'user'

/** 流程图根组（所有节点默认属于此组） */
export const ROOT_GROUP_ID = '__flow_root__'

/** 连线走向：直线 / 曲线 / 折线（正交折线，减轻遮挡） */
export type EdgeRoute = 'straight' | 'curve' | 'polyline'

export interface FlowPort {
  id: string
  name: string
  direction: PortDirection
  valueType: PortValueType
  kind: PortKind
  /** 画布上展示的当前值/状态文案 */
  valueDisplay: string
  origin: PortOrigin
}

export interface FlowNode {
  id: string
  type: string
  /** 节点 class 名称（逻辑/CSS 类名） */
  className: string
  /** 是否允许在属性中调整宽高 */
  scalable: boolean
  x: number
  y: number
  width: number
  height: number
  label: string
  ports: FlowPort[]
  /** 所属逻辑组；ROOT_GROUP_ID 表示流程图根组 */
  groupId: string
  /** 节点类型专属设置（如 IF 的判断条件、FOR 的循环方式） */
  settings: Record<string, unknown>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  /** 输出侧端口（可选，旧文档仅节点级连线） */
  sourcePortId?: string
  /** 输入侧端口（可选） */
  targetPortId?: string
  /** 连线绘制方式 */
  route?: EdgeRoute
  /** 消息连线中点显示的优先级（非负整数） */
  messagePriority?: number
}

export interface FlowDocumentV1 {
  version: 1
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const EDITOR_W = 800
const EDITOR_H = 600
/** 画布逻辑坐标允许范围（视为无限大平面上的可编辑区） */
const COORD_MAX = 10_000_000
const COLLAPSED_FRAME_H = NODE_TITLE_H + 8

const DEFAULT_W = 148
const DEFAULT_H = 100

let idSeq = 1

function uid(prefix: string) {
  return `${prefix}_${idSeq++}_${Math.random().toString(36).slice(2, 8)}`
}

function defaultPortsForType(type: string): FlowPort[] {
  const mk = (
    name: string,
    dir: PortDirection,
    vt: PortValueType,
    kind: PortKind = 'numeric',
    valueDisplay = '',
    origin: PortOrigin = 'inherent',
  ): FlowPort => ({
    id: uid('p'),
    name,
    direction: dir,
    valueType: vt,
    kind,
    valueDisplay,
    origin,
  })
  if (type === 'decision') {
    return [
      mk('条件', 'in', 'string', 'message', ''),
      mk('真', 'out', 'int', 'numeric', '0'),
      mk('假', 'out', 'int', 'numeric', '0'),
    ]
  }
  if (type === 'terminal') {
    return [mk('流', 'inout', 'string', 'message', '')]
  }
  if (type === 'container' || type === 'group') {
    return [mk('子图', 'inout', 'matrix', 'message', '')]
  }
  if (type === 'for-node') {
    return [mk('进入', 'in', 'string', 'message', ''), mk('下一', 'out', 'string', 'message', '')]
  }
  if (type === 'type-convert') {
    return [
      mk('入', 'in', 'string', 'message', ''),
      mk('出', 'out', 'float', 'numeric', ''),
    ]
  }
  if (type === 'script-node') {
    return [mk('入', 'in', 'string', 'message', ''), mk('出', 'out', 'string', 'message', '')]
  }
  const varVt: Record<string, PortValueType> = {
    'var-string': 'string',
    'var-int': 'int',
    'var-float': 'float',
    'var-vector': 'vector',
    'var-matrix': 'matrix',
    'var-table': 'table',
    'var-list': 'list',
  }
  if (varVt[type]) {
    return [mk('值', 'inout', varVt[type], 'numeric', '')]
  }
  return [
    mk('输入', 'in', 'string', 'message', ''),
    mk('输出', 'out', 'string', 'message', ''),
  ]
}

function defaultSettingsForType(type: string): Record<string, unknown> {
  if (type === 'decision') return { condition: '' }
  if (type === 'for-node') return { loopMode: 'foreach' }
  if (type === 'script-node') return { script: '' }
  if (type === 'container' || type === 'group') return { groupExpanded: true }
  return {}
}

export function migrateEdge(raw: Record<string, unknown>): FlowEdge {
  const routeRaw = String(raw.route ?? '')
  const route: EdgeRoute | undefined =
    routeRaw === 'straight' || routeRaw === 'curve' || routeRaw === 'polyline'
      ? routeRaw
      : undefined
  const pr = raw.messagePriority
  const messagePriority =
    typeof pr === 'number' && Number.isFinite(pr) && pr >= 0
      ? Math.floor(pr)
      : undefined
  return {
    id: String(raw.id),
    source: String(raw.source),
    target: String(raw.target),
    sourcePortId: typeof raw.sourcePortId === 'string' ? raw.sourcePortId : undefined,
    targetPortId: typeof raw.targetPortId === 'string' ? raw.targetPortId : undefined,
    route,
    messagePriority,
  }
}

function migrateNode(raw: Record<string, unknown>): FlowNode {
  const type = String(raw.type ?? 'process')
  const w = typeof raw.width === 'number' ? raw.width : DEFAULT_W
  let ports: FlowPort[] = []
  if (Array.isArray(raw.ports)) {
    ports = raw.ports.map((p) => {
      const o = p as Record<string, unknown>
      const kindRaw = String(o.kind ?? '')
      const kind: PortKind =
        kindRaw === 'message' || kindRaw === 'numeric'
          ? kindRaw
          : 'numeric'
      return {
        id: String(o.id ?? uid('p')),
        name: String(o.name ?? 'port'),
        direction: (['in', 'out', 'inout', 'none'].includes(String(o.direction))
          ? o.direction
          : 'in') as PortDirection,
        valueType: (
          [
            'string',
            'int',
            'float',
            'vector',
            'matrix',
            'table',
            'list',
          ].includes(String(o.valueType))
            ? o.valueType
            : 'string'
        ) as PortValueType,
        kind,
        valueDisplay: typeof o.valueDisplay === 'string' ? o.valueDisplay : '',
        origin: (String(o.origin) === 'user' ? 'user' : 'inherent') as PortOrigin,
      }
    })
  } else {
    ports = defaultPortsForType(type)
  }
  const baseScalable =
    typeof raw.scalable === 'boolean' ? raw.scalable : true
  /** 容器节点固定为可缩放 */
  const scalable = type === 'container' || type === 'group' ? true : baseScalable
  let settings: Record<string, unknown> = defaultSettingsForType(type)
  if (isRecord(raw.settings)) {
    settings = { ...defaultSettingsForType(type), ...raw.settings }
  }
  const rowN = orderedPortsFromList(ports).length
  const minH = minNodeHeightForOrderedPortRows(rowN)
  const height = Math.max(
    28,
    Math.min(COORD_MAX, Math.max(typeof raw.height === 'number' ? raw.height : minH, minH)),
  )
  const width = Math.max(40, Math.min(COORD_MAX, w))
  const groupId =
    typeof raw.groupId === 'string' && raw.groupId.length > 0
      ? raw.groupId
      : ROOT_GROUP_ID
  return {
    id: String(raw.id),
    type,
    className: typeof raw.className === 'string' ? raw.className : '',
    scalable,
    x: Number(raw.x) || 0,
    y: Number(raw.y) || 0,
    width,
    height,
    label: String(raw.label ?? ''),
    ports,
    groupId,
    settings,
  }
}

/** 祖先组框处于「闭组」时，子节点不在画布上绘制 */
export function isNodeHiddenByCollapsedGroup(node: FlowNode, nodes: FlowNode[]): boolean {
  let gid = node.groupId
  while (gid && gid !== ROOT_GROUP_ID) {
    const p = nodes.find((x) => x.id === gid)
    if (!p) break
    if (
      (p.type === 'group' || p.type === 'container') &&
      p.settings.groupExpanded === false
    ) {
      return true
    }
    gid = p.groupId
  }
  return false
}

function clampCoord(v: number) {
  return Math.max(-COORD_MAX, Math.min(COORD_MAX, v))
}

const state = reactive({
  nodes: [] as FlowNode[],
  edges: [] as FlowEdge[],
  connectMode: false,
  connectSourceId: null as string | null,
  /** 多选 */
  selectedNodeIds: [] as string[],
  /** 框选 / 拖拽多节点 */
  dragState: null as null | {
    ids: string[]
    startPointer: { x: number; y: number }
    startNodes: Record<string, { x: number; y: number }>
  },
  marquee: null as null | { x1: number; y1: number; x2: number; y2: number },
  /** 选中的边（与节点选区互斥由操作处维护） */
  selectedEdgeIds: [] as string[],
})

const fileMeta = reactive({
  displayName: 'Untitled.flow.json',
  handle: null as FileSystemFileHandle | null,
  dirty: false,
})

export const EDITOR_SIZE = { w: EDITOR_W, h: EDITOR_H }

function touchDirty() {
  fileMeta.dirty = true
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function parseDocument(raw: unknown): FlowDocumentV1 {
  if (!isRecord(raw)) throw new Error('not an object')
  if (raw.version !== 1) throw new Error('unsupported version')
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) throw new Error('invalid shape')
  for (const n of raw.nodes) {
    if (!isRecord(n)) throw new Error('invalid node')
    if (typeof n.id !== 'string' || typeof n.type !== 'string') throw new Error('invalid node')
    if (typeof n.x !== 'number' || typeof n.y !== 'number' || typeof n.label !== 'string') {
      throw new Error('invalid node')
    }
  }
  for (const e of raw.edges) {
    if (!isRecord(e)) throw new Error('invalid edge')
    if (typeof e.id !== 'string' || typeof e.source !== 'string' || typeof e.target !== 'string') {
      throw new Error('invalid edge')
    }
  }
  return raw as FlowDocumentV1
}

export function useFlowchart() {
  const selectedNode = computed(() => {
    if (state.selectedNodeIds.length !== 1) return null
    return state.nodes.find((n) => n.id === state.selectedNodeIds[0]) ?? null
  })

  const selectedEdge = computed(() => {
    if (state.selectedEdgeIds.length !== 1) return null
    return state.edges.find((e) => e.id === state.selectedEdgeIds[0]) ?? null
  })

  const selectedCount = computed(() => state.selectedNodeIds.length)

  function isNodeSelected(id: string) {
    return state.selectedNodeIds.includes(id)
  }

  function setSelectedNodeIds(ids: string[]) {
    state.selectedNodeIds = [...ids]
    state.selectedEdgeIds = []
  }

  function setSelectedNode(id: string | null) {
    state.selectedNodeIds = id ? [id] : []
    state.selectedEdgeIds = []
  }

  function toggleSelect(id: string, additive: boolean) {
    state.selectedEdgeIds = []
    if (additive) {
      const i = state.selectedNodeIds.indexOf(id)
      if (i >= 0) state.selectedNodeIds.splice(i, 1)
      else state.selectedNodeIds.push(id)
    } else {
      state.selectedNodeIds = [id]
    }
  }

  function clearSelection() {
    state.selectedNodeIds = []
    state.selectedEdgeIds = []
  }

  function setSelectedEdge(id: string | null) {
    state.selectedEdgeIds = id ? [id] : []
    state.selectedNodeIds = []
  }

  function clearEdgeSelection() {
    state.selectedEdgeIds = []
  }

  function isEdgeSelected(id: string) {
    return state.selectedEdgeIds.includes(id)
  }

  function selectFromMarquee(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    additive: boolean,
  ) {
    const rx = Math.min(x1, x2)
    const ry = Math.min(y1, y2)
    const rw = Math.abs(x2 - x1)
    const rh = Math.abs(y2 - y1)
    if (rw < 4 && rh < 4) return
    const picked: string[] = []
    for (const n of state.nodes) {
      const nx2 = n.x + n.width
      const ny2 = n.y + n.height
      const inter =
        n.x < rx + rw && nx2 > rx && n.y < ry + rh && ny2 > ry
      if (inter) picked.push(n.id)
    }
    state.selectedEdgeIds = []
    if (additive) {
      const set = new Set([...state.selectedNodeIds, ...picked])
      state.selectedNodeIds = [...set]
    } else {
      state.selectedNodeIds = picked
    }
  }

  function updateNodeLabel(id: string, label: string) {
    const n = state.nodes.find((x) => x.id === id)
    if (!n) return
    n.label = label
    touchDirty()
  }

  function updateNodePosition(id: string, x: number, y: number) {
    const n = state.nodes.find((node) => node.id === id)
    if (!n) return
    n.x = clampCoord(x)
    n.y = clampCoord(y)
    touchDirty()
  }

  function updateNodeClassName(id: string, className: string) {
    const n = state.nodes.find((x) => x.id === id)
    if (!n) return
    n.className = className
    touchDirty()
  }

  function updateNodeScalable(id: string, scalable: boolean) {
    const n = state.nodes.find((x) => x.id === id)
    if (!n) return
    const next = n.type === 'container' || n.type === 'group' ? true : scalable
    if (n.scalable === next) return
    n.scalable = next
    touchDirty()
  }

  function updateNodeSize(id: string, width: number, height: number) {
    const n = state.nodes.find((x) => x.id === id)
    if (!n || !n.scalable) return
    const minH = minNodeHeightForOrderedPortRows(orderedPortsFromList(n.ports).length)
    n.width = Math.max(40, Math.min(COORD_MAX, width))
    n.height = Math.max(minH, Math.min(COORD_MAX, height))
    touchDirty()
  }

  function updateNodePorts(id: string, ports: FlowPort[]) {
    const n = state.nodes.find((x) => x.id === id)
    if (!n) return
    n.ports = ports
    const minH = minNodeHeightForOrderedPortRows(orderedPortsFromList(ports).length)
    if (n.height < minH) n.height = Math.min(COORD_MAX, minH)
    touchDirty()
  }

  function updateNodeSettings(id: string, patch: Record<string, unknown>) {
    const n = state.nodes.find((x) => x.id === id)
    if (!n) return
    n.settings = { ...n.settings, ...patch }
    touchDirty()
  }

  const bounds = computed(() => {
    if (state.nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: EDITOR_W, maxY: EDITOR_H }
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    const pad = 40
    for (const n of state.nodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.width)
      maxY = Math.max(maxY, n.y + n.height)
    }
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    }
  })

  function newDocument(displayName: string) {
    state.nodes = []
    state.edges = []
    state.selectedNodeIds = []
    state.selectedEdgeIds = []
    state.dragState = null
    state.marquee = null
    cancelConnect()
    idSeq = Date.now()
    fileMeta.displayName = displayName
    fileMeta.handle = null
    fileMeta.dirty = false
  }

  function loadDocumentFromJsonText(
    text: string,
    displayName: string,
    handle: FileSystemFileHandle | null,
  ) {
    const raw = JSON.parse(text) as unknown
    const doc = parseDocument(raw)
    state.nodes = doc.nodes.map((n) => migrateNode(n as unknown as Record<string, unknown>))
    state.edges = doc.edges.map((e) =>
      migrateEdge(e as unknown as Record<string, unknown>),
    )
    state.selectedNodeIds = []
    state.selectedEdgeIds = []
    state.dragState = null
    state.marquee = null
    cancelConnect()
    idSeq = Date.now()
    fileMeta.displayName = displayName
    fileMeta.handle = handle
    fileMeta.dirty = false
  }

  function markSaved(displayName: string, handle?: FileSystemFileHandle | null) {
    fileMeta.displayName = displayName
    if (handle !== undefined) {
      fileMeta.handle = handle
    }
    fileMeta.dirty = false
  }

  function addNode(type: string, label: string) {
    const x = 80 + (state.nodes.length % 5) * 100
    const y = 80 + Math.floor(state.nodes.length / 5) * 80
    const n: FlowNode = migrateNode({
      id: uid('n'),
      type,
      className: '',
      scalable: true,
      x,
      y,
      width: DEFAULT_W,
      height: DEFAULT_H,
      label,
      groupId: ROOT_GROUP_ID,
      ports: defaultPortsForType(type),
    })
    state.nodes.push(n)
    state.selectedNodeIds = [n.id]
    touchDirty()
    log('info', `add node ${n.id} (${type})`)
    return n.id
  }

  function beginConnect() {
    state.connectMode = true
    state.connectSourceId = null
    log('info', 'connect mode: pick source node')
  }

  function cancelConnect() {
    state.connectMode = false
    state.connectSourceId = null
  }

  function pickNodeForConnect(nodeId: string) {
    if (!state.connectMode) return
    if (!state.connectSourceId) {
      state.connectSourceId = nodeId
      log('info', `connect: source ${nodeId}`)
      return
    }
    if (state.connectSourceId === nodeId) {
      return
    }
    const exists = state.edges.some(
      (e) =>
        (e.source === state.connectSourceId && e.target === nodeId) ||
        (e.source === nodeId && e.target === state.connectSourceId),
    )
    if (exists) {
      log('warn', 'edge already exists')
      state.connectSourceId = null
      state.connectMode = false
      return
    }
    const e: FlowEdge = {
      id: uid('e'),
      source: state.connectSourceId,
      target: nodeId,
      route: 'straight',
    }
    state.edges.push(e)
    touchDirty()
    log('info', `add edge ${e.source} -> ${e.target}`)
    state.connectSourceId = null
    state.connectMode = false
  }

  /**
   * 从输出端口拖到输入端口：输出→输入；同一输入端口仅允许一条入边；同一输出可连多个输入。
   */
  function addPortEdge(
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string,
  ) {
    const sn = state.nodes.find((x) => x.id === sourceNodeId)
    const tn = state.nodes.find((x) => x.id === targetNodeId)
    if (!sn || !tn) return
    const sp = sn.ports.find((p) => p.id === sourcePortId)
    const tp = tn.ports.find((p) => p.id === targetPortId)
    if (!sp || !tp) return
    if (sp.direction !== 'out' && sp.direction !== 'inout') return
    if (tp.direction !== 'in' && tp.direction !== 'inout') return
    if (
      state.edges.some(
        (e) =>
          e.target === targetNodeId &&
          e.targetPortId === targetPortId,
      )
    ) {
      log('warn', 'input port already has an incoming edge')
      return
    }
    if (
      state.edges.some(
        (e) =>
          e.source === sourceNodeId &&
          e.sourcePortId === sourcePortId &&
          e.target === targetNodeId &&
          e.targetPortId === targetPortId,
      )
    ) {
      return
    }
    const nextMessagePriority = () => {
      const relevant = state.edges.filter(
        (ed) =>
          ed.source === sourceNodeId &&
          ed.sourcePortId === sourcePortId &&
          typeof ed.messagePriority === 'number',
      )
      if (relevant.length === 0) return 0
      return Math.max(...relevant.map((ed) => ed.messagePriority!)) + 1
    }
    const e: FlowEdge = {
      id: uid('e'),
      source: sourceNodeId,
      target: targetNodeId,
      sourcePortId,
      targetPortId,
      route: 'straight',
    }
    if (sp.kind === 'message') {
      e.messagePriority = nextMessagePriority()
    }
    state.edges.push(e)
    touchDirty()
    log(
      'info',
      `add port edge ${sourceNodeId}:${sourcePortId} -> ${targetNodeId}:${targetPortId}`,
    )
  }

  function updateEdgeRoute(edgeId: string, route: EdgeRoute) {
    const e = state.edges.find((x) => x.id === edgeId)
    if (!e) return
    e.route = route
    touchDirty()
  }

  function setEdgeMessagePriority(edgeId: string, priority: number) {
    const e = state.edges.find((x) => x.id === edgeId)
    if (!e) return
    const v = Math.max(0, Math.floor(Number(priority)) || 0)
    e.messagePriority = v
    touchDirty()
  }

  function removeEdge(edgeId: string) {
    const i = state.edges.findIndex((x) => x.id === edgeId)
    if (i < 0) return
    state.edges.splice(i, 1)
    state.selectedEdgeIds = state.selectedEdgeIds.filter((id) => id !== edgeId)
    touchDirty()
  }

  /** 将当前多选节点合并为组（同父 group 下） */
  function groupSelectedNodes() {
    const ids = state.selectedNodeIds
    if (ids.length < 2) {
      log('warn', 'group: need at least 2 nodes')
      return
    }
    const nodes = ids
      .map((id) => state.nodes.find((n) => n.id === id))
      .filter((n): n is FlowNode => !!n)
    if (nodes.length < 2) return
    const gid = nodes[0].groupId
    if (!nodes.every((n) => n.groupId === gid)) {
      log('warn', 'group: nodes must share the same parent group')
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.width)
      maxY = Math.max(maxY, n.y + n.height)
    }
    const pad = 16
    const gNode = migrateNode({
      id: uid('n'),
      type: 'group',
      className: '',
      scalable: true,
      x: clampCoord(minX - pad),
      y: clampCoord(minY - pad),
      width: Math.min(COORD_MAX, maxX - minX + 2 * pad),
      height: Math.min(COORD_MAX, maxY - minY + 2 * pad),
      label: '组',
      groupId: gid,
      ports: defaultPortsForType('group'),
    })
    state.nodes.unshift(gNode)
    for (const n of nodes) {
      n.groupId = gNode.id
    }
    state.selectedNodeIds = [gNode.id]
    state.selectedEdgeIds = []
    touchDirty()
    log('info', `group created ${gNode.id}`)
  }

  /** 解散组：子节点回到父组，组节点删除 */
  function ungroupNode(groupNodeId: string) {
    const g = state.nodes.find((n) => n.id === groupNodeId)
    if (!g || (g.type !== 'group' && g.type !== 'container')) {
      log('warn', 'ungroup: not a group frame node')
      return
    }
    const parentGid = g.groupId
    const children = state.nodes.filter((n) => n.groupId === groupNodeId)
    for (const c of children) {
      c.groupId = parentGid
    }
    state.nodes = state.nodes.filter((n) => n.id !== groupNodeId)
    state.selectedNodeIds = children.map((c) => c.id)
    state.selectedEdgeIds = []
    touchDirty()
    log('info', `ungroup ${groupNodeId}`)
  }

  /** 双击组框/容器标题：开组 ↔ 闭组（闭组时子节点不绘制） */
  function toggleGroupExpanded(nodeId: string) {
    const n = state.nodes.find((x) => x.id === nodeId)
    if (!n || (n.type !== 'group' && n.type !== 'container')) return
    const expanded = n.settings.groupExpanded !== false
    if (expanded) {
      n.settings = { ...n.settings, groupExpanded: false, expandedHeight: n.height }
      n.height = COLLAPSED_FRAME_H
    } else {
      const saved = n.settings.expandedHeight
      const minH = minNodeHeightForOrderedPortRows(orderedPortsFromList(n.ports).length)
      const h = typeof saved === 'number' && saved >= minH ? saved : minH
      n.height = Math.min(COORD_MAX, h)
      n.settings = { ...n.settings, groupExpanded: true }
    }
    touchDirty()
    log('info', `toggle group frame ${nodeId}`)
  }

  function startDrag(nodeId: string, pointerWorldX: number, pointerWorldY: number) {
    const n = state.nodes.find((x) => x.id === nodeId)
    if (!n) return
    if (!state.selectedNodeIds.includes(nodeId)) {
      state.selectedNodeIds = [nodeId]
    }
    const ids = [...state.selectedNodeIds]
    const startNodes: Record<string, { x: number; y: number }> = {}
    for (const id of ids) {
      const node = state.nodes.find((x) => x.id === id)
      if (node) startNodes[id] = { x: node.x, y: node.y }
    }
    state.dragState = {
      ids,
      startPointer: { x: pointerWorldX, y: pointerWorldY },
      startNodes,
    }
  }

  function dragTo(pointerWorldX: number, pointerWorldY: number) {
    if (!state.dragState) return
    const dx = pointerWorldX - state.dragState.startPointer.x
    const dy = pointerWorldY - state.dragState.startPointer.y
    for (const id of state.dragState.ids) {
      const sn = state.dragState.startNodes[id]
      const node = state.nodes.find((x) => x.id === id)
      if (!node || !sn) continue
      node.x = clampCoord(sn.x + dx)
      node.y = clampCoord(sn.y + dy)
    }
  }

  function endDrag() {
    if (state.dragState) touchDirty()
    state.dragState = null
  }

  function setMarquee(m: typeof state.marquee) {
    state.marquee = m
  }

  function exportDocument(): FlowDocumentV1 {
    return {
      version: 1,
      nodes: state.nodes.map((n) => ({
        ...n,
        settings: { ...n.settings },
        ports: n.ports.map((p) => ({ ...p })),
      })),
      edges: state.edges.map((e) => {
        const o: FlowEdge = { id: e.id, source: e.source, target: e.target }
        if (e.sourcePortId) o.sourcePortId = e.sourcePortId
        if (e.targetPortId) o.targetPortId = e.targetPortId
        if (e.route) o.route = e.route
        if (typeof e.messagePriority === 'number') o.messagePriority = e.messagePriority
        return o
      }),
    }
  }

  return {
    state,
    fileMeta,
    selectedNode,
    selectedEdge,
    selectedCount,
    isNodeSelected,
    setSelectedNode,
    setSelectedNodeIds,
    toggleSelect,
    clearSelection,
    selectFromMarquee,
    updateNodeLabel,
    updateNodePosition,
    updateNodeClassName,
    updateNodeScalable,
    updateNodeSize,
    updateNodePorts,
    updateNodeSettings,
    bounds,
    addNode,
    beginConnect,
    cancelConnect,
    pickNodeForConnect,
    addPortEdge,
    updateEdgeRoute,
    setEdgeMessagePriority,
    removeEdge,
    groupSelectedNodes,
    ungroupNode,
    toggleGroupExpanded,
    setSelectedEdge,
    isEdgeSelected,
    startDrag,
    dragTo,
    endDrag,
    setMarquee,
    exportDocument,
    newDocument,
    loadDocumentFromJsonText,
    markSaved,
  }
}
