<script setup lang="ts">
import { computed } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import { useAppLog, logTextPlain } from '@/stores/appLog'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { state: settings } = useAppSettings()
useAppLog()

const t = computed(() => messages[settings.locale])

const text = computed(() => logTextPlain())

async function copyAll() {
  try {
    await navigator.clipboard.writeText(text.value)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}
</script>

<template>
  <div v-if="open" id="app-log-dialog" class="backdrop" role="dialog" aria-modal="true">
    <div class="dialog">
      <header class="head">
        <h2>{{ t.logTitle }}</h2>
        <button type="button" class="close" @click="emit('close')">×</button>
      </header>
      <pre class="body" aria-label="log text">{{ text || '(empty)' }}</pre>
      <footer class="foot">
        <button type="button" @click="copyAll">{{ t.logCopy }}</button>
        <button type="button" @click="emit('close')">{{ t.logClose }}</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.dialog {
  width: min(640px, 92vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
.head h2 {
  margin: 0;
  font-size: 1rem;
}
.close {
  border: none;
  background: transparent;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--muted);
}
.body {
  margin: 0;
  padding: 0.75rem;
  flex: 1;
  overflow: auto;
  font-size: 0.8rem;
  white-space: pre-wrap;
  font-family: ui-monospace, monospace;
  background: var(--bg);
}
.foot {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--border);
}
.foot button {
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
}
</style>
