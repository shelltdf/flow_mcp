<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import {
  useFlowchart,
  EDITOR_SIZE,
  isNodeHiddenByCollapsedGroup,
  type FlowNode,
  type FlowPort,
  type FlowEdge,
  type EdgeRoute,
} from '@/stores/flowchart'
import { buildEdgePath, edgeLabelPoint } from '@/utils/edgeGeometry'
import {
  NODE_TITLE_H,
  NODE_PREVIEW_H,
  orderedPorts,
  portRowY,
  portDisplayText,
  messagePortPathLeft,
  messagePortPathRight,
  anchorYForSide,
  edgeAttachXRight,
  edgeAttachXLeft,
  PORT_R_NUMERIC,
  numericCxLeft,
  numericCxRight,
  getPortAnchor,
} from '@/utils/flowNodeLayout'

const GRID_STEP = 20
const ZOOM_MIN = 0.08
const ZOOM_MAX = 8
const WORLD_EXTENT = 200000

defineProps<{
  maximized: boolean
}>()

const emit = defineEmits<{
  toggleMaximize: []
}>()

const { state: settings } = useAppSettings()
const fc = useFlowchart()
const svgRef = ref<SVGSVGElement | null>(null)

const panX = ref(0)
const panY = ref(0)
const zoom = ref(1)
const middlePanning = ref(false)
/** 悬停的端口键 `nodeId-portId-side` */
const hoverPortKey = ref<string | null>(null)

/** 从输出端口拖线到输入端口 */
const linkDrag = ref<null | {
  x1: number
  y1: number
  sourceNodeId: string
  sourcePortId: string
}>(null)
const linkDragEnd = ref({ x: 0, y: 0 })
const PORT_LINK_HIT = 18

/** 框选进行中 */
const marqueeActive = ref(false)
/** 四角缩放 */
const resizing = ref<null | {
  id: string
  corner: 'nw' | 'ne' | 'sw' | 'se'
  w0: number
  h0: number
  x0: number
  y0: number
  wx: number
  wy: number
}>(null)

const SEL_OUT = 5
const H_HANDLE = 8

const visibleNodes = computed(() =>
  fc.state.nodes.filter((n) => !isNodeHiddenByCollapsedGroup(n, fc.state.nodes)),
)

const visibleEdges = computed(() =>
  fc.state.edges.filter((e) => {
    const s = fc.state.nodes.find((n) => n.id === e.source)
    const t = fc.state.nodes.find((n) => n.id === e.target)
    if (!s || !t) return false
    return (
      !isNodeHiddenByCollapsedGroup(s, fc.state.nodes) &&
      !isNodeHiddenByCollapsedGroup(t, fc.state.nodes)
    )
  }),
)

const selectedChromeNodes = computed(() =>
  fc.state.nodes.filter(
    (n) =>
      fc.isNodeSelected(n.id) &&
      !isNodeHiddenByCollapsedGroup(n, fc.state.nodes),
  ),
)

const showResizeHandles = computed(() => fc.state.selectedNodeIds.length === 1)

const t = computed(() => messages[settings.locale])

const shortcutLines = computed(() =>
  t.value.editorShortcuts.split('\n').map((l) => l.trim()).filter(Boolean),
)

const zoomPercent = computed(() => Math.round(zoom.value * 100))

const worldTransform = computed(
  () => `translate(${panX.value} ${panY.value}) scale(${zoom.value})`,
)

function screenToWorld(clientX: number, clientY: number) {
  const svg = svgRef.value
  if (!svg) return { x: 0, y: 0 }
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const p = pt.matrixTransform(ctm.inverse())
  return {
    x: (p.x - panX.value) / zoom.value,
    y: (p.y - panY.value) / zoom.value,
  }
}

function onWheel(e: WheelEvent) {
  const svg = svgRef.value
  if (!svg) return
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return
  const P = pt.matrixTransform(ctm.inverse())
  const wx = (P.x - panX.value) / zoom.value
  const wy = (P.y - panY.value) / zoom.value
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
  let newZ = zoom.value * factor
  newZ = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZ))
  panX.value = P.x - wx * newZ
  panY.value = P.y - wy * newZ
  zoom.value = newZ
}

function zoomIn() {
  applyZoomAtCenter(1.1)
}

function zoomOut() {
  applyZoomAtCenter(1 / 1.1)
}

function applyZoomAtCenter(factor: number) {
  const svg = svgRef.value
  if (!svg) return
  const vb = svg.viewBox.baseVal
  const cx = vb.width / 2
  const cy = vb.height / 2
  const wx = (cx - panX.value) / zoom.value
  const wy = (cy - panY.value) / zoom.value
  let newZ = zoom.value * factor
  newZ = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZ))
  panX.value = cx - wx * newZ
  panY.value = cy - wy * newZ
  zoom.value = newZ
}

function fitView() {
  const svg = svgRef.value
  if (!svg) return
  const b = fc.bounds.value
  const bw = b.maxX - b.minX
  const bh = b.maxY - b.minY
  if (bw < 4 || bh < 4) return
  const vb = svg.viewBox.baseVal
  const m = 24
  const zFit = Math.min((vb.width - 2 * m) / bw, (vb.height - 2 * m) / bh, ZOOM_MAX)
  const newZ = Math.max(ZOOM_MIN, zFit)
  zoom.value = newZ
  panX.value = m - b.minX * newZ
  panY.value = m - b.minY * newZ
}

function resetView() {
  panX.value = 0
  panY.value = 0
  zoom.value = 1
}

let panMove: ((ev: MouseEvent) => void) | null = null
let panUp: ((ev: MouseEvent) => void) | null = null

