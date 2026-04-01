import { reactive, watch } from 'vue'
import type { Locale } from '@/i18n/messages'

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_LOCALE = 'flowchart.locale'
const STORAGE_THEME = 'flowchart.theme'

function readSystemDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDomTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'system') {
    root.removeAttribute('data-theme')
    root.style.colorScheme = readSystemDark() ? 'dark' : 'light'
  } else if (mode === 'light') {
    root.setAttribute('data-theme', 'light')
    root.style.colorScheme = 'light'
  } else {
    root.setAttribute('data-theme', 'dark')
    root.style.colorScheme = 'dark'
  }
}

const state = reactive({
  locale: (localStorage.getItem(STORAGE_LOCALE) as Locale) || 'zh',
  theme: (localStorage.getItem(STORAGE_THEME) as ThemeMode) || 'system',
})

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'system') applyDomTheme('system')
  })
}

applyDomTheme(state.theme)

watch(
  () => state.locale,
  (v) => localStorage.setItem(STORAGE_LOCALE, v),
)
watch(
  () => state.theme,
  (v) => {
    localStorage.setItem(STORAGE_THEME, v)
    applyDomTheme(v)
  },
)

export function useAppSettings() {
  return { state }
}
