import { reactive } from 'vue'

export interface ConsoleLine {
  t: number
  text: string
}

const MAX_LINES = 5000

const state = reactive({
  lines: [] as ConsoleLine[],
})

/** 供节点/运行时向底部输出区写入文本（可多行，自动拆行） */
export function consolePrint(text: string) {
  const chunk = text.replace(/\r\n/g, '\n')
  const parts = chunk.split('\n')
  const now = Date.now()
  for (const line of parts) {
    state.lines.push({ t: now, text: line })
  }
  while (state.lines.length > MAX_LINES) {
    state.lines.shift()
  }
}

export function consoleClear() {
  state.lines.length = 0
}

export function consoleTextPlain(): string {
  return state.lines.map((l) => l.text).join('\n')
}

export function useNodeConsole() {
  return { state, consolePrint, consoleClear, consoleTextPlain }
}