function endMiddlePan() {
  middlePanning.value = false
  if (panMove) window.removeEventListener('mousemove', panMove)
  if (panUp) window.removeEventListener('mouseup', panUp)
  panMove = null
  panUp = null
}

function onSvgMouseDownCapture(e: MouseEvent) {
  if (e.button !== 1) return
  e.preventDefault()
  const svg = svgRef.value
  if (!svg) return
  endMiddlePan()
  middlePanning.value = true
  const move = (ev: MouseEvent) => {
    if (!middlePanning.value) return
    const r = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    const sx = vb.width / Math.max(r.width, 1e-6)
    const sy = vb.height / Math.max(r.height, 1e-6)
    panX.value += ev.movementX * sx
    panY.value += ev.movementY * sy
  }
  const up = (ev: MouseEvent) => {
    if (ev.button === 1 || ev.buttons === 0) endMiddlePan()
  }
  panMove = move
  panUp = up
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

function rowIndices(n: FlowNode) {
  const ord = orderedPorts(n)
  const c = Math.max(ord.length, 1)
  return Array.from({ length: c }, (_, i) => i)
}

function rowCenterLabel(n: FlowNode, i: number) {
  const ord = orderedPorts(n)
  const p = ord[i]
  if (!p) return ' '
  return portDisplayText(p)
}

function portHoverKey(n: FlowNode, p: FlowPort, side: 'L' | 'R') {
  return `${n.id}-${p.id}-${side}`
}

function setPortHover(k: string | null) {
  hoverPortKey.value = k
}

function previewIconTransform(n: FlowNode) {
  const tx = n.x + n.width / 2 - 12
  const ty = n.y + NODE_TITLE_H + NODE_PREVIEW_H / 2 - 12
  return `translate(${tx} ${ty})`
}

/** 24×24 视口内路径，表示当前节点类型图标 */
function previewIconD(type: string): string {
  switch (type) {
    case 'group':
      return 'M4 5h16v14H4V5zm2 2v10h12V7H6zm2 2h8v2H8V9zm0 3h6v2H8v-2z'
    case 'container':
      return 'M3 7h18v12H3V7zm0 4h18'
    case 'decision':
      return 'M12 2L22 12 12 22 2 12 12 2z'
    case 'terminal':
      return 'M6 7h12v10H6V7zm2 2v6h8V9H8z'
    case 'for-node':
      return 'M12 4a7.5 7.5 0 107.5 7.5H16a4 4 0 10-4-4V4z'
    case 'type-convert':
      return 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4'
    case 'script-node':
      return 'M8 6L5 12l3 6M16 6l3 6-3 6M12.5 9h-2l-1 6h2'
    default:
      if (type.startsWith('var-')) {
        return 'M6 6h12v12H6V6zm3 3h6v6H9V9z'
      }
      return 'M5 8h14v8H5V8zm2 2h10v4H7v-4z'
  }
}

function previewIconStroke(type: string) {
  return nodeStroke(type)
}

function nodeTitleFill(type: string) {
  if (type === 'group') return '#a7f3d0'
  if (type === 'container') return '#bbf7d0'
  if (type === 'decision') return '#fde68a'
  if (type === 'terminal') return '#bfdbfe'
  if (type.startsWith('var-')) return '#ddd6fe'
  if (type === 'for-node') return '#fce7f3'
  if (type === 'type-convert') return '#e0f2fe'
  if (type === 'script-node') return '#fef3c7'
  return '#cbd5e1'
}

function nodePreviewFill(type: string) {
  if (type === 'group') return 'rgba(209, 250, 229, 0.92)'
  if (type === 'container') return 'rgba(236, 253, 245, 0.9)'
  if (type === 'decision') return 'rgba(254, 243, 199, 0.85)'
  if (type === 'terminal') return 'rgba(219, 234, 254, 0.9)'
  if (type.startsWith('var-')) return 'rgba(245, 243, 255, 0.95)'
  if (type === 'for-node') return 'rgba(252, 231, 243, 0.9)'
  if (type === 'type-convert') return 'rgba(224, 242, 254, 0.9)'
  if (type === 'script-node') return 'rgba(254, 243, 199, 0.85)'
  return 'rgba(241, 245, 249, 0.95)'
}

function edgeAnchors(sourceId: string, targetId: string) {
  const s = fc.state.nodes.find((n) => n.id === sourceId)
  const t = fc.state.nodes.find((n) => n.id === targetId)
  if (!s || !t) return { x1: 0, y1: 0, x2: 0, y2: 0 }
  const y1 = anchorYForSide(s, 'right')
  const y2 = anchorYForSide(t, 'left')
  return {
    x1: edgeAttachXRight(s),
    y1,
    x2: edgeAttachXLeft(t),
    y2,
  }
}

function edgeLineAttrs(e: {
  source: string
  target: string
  sourcePortId?: string
  targetPortId?: string
}) {
  const s = fc.state.nodes.find((n) => n.id === e.source)
  const t = fc.state.nodes.find((n) => n.id === e.target)
  if (s && t && e.sourcePortId && e.targetPortId) {
    const sp = s.ports.find((p) => p.id === e.sourcePortId)
    const tp = t.ports.find((p) => p.id === e.targetPortId)
    if (sp && tp) {
      const a1 = getPortAnchor(s, sp, 'source')
      const a2 = getPortAnchor(t, tp, 'target')
      return { x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y }
    }
  }
  const a = edgeAnchors(e.source, e.target)
  return {
    x1: a.x1,
    y1: a.y1,
    x2: a.x2,
    y2: a.y2,
  }
}

function edgePathD(edge: FlowEdge) {
  const { x1, y1, x2, y2 } = edgeLineAttrs(edge)
  return buildEdgePath(x1, y1, x2, y2, edge.route)
}

function edgeLabelPos(edge: FlowEdge) {
  const { x1, y1, x2, y2 } = edgeLineAttrs(edge)
  return edgeLabelPoint(x1, y1, x2, y2, edge.route)
}

function edgeIsMessage(edge: FlowEdge) {
  const s = fc.state.nodes.find((n) => n.id === edge.source)
  if (!s || !edge.sourcePortId) return false
  const p = s.ports.find((x) => x.id === edge.sourcePortId)
  return p?.kind === 'message'
}

function edgePriorityText(edge: FlowEdge) {
  return String(edge.messagePriority ?? 0)
}

const ctxMenu = ref<null | {
  kind: 'edge' | 'node'
  x: number
  y: number
  edgeId?: string
}>(null)

const canGroup = computed(() => {
  const ids = fc.state.selectedNodeIds
  if (ids.length < 2) return false
  const nodes = ids
    .map((id) => fc.state.nodes.find((n) => n.id === id))
    .filter((n): n is FlowNode => !!n)
  if (nodes.length < 2) return false
  const g = nodes[0].groupId
  return nodes.every((n) => n.groupId === g)
})

const canUngroup = computed(() => {
  if (fc.state.selectedNodeIds.length !== 1) return false
  const n = fc.state.nodes.find((x) => x.id === fc.state.selectedNodeIds[0])
  if (!n || (n.type !== 'group' && n.type !== 'container')) return false
  return fc.state.nodes.some((c) => c.groupId === n.id)
})

function closeCtxMenu() {
  ctxMenu.value = null
}

function onEdgeDown(e: MouseEvent, edgeId: string) {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  fc.setSelectedEdge(edgeId)
}

function openEdgeMenu(e: MouseEvent, edgeId: string) {
  e.preventDefault()
  e.stopPropagation()
  fc.setSelectedEdge(edgeId)
  ctxMenu.value = { kind: 'edge', x: e.clientX, y: e.clientY, edgeId }
}

function openNodeMenu(e: MouseEvent, n: FlowNode) {
  e.preventDefault()
  e.stopPropagation()
  if (!(e.ctrlKey || e.metaKey || e.shiftKey) && !fc.state.selectedNodeIds.includes(n.id)) {
    fc.setSelectedNode(n.id)
  }
  ctxMenu.value = { kind: 'node', x: e.clientX, y: e.clientY }
}

function applyEdgeRoute(route: EdgeRoute) {
  const id = ctxMenu.value?.edgeId ?? fc.state.selectedEdgeIds[0]
  if (!id) return
  fc.updateEdgeRoute(id, route)
  closeCtxMenu()
}

function deleteEdgeFromMenu() {
  const id = ctxMenu.value?.edgeId ?? fc.state.selectedEdgeIds[0]
  if (!id) return
  fc.removeEdge(id)
  closeCtxMenu()
}

function doGroupFromMenu() {
  fc.groupSelectedNodes()
  closeCtxMenu()
}

function doUngroupFromMenu() {
  const id = fc.state.selectedNodeIds[0]
  if (!id) return
  fc.ungroupNode(id)
  closeCtxMenu()
}

function onGlobalPointerDown(e: MouseEvent) {
  const t = e.target as HTMLElement | null
  if (t?.closest?.('.flow-ctx-menu')) return
  closeCtxMenu()
}

function onNodeDown(e: MouseEvent, id: string) {
  if (e.button !== 0) return
  if (linkDrag.value) return
  if (fc.state.connectMode) {
    e.preventDefault()
    e.stopPropagation()
    fc.pickNodeForConnect(id)
    return
  }
  e.preventDefault()
  e.stopPropagation()
  const additive = e.ctrlKey || e.metaKey || e.shiftKey
  if (additive) {
    fc.toggleSelect(id, true)
    return
  }
  fc.setSelectedNode(id)
  const w = screenToWorld(e.clientX, e.clientY)
  fc.startDrag(id, w.x, w.y)
}

function findInputPortAt(
  wx: number,
  wy: number,
): { nodeId: string; portId: string } | null {
  let best: { nodeId: string; portId: string; d: number } | null = null
  for (const n of fc.state.nodes) {
    for (const p of orderedPorts(n)) {
      if (p.direction !== 'in' && p.direction !== 'inout') continue
      const a = getPortAnchor(n, p, 'target')
      const d = Math.hypot(wx - a.x, wy - a.y)
      if (d < PORT_LINK_HIT && (!best || d < best.d)) {
        best = { nodeId: n.id, portId: p.id, d }
      }
    }
  }
  return best ? { nodeId: best.nodeId, portId: best.portId } : null
}

function onLinkDragMove(e: MouseEvent) {
  if (!linkDrag.value) return
  linkDragEnd.value = screenToWorld(e.clientX, e.clientY)
}

function onLinkDragUp(e: MouseEvent) {
  window.removeEventListener('mousemove', onLinkDragMove)
  window.removeEventListener('mouseup', onLinkDragUp)
  if (!linkDrag.value) return
  const w = screenToWorld(e.clientX, e.clientY)
  const hit = findInputPortAt(w.x, w.y)
  const ld = linkDrag.value
  linkDrag.value = null
  if (
    hit &&
    !(hit.nodeId === ld.sourceNodeId && hit.portId === ld.sourcePortId)
  ) {
    fc.addPortEdge(ld.sourceNodeId, ld.sourcePortId, hit.nodeId, hit.portId)
  }
}

function startLinkDrag(n: FlowNode, p: FlowPort) {
  const a = getPortAnchor(n, p, 'source')
  linkDrag.value = {
    x1: a.x,
    y1: a.y,
    sourceNodeId: n.id,
    sourcePortId: p.id,
  }
  linkDragEnd.value = { x: a.x, y: a.y }
  window.addEventListener('mousemove', onLinkDragMove)
  window.addEventListener('mouseup', onLinkDragUp)
}

function onPortMouseDown(e: MouseEvent, n: FlowNode, p: FlowPort, side: 'L' | 'R') {
  if (e.button !== 0) return
  if (fc.state.connectMode) {
    e.preventDefault()
    e.stopPropagation()
    fc.pickNodeForConnect(n.id)
    return
  }
  const canStartLink =
    side === 'R' && (p.direction === 'out' || p.direction === 'inout')
  if (canStartLink) {
    e.preventDefault()
    e.stopPropagation()
    startLinkDrag(n, p)
    return
  }
  e.preventDefault()
  e.stopPropagation()
  const additive = e.ctrlKey || e.metaKey || e.shiftKey
  if (additive) {
    fc.toggleSelect(n.id, true)
  } else {
    fc.setSelectedNode(n.id)
  }
  const w = screenToWorld(e.clientX, e.clientY)
  fc.startDrag(n.id, w.x, w.y)
}

function isBackgroundTarget(target: EventTarget | null) {
  const el = target as Element | null
  if (!el?.closest) return false
  return !el.closest('.flow-node')
}

function onSvgPointerDown(e: MouseEvent) {
  if (e.button !== 0) return
  if (linkDrag.value) return
  if (middlePanning.value) return
  if (fc.state.connectMode) return
  if (!isBackgroundTarget(e.target)) return
  if (!additiveMarquee(e)) {
    fc.clearSelection()
  }
  const w = screenToWorld(e.clientX, e.clientY)
  marqueeActive.value = true
  fc.setMarquee({ x1: w.x, y1: w.y, x2: w.x, y2: w.y })
  window.addEventListener('mousemove', onWindowMoveMarquee)
  window.addEventListener('mouseup', onWindowUpMarquee)
}

function additiveMarquee(e: MouseEvent) {
  return e.ctrlKey || e.metaKey
}

function onWindowMoveMarquee(e: MouseEvent) {
  if (!marqueeActive.value || !fc.state.marquee) return
  const w = screenToWorld(e.clientX, e.clientY)
  const m = fc.state.marquee
  fc.setMarquee({ ...m, x2: w.x, y2: w.y })
}

function onWindowUpMarquee(e: MouseEvent) {
  if (!marqueeActive.value) return
  marqueeActive.value = false
  window.removeEventListener('mousemove', onWindowMoveMarquee)
  window.removeEventListener('mouseup', onWindowUpMarquee)
  const m = fc.state.marquee
  fc.setMarquee(null)
  if (!m) return
  fc.selectFromMarquee(m.x1, m.y1, m.x2, m.y2, additiveMarquee(e))
}

function onCanvasMove(e: MouseEvent) {
  if (middlePanning.value || marqueeActive.value || resizing.value) return
  if (linkDrag.value) {
    linkDragEnd.value = screenToWorld(e.clientX, e.clientY)
    return
  }
  const w = screenToWorld(e.clientX, e.clientY)
  fc.dragTo(w.x, w.y)
}

function onResizeDown(
  e: MouseEvent,
  n: FlowNode,
  corner: 'nw' | 'ne' | 'sw' | 'se',
) {
  if (!n.scalable) return
  if (fc.selectedCount.value !== 1 || fc.state.selectedNodeIds[0] !== n.id) return
  e.preventDefault()
  e.stopPropagation()
  const w = screenToWorld(e.clientX, e.clientY)
  resizing.value = {
    id: n.id,
    corner,
    w0: n.width,
    h0: n.height,
    x0: n.x,
    y0: n.y,
    wx: w.x,
    wy: w.y,
  }
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeUp)
}

