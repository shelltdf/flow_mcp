import type { FlowNode, FlowPort } from '../stores/flowchart'

/** 标题栏高度 */
export const NODE_TITLE_H = 22
/** 预览区高度 */
export const NODE_PREVIEW_H = 34
/** 属性区单行高度（用于排版） */
export const NODE_ROW_H = 18

/** 数值端口半径（较大，便于点击） */
export const PORT_R_NUMERIC = 8
/** 端口中心相对节点边向外偏移 */
export const PORT_EDGE_OUTSET = 5

export function nodeChromeTop(n: FlowNode) {
  return n.y
}

export function nodeTitleBottom(n: FlowNode) {
  return n.y + NODE_TITLE_H
}

export function nodePreviewBottom(n: FlowNode) {
  return n.y + NODE_TITLE_H + NODE_PREVIEW_H
}

/** 属性区上边界 */
export function nodeContentTop(n: FlowNode) {
  return nodePreviewBottom(n)
}

export function nodeContentHeight(n: FlowNode) {
  return Math.max(8, n.height - NODE_TITLE_H - NODE_PREVIEW_H)
}

export function leftPorts(ports: FlowPort[]) {
  return ports.filter((p) => p.direction === 'in' || p.direction === 'inout')
}

export function rightPorts(ports: FlowPort[]) {
  return ports.filter((p) => p.direction === 'out' || p.direction === 'inout')
}

/**
 * 画布显示顺序：消息（固有 → 用户）→ 数值固有 → 数值用户
 */
export function orderedPortsFromList(ports: FlowPort[]): FlowPort[] {
  const msg = ports.filter((p) => p.kind === 'message')
  const msgInh = msg.filter((p) => p.origin === 'inherent')
  const msgUsr = msg.filter((p) => p.origin === 'user')
  const numInh = ports.filter((p) => p.kind === 'numeric' && p.origin === 'inherent')
  const numUsr = ports.filter((p) => p.kind === 'numeric' && p.origin === 'user')
  return [...msgInh, ...msgUsr, ...numInh, ...numUsr]
}

export function orderedPorts(n: FlowNode): FlowPort[] {
  return orderedPortsFromList(n.ports)
}

export function nodeRowCount(n: FlowNode) {
  const c = orderedPorts(n).length
  return Math.max(c, 1)
}

/** 某行在属性区的垂直位置（按 orderedPorts 下标） */
export function portRowY(n: FlowNode, index: number, count: number) {
  const top = nodeContentTop(n)
  const h = nodeContentHeight(n)
  const pad = 3
  const inner = Math.max(4, h - 2 * pad)
  if (count <= 0) return top + h / 2
  if (count === 1) return top + h / 2
  return top + pad + (index + 0.5) * (inner / count)
}

/** 根据有序端口行数计算最小节点高度 */
export function minNodeHeightForOrderedPortRows(rowCount: number) {
  const rows = Math.max(rowCount, 1)
  return NODE_TITLE_H + NODE_PREVIEW_H + Math.max(24, rows * NODE_ROW_H + 10)
}

/** 数值端口圆心 X（靠外） */
export function numericCxLeft(n: FlowNode) {
  return n.x - PORT_EDGE_OUTSET
}

export function numericCxRight(n: FlowNode) {
  return n.x + n.width + PORT_EDGE_OUTSET
}

/** 连线端点：右侧输出（从圆外缘接出） */
export function edgeAttachXRight(n: FlowNode) {
  return n.x + n.width + PORT_EDGE_OUTSET + PORT_R_NUMERIC
}

export function edgeAttachXLeft(n: FlowNode) {
  return n.x - PORT_EDGE_OUTSET - PORT_R_NUMERIC
}

/**
 * 左侧消息端口路径（靠外）：与原先「右侧」几何对调，修正输入/输出形左右反了的问题
 */
export function messagePortPathLeft(n: FlowNode, py: number) {
  const xr = n.x - PORT_EDGE_OUTSET
  const tip = 5
  const w = 12
  const h = 12
  const y0 = py - h / 2
  return `M ${xr} ${y0} L ${xr - w + tip} ${y0} L ${xr - w} ${py} L ${xr - w + tip} ${y0 + h} L ${xr} ${y0 + h} L ${xr - tip} ${py} Z`
}

/**
 * 右侧消息端口路径（靠外）：与原先「左侧」几何对调
 */
export function messagePortPathRight(n: FlowNode, py: number) {
  const x = n.x + n.width + PORT_EDGE_OUTSET
  const tip = 5
  const w = 12
  const h = 12
  const y0 = py - h / 2
  return `M ${x} ${y0} L ${x + w - tip} ${y0} L ${x + w} ${py} L ${x + w - tip} ${y0 + h} L ${x} ${y0 + h} L ${x + tip} ${py} Z`
}

export function portDisplayText(p: FlowPort) {
  const v = (p.valueDisplay ?? '').trim()
  if (!v) return p.name
  return `${p.name}: ${v}`
}

/** 用于连线的垂直锚点：取该侧端口中位所在行 */
export function anchorYForSide(n: FlowNode, side: 'left' | 'right') {
  const ord = orderedPorts(n)
  const ports =
    side === 'left'
      ? ord.filter((p) => p.direction === 'in' || p.direction === 'inout')
      : ord.filter((p) => p.direction === 'out' || p.direction === 'inout')
  if (ports.length === 0) return n.y + n.height / 2
  const mid = ports[Math.floor((ports.length - 1) / 2)]
  const idx = ord.indexOf(mid)
  return portRowY(n, idx, ord.length)
}

/** 消息端口箭头宽度（与 messagePortPathLeft/Right 中 w 一致） */
const MSG_ARROW_W = 12

/**
 * 连线端点：从输出侧（source）或接到输入侧（target）的几何位置。
 * - numeric：圆外缘（与 edgeAttachX* 一致）
 * - message：箭头尖端
 */
export function getPortAnchor(
  n: FlowNode,
  port: FlowPort,
  end: 'source' | 'target',
): { x: number; y: number } {
  const ord = orderedPorts(n)
  const i = Math.max(0, ord.findIndex((p) => p.id === port.id))
  const len = Math.max(ord.length, 1)
  const py = portRowY(n, i, len)

  if (end === 'source') {
    if (port.kind === 'numeric') {
      return { x: edgeAttachXRight(n), y: py }
    }
    const x = n.x + n.width + PORT_EDGE_OUTSET
    return { x: x + MSG_ARROW_W, y: py }
  }
  if (port.kind === 'numeric') {
    return { x: edgeAttachXLeft(n), y: py }
  }
  const xr = n.x - PORT_EDGE_OUTSET
  return { x: xr - MSG_ARROW_W, y: py }
}
