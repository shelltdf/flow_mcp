import { onUnmounted, ref, type Ref } from 'vue'

export function usePanelSplitters(
  containerRef: Ref<HTMLElement | null>,
  opts: {
    initialUpperPx: number
    initialLeftPx: number
    minUpper: number
    minLower: number
    minLeft: number
    minRight: number
    splitterSize: number
  },
) {
  const upperPx = ref(opts.initialUpperPx)
  const leftPx = ref(opts.initialLeftPx)

  let drag: 'h' | 'v' | null = null
  let startY = 0
  let startX = 0
  let startUpper = 0
  let startLeft = 0
  function bounds() {
    const el = containerRef.value
    if (!el) return { w: 0, h: 0 }
    return { w: el.clientWidth, h: el.clientHeight }
  }

  function onMove(e: MouseEvent) {
    if (!drag || !containerRef.value) return
    const { w, h } = bounds()
    if (drag === 'h') {
      const dy = e.clientY - startY
      let next = startUpper + dy
      const max = Math.max(opts.minUpper, h - opts.minLower - opts.splitterSize)
      next = Math.max(opts.minUpper, Math.min(next, max))
      upperPx.value = next
    } else {
      const dx = e.clientX - startX
      let next = startLeft + dx
      const max = Math.max(opts.minLeft, w - opts.minRight - opts.splitterSize)
      next = Math.max(opts.minLeft, Math.min(next, max))
      leftPx.value = next
    }
  }

  function onUp() {
    drag = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  function startHorizontal(e: MouseEvent) {
    e.preventDefault()
    if (!containerRef.value) return
    drag = 'h'
    startY = e.clientY
    startUpper = upperPx.value
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function startVertical(e: MouseEvent) {
    e.preventDefault()
    if (!containerRef.value) return
    drag = 'v'
    startX = e.clientX
    startLeft = leftPx.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  onUnmounted(onUp)

  return {
    upperPx,
    leftPx,
    startHorizontal,
    startVertical,
  }
}
