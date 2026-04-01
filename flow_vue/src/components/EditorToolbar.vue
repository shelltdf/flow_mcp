<script setup lang="ts">
import { computed } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'

export type RunPhase = 'idle' | 'running' | 'paused'

const props = defineProps<{
  phase: RunPhase
}>()

const emit = defineEmits<{
  run: []
  pause: []
  stop: []
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
        class="tb-btn tb-run"
        :disabled="props.phase === 'running'"
        :title="t.toolbarRunTitle"
        @click="emit('run')"
      >
        {{ t.toolbarRun }}
      </button>
      <button
        type="button"
        class="tb-btn"
        :disabled="props.phase !== 'running'"
        :title="t.toolbarPauseTitle"
        @click="emit('pause')"
      >
        {{ t.toolbarPause }}
      </button>
      <button
        type="button"
        class="tb-btn tb-stop"
        :disabled="props.phase === 'idle'"
        :title="t.toolbarStopTitle"
        @click="emit('stop')"
      >
        {{ t.toolbarStop }}
      </button>
    </div>
    <div class="tb-spacer" />
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 8px;
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
  gap: 6px;
}
.tb-btn {
  padding: 4px 14px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text);
  cursor: default;
}
.tb-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.tb-btn:disabled {
  opacity: 0.45;
}
.tb-run {
  min-width: 4rem;
}
.tb-stop {
  min-width: 4rem;
}
</style>