function onResizeMove(e: MouseEvent) {
  if (!resizing.value) return
  const w = screenToWorld(e.clientX, e.clientY)
  const d = resizing.value
  const dx = w.x - d.wx
  const dy = w.y - d.wy
  const c = d.corner
  if (c === 'se') {
    fc.updateNodeSize(d.id, d.w0 + dx, d.h0 + dy)
    return
  }
  let nw = d.w0
  let nh = d.h0
  let nx = d.x0
  let ny = d.y0
  if (c === 'sw') {
    nw = d.w0 - dx
    nh = d.h0 + dy
    nx = d.x0 + dx
  } else if (c === 'ne') {
    nw = d.w0 + dx
    nh = d.h0 - dy
    ny = d.y0 + dy
  } else if (c === 'nw') {
    nw = d.w0 - dx
    nh = d.h0 - dy
    nx = d.x0 + dx
    ny = d.y0 + dy
  }
  fc.updateNodePosition(d.id, nx, ny)
  fc.updateNodeSize(d.id, nw, nh)
}

function onResizeUp() {
  resizing.value = null
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeUp)
}

function onUp() {
  fc.endDrag()
}

function showResize(n: FlowNode) {
  return (
    n.scalable &&
    fc.state.selectedNodeIds.length === 1 &&
    fc.state.selectedNodeIds[0] === n.id
  )
}

