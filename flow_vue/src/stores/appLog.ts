import { reactive } from 'vue'

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogLine {
  t: number
  level: LogLevel
  text: string
}

const state = reactive({
  lines: [] as LogLine[],
})

export function log(level: LogLevel, text: string) {
  state.lines.push({ t: Date.now(), level, text })
}

export function logTextPlain(): string {
  return state.lines.map((l) => `[${l.level}] ${l.text}`).join('\n')
}

export function useAppLog() {
  return { state, log, logTextPlain }
}
