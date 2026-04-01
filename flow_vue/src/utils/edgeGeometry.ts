import type { EdgeRoute } from '@/stores/flowchart'

/** 根据端点与走向生成 SVG path d */
export function buildEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  route: EdgeRoute | undefined,
): string {
  const r: EdgeRoute = route ?? 'straight'
  if (r === 'straight') {
    return `M ${x1} ${y1} L ${x2} ${y2}`
  }
  if (r === 'curve') {
    const dx = Math.max(Math.abs(x2 - x1) * 0.45, 48)
    const cx1 = x1 + dx
    const cy1 = y1
    const cx2 = x2 - dx
    const cy2 = y2
    return `M ${x1} ${y1} C ${cx1} ${cy1} ${cx2} ${cy2} ${x2} ${y2}`
  }
  const mx = (x1 + x2) / 2
  return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`
}

/** 用于中点标签的大致位置（与 path 接近） */
export function edgeLabelPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  route: EdgeRoute | undefined,
): { x: number; y: number } {
  const r: EdgeRoute = route ?? 'straight'
  if (r === 'curve') {
    const dx = Math.max(Math.abs(x2 - x1) * 0.45, 48)
    const p0 = { x: x1, y: y1 }
    const p1 = { x: x1 + dx, y: y1 }
    const p2 = { x: x2 - dx, y: y2 }
    const p3 = { x: x2, y: y2 }
    const t = 0.5
    const mt = 1 - t
    const x =
      mt ** 3 * p0.x +
      3 * mt ** 2 * t * p1.x +
      3 * mt * t ** 2 * p2.x +
      t ** 3 * p3.x
    const y =
      mt ** 3 * p0.y +
      3 * mt ** 2 * t * p1.y +
      3 * mt * t ** 2 * p2.y +
      t ** 3 * p3.y
    return { x, y }
  }
  if (r === 'polyline') {
    const mx = (x1 + x2) / 2
    return { x: mx, y: (y1 + y2) / 2 }
  }
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 }
}
