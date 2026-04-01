<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import { useNodeConsole, consoleTextPlain } from '@/stores/nodeConsole'

const emit = defineEmits<{
  collapse: []
}>()

const { state, consoleClear } = useNodeConsole()

const bodyText = computed(() => state.lines.map((l) => l.text).join('\n'))
const { state: settings } = useAppSettings()
const t = computed(() => messages[settings.locale])

const preRef = ref<HTMLElement | null>(null)

watch(
  () => state.lines.length,
  () => {
    nextTick(() => {
      const el = preRef.value
      if (el) el.scrollTop = el.scrollHeight
    })
  },
)

async function copyAll() {
  try {
    await navigator.clipboard.writeText(consoleTextPlain())
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <section id="output-console-dock" class="console-root" aria-label="output console">
    <header class="console-head">
      <span class="console-title">{{ t.consoleDockTitle }}</span>
      <span class="console-actions">
        <button type="button" class="console-btn" :title="t.consoleCopy" @click="copyAll">
          {{ t.consoleCopy }}
        </button>
        <button type="button" class="console-btn" :title="t.consoleClear" @click="consoleClear">
          {{ t.consoleClear }}
        </button>
        <button type="button" class="console-btn" :title="t.consoleCollapseBar" @click="emit('collapse')">
          {{ t.dockCollapseBtn }}
        </button>
      </span>
    </header>
    <pre ref="preRef" class="console-body" tabindex="0">{{ bodyText }}</pre>
  </section>
</template>

<style scoped>
.console-root {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-top: 1px solid var(--border);
  background: var(--surface);
  overflow: hidden;
}
.console-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  font-size: 13px;
  line-height: 1.35;
}
.console-title {
  font-weight: 600;
  color: var(--text);
}
.console-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
.console-btn {
  padding: 0.12rem 0.35rem;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  line-height: 1.25;
  cursor: default;
}
.console-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.console-body {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0.45rem 0.55rem;
  overflow: auto;
  font-family: ui-monospace, 'Cascadia Code', 'Consolas', 'Sarasa Mono SC', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--editor-bg);
}
</style>
