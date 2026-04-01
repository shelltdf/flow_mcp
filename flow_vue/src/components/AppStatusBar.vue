<script setup lang="ts">
import { computed } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import { useAppLog } from '@/stores/appLog'

const props = defineProps<{ onOpenLog: () => void }>()

const { state: settings } = useAppSettings()
const { state: logState } = useAppLog()

const t = computed(() => messages[settings.locale])

const summary = computed(() => {
  const lines = logState.lines
  if (!lines.length) return t.value.statusReady
  const last = lines[lines.length - 1]
  return `[${last.level}] ${last.text}`
})
</script>

<template>
  <footer id="app-statusbar" class="status" role="contentinfo" @click="onOpenLog">
    <span class="text">{{ summary }}</span>
    <span class="hint">{{ t.clickForLog }}</span>
  </footer>
</template>

<style scoped>
.status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  border-top: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  user-select: none;
}
.status:hover {
  background: var(--bg);
}
.text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hint {
  color: var(--muted);
  flex-shrink: 0;
}
</style>
