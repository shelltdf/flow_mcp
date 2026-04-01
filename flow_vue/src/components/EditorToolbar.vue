<script setup lang="ts">
import { computed } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'

export type RunPhase = 'idle' | 'running' | 'paused'

const props = defineProps<{
  phase: RunPhase
  isFullscreen: boolean
}>()

const emit = defineEmits<{
  run: []
  pause: []
  stop: []
  toggleFullscreen: []
}>()

const { state: settings } = useAppSettings()
const t = computed(() => messages[settings.locale])
</script>

<template>
  <div class="editor-toolbar" role="toolbar" :aria-label="t.toolbarAria">
    <div class="tb-spacer" />
    <div class="tb-center">
      <button
        type="button"
        class="tb-btn tb-icon"
        :disabled="props.phase === 'running'"
        :title="t.toolbarRunTitle"
        :aria-label="t.toolbarRun"
        @click="emit('run')"
      >
        <svg class="tb-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M8 5v14l11-7L8 5z" />
        </svg>
      </button>
      <button
        type="button"
        class="tb-btn tb-icon"
        :disabled="props.phase !== 'running'"
        :title="t.toolbarPauseTitle"
        :aria-label="t.toolbarPause"
        @click="emit('pause')"
      >
        <svg class="tb-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
        </svg>
      </button>
      <button
        type="button"
        class="tb-btn tb-icon"
        :disabled="props.phase === 'idle'"
        :title="t.toolbarStopTitle"
        :aria-label="t.toolbarStop"
        @click="emit('stop')"
      >
        <svg class="tb-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M6 6h12v12H6V6z" />
        </svg>
      </button>
    </div>
    <div class="tb-spacer" />
    <div class="tb-right">
      <button
        type="button"
        class="tb-btn tb-icon"
        :title="props.isFullscreen ? t.toolbarFullscreenExitTitle : t.toolbarFullscreenTitle"
        :aria-label="props.isFullscreen ? t.toolbarFullscreenExitTitle : t.toolbarFullscreenTitle"
        @click="emit('toggleFullscreen')"
      >
        <svg v-if="!props.isFullscreen" class="tb-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
          />
        </svg>
        <svg v-else class="tb-ico" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-height: 38px;
  padding: 0 10px;
  border-bottom: 1px solid var(--win-menu-border);
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
}
.tb-spacer {
  flex: 1;
  min-width: 0;
}
.tb-center {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tb-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.tb-btn {
  padding: 4px 14px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text);
  cursor: default;
}
.tb-icon {
  padding: 5px 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
}
.tb-ico {
  width: 19px;
  height: 19px;
  display: block;
}
.tb-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.tb-btn:disabled {
  opacity: 0.45;
}
</style>
