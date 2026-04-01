import { onUnmounted, type Ref } from 'vue'

/** 右侧 Dock 与主工作区之间的纵向分割条拖动 */
export function useDockResize(
  dockWidthPx: Ref<number>,
  opts: { min: number; getMax: () => number },
) {
  function start(e: MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = dockWidthPx.value
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const max = opts.getMax()
      dockWidthPx.value = Math.max(opts.min, Math.min(max, startW + dx))
    }
    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  onUnmounted(() => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  return { start }
}
