import { onMounted, onUnmounted, ref } from 'vue'

export function useFullscreen() {
  const isFullscreen = ref(false)

  function sync() {
    isFullscreen.value = !!document.fullscreenElement
  }

  async function toggle() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      /* 浏览器策略或权限导致失败时静默 */
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', sync)
    sync()
  })

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', sync)
  })

  return { isFullscreen, toggle }
}