function isFrameCollapsed(n: FlowNode) {
  return (
    (n.type === 'group' || n.type === 'container') &&
    n.settings.groupExpanded === false
  )
}

function groupBadgeText(n: FlowNode) {
  return n.settings.groupExpanded !== false
    ? t.value.groupStateOpen
    : t.value.groupStateClosed
}

function selOutline(n: FlowNode) {
  return {
    ox: n.x - SEL_OUT,
    oy: n.y - SEL_OUT,
    ow: n.width + 2 * SEL_OUT,
    oh: n.height + 2 * SEL_OUT,
  }
}

function nodeFill(type: string) {
  if (type === 'group') return '#d1fae5'
  if (type === 'container') return '#ecfdf5'
  if (type === 'decision') return '#fef3c7'
  if (type === 'terminal') return '#dbeafe'
  if (type === 'for-node') return '#fdf2f8'
  if (type === 'type-convert') return '#e0f2fe'
  if (type === 'script-node') return '#fffbeb'
  if (type.startsWith('var-')) return '#f5f3ff'
  return '#e5e7eb'
}

function nodeStroke(type: string) {
  if (type === 'group') return '#047857'
  if (type === 'container') return '#059669'
  if (type === 'for-node') return '#db2777'
  if (type === 'type-convert') return '#0284c7'
  if (type === 'script-node') return '#d97706'
  if (type.startsWith('var-')) return '#7c3aed'
  return '#94a3b8'
}

