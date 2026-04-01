<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { messages, type Locale } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import type { ThemeMode } from '@/stores/appSettings'

defineProps<{ documentTitle: string }>()

const emit = defineEmits<{
  fileNew: []
  fileOpen: []
  fileSave: []
  fileSaveAs: []
}>()

const { state: settings } = useAppSettings()
const t = computed(() => messages[settings.locale])

const openMenu = ref<null | 'file' | 'lang' | 'theme' | 'help'>(null)

function toggle(m: 'file' | 'lang' | 'theme' | 'help') {
  openMenu.value = openMenu.value === m ? null : m
}

function closeMenus() {
  openMenu.value = null
}

function onDocClick(e: MouseEvent) {
  const target = e.target as Node
  if (target instanceof Element && target.closest('[data-winmenu-root]')) return
  closeMenus()
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

function setLocale(loc: Locale) {
  settings.locale = loc
  closeMenus()
}

function setTheme(m: ThemeMode) {
  settings.theme = m
  closeMenus()
}

function emitClose(fn: () => void) {
  fn()
  closeMenus()
}
</script>

<template>
  <div data-winmenu-root class="win-shell">
    <!-- Windows 风格标题栏（类 Win10 活动窗口蓝色标题条） -->
    <div class="title-bar" role="banner">
      <span class="title-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="#fff" opacity="0.9" />
          <path d="M4 5h8M4 8h6M4 11h8" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </span>
      <span class="title-text">{{ t.appTitle }} — {{ documentTitle }}</span>
      <span class="title-spacer" />
      <span class="sys-btns" aria-hidden="true">
        <button type="button" class="sys-btn min" tabindex="-1" title="Minimize">&#x2212;</button>
        <button type="button" class="sys-btn max" tabindex="-1" title="Maximize">&#x25a1;</button>
        <button type="button" class="sys-btn close" tabindex="-1" title="Close">&#x2715;</button>
      </span>
    </div>

    <!-- 经典菜单栏：单行顶层菜单 + 下拉 -->
    <div class="menu-bar" role="menubar">
      <div class="menu-item">
        <button
          type="button"
          class="menu-top"
          :aria-expanded="openMenu === 'file'"
          @click.stop="toggle('file')"
        >
          {{ t.menuFile }}(<span class="accel">F</span>)
        </button>
        <div v-if="openMenu === 'file'" class="dropdown" role="menu" @click.stop>
          <button type="button" class="menu-entry" role="menuitem" @click="emitClose(() => emit('fileNew'))">
            {{ t.fileNew }}
          </button>
          <button type="button" class="menu-entry" role="menuitem" @click="emitClose(() => emit('fileOpen'))">
            {{ t.fileOpen }}
          </button>
          <div class="sep" role="separator" />
          <button type="button" class="menu-entry" role="menuitem" @click="emitClose(() => emit('fileSave'))">
            {{ t.fileSave }}
          </button>
          <button type="button" class="menu-entry" role="menuitem" @click="emitClose(() => emit('fileSaveAs'))">
            {{ t.fileSaveAs }}
          </button>
        </div>
      </div>

      <div class="menu-item">
        <button
          type="button"
          class="menu-top"
          :aria-expanded="openMenu === 'lang'"
          @click.stop="toggle('lang')"
        >
          {{ t.menuLanguage }}(<span class="accel">L</span>)
        </button>
        <div v-if="openMenu === 'lang'" class="dropdown" role="menu" @click.stop>
          <button type="button" class="menu-entry" role="menuitem" @click="setLocale('zh')">
            {{ t.langZh }}
          </button>
          <button type="button" class="menu-entry" role="menuitem" @click="setLocale('en')">
            {{ t.langEn }}
          </button>
        </div>
      </div>

      <div class="menu-item">
        <button
          type="button"
          class="menu-top"
          :aria-expanded="openMenu === 'theme'"
          @click.stop="toggle('theme')"
        >
          {{ t.menuTheme }}(<span class="accel">T</span>)
        </button>
        <div v-if="openMenu === 'theme'" class="dropdown" role="menu" @click.stop>
          <button type="button" class="menu-entry" role="menuitem" @click="setTheme('system')">
            {{ t.themeSystem }}
          </button>
          <button type="button" class="menu-entry" role="menuitem" @click="setTheme('light')">
            {{ t.themeLight }}
          </button>
          <button type="button" class="menu-entry" role="menuitem" @click="setTheme('dark')">
            {{ t.themeDark }}
          </button>
        </div>
      </div>

      <div class="menu-item">
        <button
          type="button"
          class="menu-top"
          :aria-expanded="openMenu === 'help'"
          @click.stop="toggle('help')"
        >
          {{ t.menuHelp }}(<span class="accel">H</span>)
        </button>
        <div v-if="openMenu === 'help'" class="dropdown" role="menu" @click.stop>
          <button type="button" class="menu-entry" role="menuitem" @click="closeMenus">
            {{ t.menuAbout }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.win-shell {
  flex-shrink: 0;
  border-bottom: 1px solid var(--win-menu-border);
  user-select: none;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 12px;
}

.title-bar {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 4px 0 6px;
  background: var(--win-title-bg);
  color: var(--win-title-fg);
  border-bottom: 1px solid var(--win-title-border);
}

.title-text {
  font-size: 12px;
  line-height: 1;
  margin-left: 4px;
}

.title-spacer {
  flex: 1;
}

.sys-btns {
  display: flex;
  height: 100%;
}

.sys-btn {
  width: 45px;
  height: 30px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  line-height: 30px;
  cursor: default;
}

.sys-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.sys-btn.close:hover {
  background: #e81123;
  color: #fff;
}

.menu-bar {
  display: flex;
  align-items: stretch;
  height: 24px;
  background: var(--win-menu-bg);
  padding: 0 2px;
  gap: 0;
}

.menu-item {
  position: relative;
  display: flex;
  align-items: stretch;
}

.menu-top {
  margin: 2px 0;
  padding: 2px 10px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--win-menu-fg);
  font: inherit;
  cursor: default;
  text-align: left;
}

.menu-top:hover,
.menu-top:focus-visible {
  background: var(--win-menu-hover);
  outline: none;
}

.accel {
  text-decoration: underline;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  z-index: 200;
  background: var(--win-menu-bg);
  color: var(--win-menu-fg);
  border: 1px solid var(--win-menu-border);
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  padding: 2px 0;
}

.dropdown.wide {
  min-width: 220px;
}

.menu-entry {
  display: block;
  width: 100%;
  text-align: left;
  padding: 4px 24px 4px 28px;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: default;
}

.menu-entry:hover {
  background: var(--win-menu-highlight);
  color: var(--win-menu-highlight-fg);
}

.sub-label {
  padding: 4px 8px 2px;
  font-size: 11px;
  color: var(--win-menu-muted);
  pointer-events: none;
}

.sep {
  height: 1px;
  margin: 4px 0;
  background: var(--win-menu-border);
}
</style>
