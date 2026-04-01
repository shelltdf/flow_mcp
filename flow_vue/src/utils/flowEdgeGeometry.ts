import type { FlowEdge, FlowNode } from '@/stores/flowchart'
import {
  anchorYForSide,
  edgeAttachXLeft,
  edgeAttachXRight,
  getPortAnchor,
} from '@/utils/flowNodeLayout'

export type EdgeRoute = 'straight' | 'curve' | 'polyline'

export function getEdgeEndpoints(
  e: FlowEdge,
  nodes: FlowNode[],
): { x1: number; y1: number; x2: number; y2: number } {
  const s = nodes.find((n) => n.id === e.source)
  const t = nodes.find((n) => n.id === e.target)
  if (!s || !t) return { x1: 0, y1: 0, x2: 0, y2: 0 }
  if (e.sourcePortId && e.targetPortId) {
    const sp = s.ports.find((p) => p.id === e.sourcePortId)
    const tp = t.ports.find((p) => p.id === e.targetPortId)
    if (sp && tp) {
      const a1 = getPortAnchor(s, sp, 'source')
      const a2 = getPortAnchor(t, tp, 'target')
      return { x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y }
    }
  }
  const y1 = anchorYForSide(s, 'right')
  const y2 = anchorYForSide(t, 'left')
  return {
    x1: edgeAttachXRight(s),
    y1,
    x2: edgeAttachXLeft(t),
    y2,
  }
}

export function edgeRoute(e: FlowEdge): EdgeRoute {
  return e.route ?? 'straight'
}

function cubicPoint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  t: number,
) {
  const u = 1 - t
  const ut = u * u * u
  const tt = t * t * t
  const x =
    ut * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + tt * x3
  const y =
    ut * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + tt * y3
  return { x, y }
}

/** SVG path d，用于可见边与命中 */
export function edgePathD(
  e: FlowEdge,
  nodes: FlowNode[],
  route: EdgeRoute,
): string {
  const { x1, y1, x2, y2 } = getEdgeEndpoints(e, nodes)
  if (route === 'straight') {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }
  if (route === 'polyline') {
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`
  }
  const dx = x2 - x1
  const off = Math.min(140, Math.max(40, Math.abs(dx) * 0.45))
  const cx1 = x1 + off
  const cy1 = y1
  const cx2 = x2 - off
  const cy2 = y2
  return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`
}

/** 消息优先级标签位置（路径中点附近） */
export function edgeLabelPoint(
  e: FlowEdge,
  nodes: FlowNode[],
  route: EdgeRoute,
): { x: number; y: number } {
  const { x1, y1, x2, y2 } = getEdgeEndpoints(e, nodes)
  if (route === 'straight') {
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
  }
  if (route === 'polyline') {
    const mx = (x1 + x2) / 2
    return { x: mx, y: (y1 + y2) / 2 }
  }
  const dx = x2 - x1
  const off = Math.min(140, Math.max(40, Math.abs(dx) * 0.45))
  const cx1 = x1 + off
  const cy1 = y1
  const cx2 = x2 - off
  const cy2 = y2
  return cubicPoint(x1, y1, cx1, cy1, cx2, cy2, x2, y2, 0.5)
}

function distPointSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const vx = bx - ax
  const vy = by - ay
  const len2 = vx * vx + vy * vy
  if (len2 < 1e-12) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * vx + (py - ay) * vy) / len2
  t = Math.max(0, Math.min(1, t))
  const qx = ax + t * vx
  const qy = ay + t * vy
  return Math.hypot(px - qx, py - qy)
}

/** 世界坐标到连线的最短距离（用于选中） */
export function distanceToEdgePath(
  wx: number,
  wy: number,
  e: FlowEdge,
  nodes: FlowNode[],
  route: EdgeRoute,
): number {
  const { x1, y1, x2, y2 } = getEdgeEndpoints(e, nodes)
  if (route === 'straight') {
    return distPointSegment(wx, wy, x1, y1, x2, y2)
  }
  if (route === 'polyline') {
    const mx = (x1 + x2) / 2
    return Math.min(
      distPointSegment(wx, wy, x1, y1, mx, y1),
      distPointSegment(wx, wy, mx, y1, mx, y2),
      distPointSegment(wx, wy, mx, y2, x2, y2),
    )
  }
  const dx = x2 - x1
  const off = Math.min(140, Math.max(40, Math.abs(dx) * 0.45))
  const cx1 = x1 + off
  const cy1 = y1
  const cx2 = x2 - off
  const cy2 = y2
  let best = Infinity
  const steps = 48
  let px0 = x1
  let py0 = y1
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const p = cubicPoint(x1, y1, cx1, cy1, cx2, cy2, x2, y2, t)
    best = Math.min(
      best,
      distPointSegment(wx, wy, px0, py0, p.x, p.y),
    )
    px0 = p.x
    py0 = p.y
  }
  return best
}

export function isMessageEdge(e: FlowEdge, nodes: FlowNode[]): boolean {
  const s = nodes.find((n) => n.id === e.source)
  const t = nodes.find((n) => n.id === e.target)
  if (!s || !t) return false
  if (!e.sourcePortId || !e.targetPortId) return false
  const sp = s.ports.find((p) => p.id === e.sourcePortId)
  const tp = t.ports.find((p) => p.id === e.targetPortId)
  return !!(sp && tp && sp.kind === 'message' && tp.kind === 'message')
}
