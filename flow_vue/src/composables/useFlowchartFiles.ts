import { ref } from 'vue'
import { messages, type Locale } from '@/i18n/messages'
import { useFlowchart } from '@/stores/flowchart'
import { log } from '@/stores/appLog'

const DEFAULT_EXT = '.flow.json'

function defaultUntitled(locale: Locale) {
  return locale === 'zh' ? `未命名${DEFAULT_EXT}` : `Untitled${DEFAULT_EXT}`
}

function ensureJsonFilename(name: string) {
  const n = name.trim() || `flowchart${DEFAULT_EXT}`
  if (n.toLowerCase().endsWith('.json')) return n
  return `${n}${DEFAULT_EXT}`
}

async function writeToHandle(handle: FileSystemFileHandle, text: string) {
  const w = await handle.createWritable()
  await w.write(text)
  await w.close()
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function useFlowchartFiles(locale: () => Locale) {
  const fc = useFlowchart()
  const openInputRef = ref<HTMLInputElement | null>(null)

  function t() {
    return messages[locale()]
  }

  /** 另存为：优先系统对话框，否则提示文件名并下载 */
  async function saveAsDialog(text: string, suggested: string): Promise<{
    name: string
    handle: FileSystemFileHandle | null
  } | null> {
    const suggestedName = ensureJsonFilename(suggested)
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (
          window as Window & {
            showSaveFilePicker: (o: {
              suggestedName?: string
              types?: { description: string; accept: Record<string, string[]> }[]
            }) => Promise<FileSystemFileHandle>
          }
        ).showSaveFilePicker({
          suggestedName: suggestedName,
          types: [
            {
              description: 'Flowchart JSON',
              accept: { 'application/json': ['.json', '.flow.json'] },
            },
          ],
        })
        await writeToHandle(handle, text)
        return { name: handle.name, handle }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return null
        log('error', `save as: ${String(e)}`)
        window.alert(t().fileSaveError)
        return null
      }
    }
    const entered = window.prompt(t().fileSaveAsPrompt, suggestedName)
    if (entered === null) return null
    const name = ensureJsonFilename(entered)
    downloadText(text, name)
    return { name, handle: null }
  }

  async function fileNew() {
    if (fc.fileMeta.dirty) {
      if (!window.confirm(t().fileNewConfirm)) return
    }
    fc.newDocument(defaultUntitled(locale()))
    log('info', 'new document')
  }

  function openFromInput() {
    openInputRef.value?.click()
  }

  async function onOpenFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      const text = await file.text()
      fc.loadDocumentFromJsonText(text, file.name, null)
      log('info', `opened ${file.name}`)
    } catch (e) {
      log('error', `open: ${String(e)}`)
      window.alert(t().fileOpenError)
    }
  }

  async function fileOpen() {
    if (fc.fileMeta.dirty) {
      if (!window.confirm(t().fileOpenConfirm)) return
    }
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const handles = await (
          window as Window & {
            showOpenFilePicker: (o: {
              types?: { description: string; accept: Record<string, string[]> }[]
            }) => Promise<FileSystemFileHandle[]>
          }
        ).showOpenFilePicker({
          types: [
            {
              description: 'Flowchart JSON',
              accept: { 'application/json': ['.json', '.flow.json'] },
            },
          ],
        })
        const handle = handles[0]
        const file = await handle.getFile()
        const text = await file.text()
        fc.loadDocumentFromJsonText(text, file.name, handle)
        log('info', `opened ${file.name}`)
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        log('warn', `open picker: ${String(e)}`)
      }
    }
    openFromInput()
  }

  async function fileSave() {
    const text = JSON.stringify(fc.exportDocument(), null, 2)
    const { handle, displayName } = fc.fileMeta

    if (handle) {
      try {
        await writeToHandle(handle, text)
        fc.markSaved(displayName, handle)
        log('info', `saved ${displayName}`)
        return
      } catch (e) {
        log('error', `save: ${String(e)}`)
        window.alert(t().fileSaveError)
      }
    }

    const suggested = displayName.endsWith('.json') ? displayName : `${displayName}${DEFAULT_EXT}`
    const res = await saveAsDialog(text, suggested)
    if (res) {
      fc.markSaved(res.name, res.handle)
      log('info', `saved ${res.name}`)
    }
  }

  async function fileSaveAs() {
    const text = JSON.stringify(fc.exportDocument(), null, 2)
    const suggested = fc.fileMeta.displayName.endsWith('.json')
      ? fc.fileMeta.displayName
      : `${fc.fileMeta.displayName}${DEFAULT_EXT}`
    const res = await saveAsDialog(text, suggested)
    if (res) {
      fc.markSaved(res.name, res.handle)
      log('info', `save as ${res.name}`)
    }
  }

  return {
    openInputRef,
    fileNew,
    fileOpen,
    onOpenFileChange,
    fileSave,
    fileSaveAs,
  }
}