function portTypeClass(vt: FlowPort['valueType']) {
  return `port-type-${vt}`
}

const cx = EDITOR_SIZE.w / 2
const cy = EDITOR_SIZE.h / 2

onMounted(() => {
  window.addEventListener('mousedown', onGlobalPointerDown)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', onGlobalPointerDown)
  endMiddlePan()
  window.removeEventListener('mousemove', onWindowMoveMarquee)
  window.removeEventListener('mouseup', onWindowUpMarquee)
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeUp)
  window.removeEventListener('mousemove', onLinkDragMove)
  window.removeEventListener('mouseup', onLinkDragUp)
  linkDrag.value = null
})
</script>

<template>
  <section id="flowchart-editor" class="editor" aria-label="flowchart editor">
    <div class="head">
      <h2 class="title">{{ t.flowchartEditor }}</h2>
      <button
        type="button"
        class="panel-max-btn"
        :title="t.dockMaximize"
        @click="emit('toggleMaximize')"
      >
        {{ maximized ? '⧉' : '▢' }}
      </button>
    </div>
    <div
      class="svg-host"
      :class="{ 'is-panning': middlePanning }"
      @mouseleave="onUp"
    >
      <div class="shortcut-anchor">
        <button
          type="button"
          class="shortcut-btn"
          :title="t.shortcutsTitle"
          :aria-label="t.shortcutsTitle"
        >
          <svg class="shortcut-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 12H4V7h16v10zM6 9h2v2H6V9zm3 0h2v2H9V9zm3 0h2v2h-2V9zm3 0h2v2h-2V9zm3 0h2v2h-2V9zM6 12h8v2H6v-2zm9 0h3v2h-3v-2z"
            />
          </svg>
        </button>
        <div class="shortcut-popover" role="tooltip">
          <div v-for="(line, idx) in shortcutLines" :key="idx" class="shortcut-line">
            {{ line }}
          </div>
        </div>
      </div>
      <div class="zoom-hud" @mousedown.stop @click.stop>
        <button type="button" class="zh-btn" :title="t.zoomOutTitle" @click="zoomOut">
          −
        </button>
        <span class="zh-pct">{{ zoomPercent }}%</span>
        <button type="button" class="zh-btn" :title="t.zoomInTitle" @click="zoomIn">
          +
        </button>
        <button type="button" class="zh-btn zh-fit" :title="t.zoomFitTitle" @click="fitView">
          {{ t.zoomFit }}
        </button>
        <button type="button" class="zh-btn" :title="t.zoomResetTitle" @click="resetView">
          {{ t.zoomReset }}
        </button>
      </div>
      <svg
        ref="svgRef"
        class="svg-canvas"
        :viewBox="`0 0 ${EDITOR_SIZE.w} ${EDITOR_SIZE.h}`"
        preserveAspectRatio="xMidYMid meet"
        @mousedown.capture="onSvgMouseDownCapture"
        @mousedown="onSvgPointerDown"
        @mousemove="onCanvasMove"
        @mouseup="onUp"
        @wheel.prevent="onWheel"
      >
        <defs>
          <pattern
            id="flow-editor-grid"
            :width="GRID_STEP"
            :height="GRID_STEP"
            patternUnits="userSpaceOnUse"
          >
            <path
              :d="`M ${GRID_STEP} 0 L 0 0 0 ${GRID_STEP}`"
              fill="none"
              stroke="var(--grid-line, rgba(0,0,0,0.15))"
              stroke-width="1"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="var(--editor-bg)" />

        <g :transform="worldTransform">
          <rect
            :x="-WORLD_EXTENT / 2"
            :y="-WORLD_EXTENT / 2"
            :width="WORLD_EXTENT"
            :height="WORLD_EXTENT"
            fill="url(#flow-editor-grid)"
            opacity="0.95"
            pointer-events="none"
          />

          <line
            class="center-line"
            :x1="cx"
            :y1="-WORLD_EXTENT / 2"
            :x2="cx"
            :y2="WORLD_EXTENT / 2"
            pointer-events="none"
          />
          <line
            class="center-line"
            :x1="-WORLD_EXTENT / 2"
            :y1="cy"
            :x2="WORLD_EXTENT / 2"
            :y2="cy"
            pointer-events="none"
          />

          <g
            v-for="e in visibleEdges"
            :key="e.id"
            class="flow-edge"
            @contextmenu.prevent="openEdgeMenu($event, e.id)"
          >
            <path
              class="edge-vis"
              :class="{ 'edge-vis--selected': fc.isEdgeSelected(e.id) }"
              :d="edgePathD(e)"
              fill="none"
              stroke="#64748b"
              stroke-width="2"
              vector-effect="non-scaling-stroke"
              pointer-events="none"
            />
            <text
              v-if="edgeIsMessage(e)"
              :x="edgeLabelPos(e).x"
              :y="edgeLabelPos(e).y + 4"
              text-anchor="middle"
              class="edge-priority-label"
              font-size="12"
              font-weight="600"
              pointer-events="none"
            >
              {{ edgePriorityText(e) }}
            </text>
            <path
              class="edge-hit"
              :d="edgePathD(e)"
              fill="none"
              stroke="transparent"
              stroke-width="14"
              vector-effect="non-scaling-stroke"
              @mousedown="onEdgeDown($event, e.id)"
            />
          </g>
          <line
            v-if="linkDrag"
            :x1="linkDrag.x1"
            :y1="linkDrag.y1"
            :x2="linkDragEnd.x"
            :y2="linkDragEnd.y"
            stroke="var(--accent, #2563eb)"
            stroke-width="2"
            stroke-dasharray="6 4"
            vector-effect="non-scaling-stroke"
            pointer-events="none"
          />

          <g
            v-for="n in visibleNodes"
            :key="n.id"
            class="flow-node"
            :class="[n.className, { 'flow-node--selected': fc.isNodeSelected(n.id) }]"
            @contextmenu.prevent="openNodeMenu($event, n)"
          >
            <rect
              class="node-rect"
              :x="n.x"
              :y="n.y"
              :width="n.width"
              :height="n.height"
              rx="6"
              :fill="nodeFill(n.type)"
              :stroke="nodeStroke(n.type)"
              stroke-width="2"
              :stroke-dasharray="n.type === 'container' || n.type === 'group' ? '7 5' : '0'"
              vector-effect="non-scaling-stroke"
              @mousedown="onNodeDown($event, n.id)"
            />
            <rect
              :x="n.x"
              :y="n.y"
              :width="n.width"
              :height="NODE_TITLE_H"
              rx="6"
              :fill="nodeTitleFill(n.type)"
              pointer-events="none"
            />
            <text
              :x="n.x + n.width / 2"
              :y="n.y + 15"
              text-anchor="middle"
              class="node-title-text"
              font-size="12"
              font-weight="600"
              pointer-events="none"
            >
              {{ n.label }}
            </text>
            <text
              v-if="n.type === 'group' || n.type === 'container'"
              :x="n.x + n.width - 6"
              :y="n.y + 14"
              text-anchor="end"
              class="group-badge"
              font-size="11"
              font-weight="700"
              pointer-events="none"
            >
              {{ groupBadgeText(n) }}
            </text>
            <rect
              v-if="n.type === 'group' || n.type === 'container'"
              :x="n.x"
              :y="n.y"
              :width="n.width"
              :height="NODE_TITLE_H"
              class="title-hit"
              fill="transparent"
              @mousedown.stop
              @dblclick.stop="fc.toggleGroupExpanded(n.id)"
            />
            <g v-if="!isFrameCollapsed(n)">
            <rect
              :x="n.x"
              :y="n.y + NODE_TITLE_H"
              :width="n.width"
              :height="NODE_PREVIEW_H"
              :fill="nodePreviewFill(n.type)"
              pointer-events="none"
            />
            <g
              :transform="previewIconTransform(n)"
              class="node-preview-icon"
              pointer-events="none"
            >
              <path
                :d="previewIconD(n.type)"
                fill="none"
                :stroke="previewIconStroke(n.type)"
                stroke-width="1.6"
                stroke-linejoin="round"
                vector-effect="non-scaling-stroke"
              />
            </g>
            <template v-for="i in rowIndices(n)" :key="`${n.id}-lbl-${i}`">
              <text
                :x="n.x + n.width / 2"
                :y="
                  portRowY(n, i, Math.max(orderedPorts(n).length, 1)) + 4
                "
                text-anchor="middle"
                class="node-row-label"
                font-size="11"
                pointer-events="none"
              >
                {{ rowCenterLabel(n, i) }}
              </text>
            </template>
            <g v-for="(p, i) in orderedPorts(n)" :key="p.id">
              <g
                v-if="p.direction === 'in' || p.direction === 'inout'"
                @mouseenter="setPortHover(portHoverKey(n, p, 'L'))"
                @mouseleave="setPortHover(null)"
              >
                <title>{{ p.name }}</title>
                <circle
                  v-if="p.kind === 'numeric'"
                  class="port-hit"
                  :cx="numericCxLeft(n)"
                  :cy="portRowY(n, i, Math.max(orderedPorts(n).length, 1))"
                  :r="PORT_R_NUMERIC + 4"
                  fill="transparent"
                  @mousedown="onPortMouseDown($event, n, p, 'L')"
                />
                <circle
                  v-if="p.kind === 'numeric'"
                  :class="[
                    'port-dot',
                    'port-dot--in',
                    portTypeClass(p),
                    {
                      'port-dot--hover':
                        hoverPortKey === portHoverKey(n, p, 'L'),
                    },
                  ]"
                  :cx="numericCxLeft(n)"
                  :cy="portRowY(n, i, Math.max(orderedPorts(n).length, 1))"
                  :r="PORT_R_NUMERIC"
                  vector-effect="non-scaling-stroke"
                  @mousedown="onPortMouseDown($event, n, p, 'L')"
                />
                <path
                  v-else
                  :class="[
                    'port-msg',
                    'port-msg--in',
                    portTypeClass(p),
                    {
                      'port-msg--hover':
                        hoverPortKey === portHoverKey(n, p, 'L'),
                    },
                  ]"
                  :d="
                    messagePortPathLeft(
                      n,
                      portRowY(n, i, Math.max(orderedPorts(n).length, 1)),
                    )
                  "
                  vector-effect="non-scaling-stroke"
                  @mousedown="onPortMouseDown($event, n, p, 'L')"
                />
              </g>
              <g
                v-if="p.direction === 'out' || p.direction === 'inout'"
                @mouseenter="setPortHover(portHoverKey(n, p, 'R'))"
                @mouseleave="setPortHover(null)"
              >
                <title>{{ p.name }}</title>
                <circle
                  v-if="p.kind === 'numeric'"
                  class="port-hit"
                  :cx="numericCxRight(n)"
                  :cy="portRowY(n, i, Math.max(orderedPorts(n).length, 1))"
                  :r="PORT_R_NUMERIC + 4"
                  fill="transparent"
                  @mousedown="onPortMouseDown($event, n, p, 'R')"
                />
                <circle
                  v-if="p.kind === 'numeric'"
                  :class="[
                    'port-dot',
                    'port-dot--out',
                    portTypeClass(p),
                    {
                      'port-dot--hover':
                        hoverPortKey === portHoverKey(n, p, 'R'),
                    },
                  ]"
                  :cx="numericCxRight(n)"
                  :cy="portRowY(n, i, Math.max(orderedPorts(n).length, 1))"
                  :r="PORT_R_NUMERIC"
                  vector-effect="non-scaling-stroke"
                  @mousedown="onPortMouseDown($event, n, p, 'R')"
                />
                <path
                  v-else
                  :class="[
                    'port-msg',
                    'port-msg--out',
                    portTypeClass(p),
                    {
                      'port-msg--hover':
                        hoverPortKey === portHoverKey(n, p, 'R'),
                    },
                  ]"
                  :d="
                    messagePortPathRight(
                      n,
                      portRowY(n, i, Math.max(orderedPorts(n).length, 1)),
                    )
                  "
                  vector-effect="non-scaling-stroke"
                  @mousedown="onPortMouseDown($event, n, p, 'R')"
                />
              </g>
            </g>
            </g>
          </g>

          <g v-for="n in selectedChromeNodes" :key="'chrome-' + n.id" class="selection-layer">
            <rect
              class="sel-outline"
              :x="selOutline(n).ox"
              :y="selOutline(n).oy"
              :width="selOutline(n).ow"
              :height="selOutline(n).oh"
              fill="none"
              stroke="var(--accent, #2563eb)"
              stroke-width="1"
              pointer-events="none"
            />
            <template v-if="showResizeHandles && showResize(n)">
              <rect
                class="corner-handle"
                :x="selOutline(n).ox - H_HANDLE / 2"
                :y="selOutline(n).oy - H_HANDLE / 2"
                :width="H_HANDLE"
                :height="H_HANDLE"
                @mousedown.stop="onResizeDown($event, n, 'nw')"
              />
              <rect
                class="corner-handle"
                :x="selOutline(n).ox + selOutline(n).ow - H_HANDLE / 2"
                :y="selOutline(n).oy - H_HANDLE / 2"
                :width="H_HANDLE"
                :height="H_HANDLE"
                @mousedown.stop="onResizeDown($event, n, 'ne')"
              />
              <rect
                class="corner-handle"
                :x="selOutline(n).ox - H_HANDLE / 2"
                :y="selOutline(n).oy + selOutline(n).oh - H_HANDLE / 2"
                :width="H_HANDLE"
                :height="H_HANDLE"
                @mousedown.stop="onResizeDown($event, n, 'sw')"
              />
              <rect
                class="corner-handle"
                :x="selOutline(n).ox + selOutline(n).ow - H_HANDLE / 2"
                :y="selOutline(n).oy + selOutline(n).oh - H_HANDLE / 2"
                :width="H_HANDLE"
                :height="H_HANDLE"
                @mousedown.stop="onResizeDown($event, n, 'se')"
              />
            </template>
          </g>

          <rect
            v-if="fc.state.marquee"
            class="marquee-rect"
            :x="Math.min(fc.state.marquee.x1, fc.state.marquee.x2)"
            :y="Math.min(fc.state.marquee.y1, fc.state.marquee.y2)"
            :width="Math.abs(fc.state.marquee.x2 - fc.state.marquee.x1)"
            :height="Math.abs(fc.state.marquee.y2 - fc.state.marquee.y1)"
            fill="rgba(37, 99, 235, 0.12)"
            stroke="var(--accent)"
            stroke-width="1"
            stroke-dasharray="4 3"
            pointer-events="none"
          />
        </g>
      </svg>
    </div>
    <Teleport to="body">
      <div
        v-if="ctxMenu"
        class="flow-ctx-menu"
        :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
        @mousedown.stop
      >
        <template v-if="ctxMenu.kind === 'edge'">
          <button type="button" class="ctx-item" @click="applyEdgeRoute('straight')">
            {{ t.edgeRouteStraight }}
          </button>
          <button type="button" class="ctx-item" @click="applyEdgeRoute('curve')">
            {{ t.edgeRouteCurve }}
          </button>
          <button type="button" class="ctx-item" @click="applyEdgeRoute('polyline')">
            {{ t.edgeRoutePolyline }}
          </button>
          <hr class="ctx-sep" />
          <button type="button" class="ctx-item ctx-danger" @click="deleteEdgeFromMenu">
            {{ t.ctxDeleteEdge }}
          </button>
        </template>
        <template v-else>
          <button
            v-if="canGroup"
            type="button"
            class="ctx-item"
            @click="doGroupFromMenu"
          >
            {{ t.ctxGroup }}
          </button>
          <button
            v-if="canUngroup"
            type="button"
            class="ctx-item"
            @click="doUngroupFromMenu"
          >
            {{ t.ctxUngroup }}
          </button>
          <p v-if="!canGroup && !canUngroup" class="ctx-muted">{{ t.ctxNoActions }}</p>
        </template>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  align-self: stretch;
  width: 100%;
  min-height: 0;
  flex: 1;
  height: 100%;
  padding: 0;
  overflow: hidden;
  background: var(--surface);
  border: none;
  border-radius: 0;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 0.35rem 0.5rem;
  margin: 0;
  border-bottom: 1px solid var(--border);
}
.panel-max-btn {
  flex-shrink: 0;
  padding: 0.15rem 0.35rem;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  line-height: 1.2;
  cursor: default;
}
.panel-max-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}
.svg-host {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  border: none;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}
.shortcut-anchor {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 6;
}
.shortcut-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: default;
}
.shortcut-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.shortcut-ico {
  width: 18px;
  height: 18px;
  display: block;
}
.shortcut-popover {
  display: none;
  position: absolute;
  left: calc(100% + 6px);
  top: 0;
  min-width: 260px;
  max-width: min(380px, calc(100vw - 48px));
  max-height: min(72vh, 420px);
  overflow-y: auto;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  font-size: 12px;
  line-height: 1.45;
  color: var(--text);
  text-align: left;
}
.shortcut-popover::before {
  content: '';
  position: absolute;
  right: 100%;
  width: 10px;
  top: 0;
  bottom: 0;
}
.shortcut-anchor:hover .shortcut-popover,
.shortcut-anchor:focus-within .shortcut-popover {
  display: block;
}
.shortcut-line {
  padding: 3px 0;
  border-bottom: 1px solid var(--border);
}
.shortcut-line:last-child {
  border-bottom: none;
}
.zoom-hud {
  position: absolute;
  left: 8px;
  bottom: 8px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  font-size: 12px;
  color: var(--text);
  user-select: none;
}
.zh-pct {
  min-width: 3.2rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.zh-btn {
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  cursor: default;
  line-height: 1.2;
}
.zh-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.zh-fit {
  padding-inline: 6px;
}
.svg-host.is-panning {
  cursor: grabbing;
}
.svg-canvas {
  display: block;
  width: 100%;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  height: 100%;
  user-select: none;
  touch-action: none;
  cursor: crosshair;
}
.node-rect {
  cursor: grab;
}
.selection-layer .sel-outline {
  shape-rendering: crispEdges;
}
.corner-handle {
  cursor: nwse-resize;
  fill: #fff;
  stroke: var(--accent, #2563eb);
  stroke-width: 1;
  pointer-events: all;
}
.title-hit {
  cursor: pointer;
}
.group-badge {
  fill: var(--accent, #2563eb);
}
.node-rect:active {
  cursor: grabbing;
}
.center-line {
  stroke: var(--grid-center-line, rgba(37, 99, 235, 0.45));
  stroke-width: 2px;
  vector-effect: non-scaling-stroke;
  stroke-opacity: 1;
}
.node-title-text {
  fill: var(--text);
}
.node-row-label {
  fill: var(--muted);
}
.port-msg {
  stroke: #334155;
  stroke-width: 1.2;
  cursor: grab;
}
.port-msg.port-type-string {
  fill: #93c5fd;
}
.port-msg.port-type-int {
  fill: #86efac;
}
.port-msg.port-type-float {
  fill: #fcd34d;
}
.port-msg.port-type-vector {
  fill: #c4b5fd;
}
.port-msg.port-type-matrix {
  fill: #f9a8d4;
}
.port-msg.port-type-table {
  fill: #a5b4fc;
}
.port-msg.port-type-list {
  fill: #5eead4;
}
.port-dot.port-type-table {
  fill: #a5b4fc;
}
.port-dot.port-type-list {
  fill: #5eead4;
}
.port-dot--hover {
  stroke: var(--accent) !important;
  stroke-width: 3px !important;
}
.port-msg--hover {
  stroke: var(--accent) !important;
  stroke-width: 2.2px !important;
  filter: drop-shadow(0 0 2px var(--accent));
}
.port-hit {
  cursor: grab;
  pointer-events: all;
}
.port-dot {
  cursor: grab;
  stroke: #334155;
  stroke-width: 1.5;
}
.port-type-string {
  fill: #93c5fd;
}
.port-type-int {
  fill: #86efac;
}
.port-type-float {
  fill: #fcd34d;
}
.port-type-vector {
  fill: #c4b5fd;
}
.port-type-matrix {
  fill: #f9a8d4;
}
.marquee-rect {
  pointer-events: none;
}
.edge-vis--selected {
  stroke: var(--accent, #2563eb) !important;
  stroke-width: 3px !important;
}
.edge-priority-label {
  fill: var(--text);
  paint-order: stroke fill;
  stroke: var(--editor-bg, #fff);
  stroke-width: 3px;
}
</style>
<style>
/* Teleport 到 document.body，不用 scoped */
.flow-ctx-menu {
  position: fixed;
  z-index: 10000;
  min-width: 10rem;
  padding: 0.25rem 0;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 6px;
  background: var(--surface, #fff);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.flow-ctx-menu .ctx-item {
  display: block;
  width: 100%;
  padding: 0.35rem 0.75rem;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 12px;
  color: var(--text, #0f172a);
  cursor: pointer;
}
.flow-ctx-menu .ctx-item:hover {
  background: var(--bg, #f1f5f9);
}
.flow-ctx-menu .ctx-danger {
  color: #b91c1c;
}
.flow-ctx-menu .ctx-sep {
  margin: 0.25rem 0;
  border: none;
  border-top: 1px solid var(--border, #e2e8f0);
}
.flow-ctx-menu .ctx-muted {
  margin: 0;
  padding: 0.35rem 0.75rem;
  font-size: 12px;
  color: var(--muted, #64748b);
}
</style>
