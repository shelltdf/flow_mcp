<script setup lang="ts">
import { computed } from 'vue'
import { messages } from '@/i18n/messages'
import { useAppSettings } from '@/stores/appSettings'
import { useFlowchart, EDITOR_SIZE } from '@/stores/flowchart'
import {
  NODE_TITLE_H,
  NODE_PREVIEW_H,
  anchorYForSide,
  edgeAttachXRight,
  edgeAttachXLeft,
} from '@/utils/flowNodeLayout'

const { state: settings } = useAppSettings()
const { state: fc } = useFlowchart()

const t = computed(() => messages[settings.locale])

const AR_W = EDITOR_SIZE.w
const AR_H = EDITOR_SIZE.h
/** 内接 16:9：以全宽为限，上下留白 */
const guide169 = computed(() => {
  const h = (AR_W * 9) / 16
  const y = (AR_H - h) / 2
  return { x: 0, y, w: AR_W, h }
})
/** 内接 1:1：以全高为限，左右留白 */
const guide11 = computed(() => {
  const side = AR_H
  const x = (AR_W - side) / 2
  return { x, y: 0, w: side, h: side }
})

function edgeLineAttrs(e: { source: string; target: string }) {
  const s = fc.nodes.find((n) => n.id === e.source)
  const t = fc.nodes.find((n) => n.id === e.target)
  if (!s || !t) return { x1: 0, y1: 0, x2: 0, y2: 0 }
  const y1 = anchorYForSide(s, 'right')
  const y2 = anchorYForSide(t, 'left')
  return { x1: edgeAttachXRight(s), y1, x2: edgeAttachXLeft(t), y2 }
}

function previewNodeFill(type: string) {
  if (type === 'container') return '#ecfdf5'
  if (type === 'decision') return '#fef3c7'
  if (type === 'terminal') return '#dbeafe'
  if (type.startsWith('var-')) return '#f5f3ff'
  if (type === 'for-node') return '#fce7f3'
  if (type === 'type-convert') return '#e0f2fe'
  if (type === 'script-node') return '#fffbeb'
  return '#e5e7eb'
}

function previewTitleFill(type: string) {
  if (type === 'container') return '#bbf7d0'
  if (type === 'decision') return '#fde68a'
  if (type === 'terminal') return '#bfdbfe'
  if (type.startsWith('var-')) return '#ddd6fe'
  if (type === 'for-node') return '#fbcfe8'
  if (type === 'type-convert') return '#bae6fd'
  if (type === 'script-node') return '#fde68a'
  return '#cbd5e1'
}
</script>

<template>
  <section id="preview-panel" class="panel" aria-label="preview">
    <h2 class="title">{{ t.preview }}</h2>
    <p class="ratio-hint">{{ t.previewRatioHint }}</p>
    <div class="canvas-wrap">
      <div class="preview-viewport">
        <svg
          class="mini-svg"
          :viewBox="`0 0 ${EDITOR_SIZE.w} ${EDITOR_SIZE.h}`"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect width="100%" height="100%" fill="var(--editor-bg)" stroke="var(--border)" />
          <!-- 可选参考框：与逻辑坐标对齐，便于在预览中感知 1:1 / 16:9 构图区域 -->
          <rect
            class="guide guide-169"
            :x="guide169.x"
            :y="guide169.y"
            :width="guide169.w"
            :height="guide169.h"
            fill="none"
          />
          <rect
            class="guide guide-11"
            :x="guide11.x"
            :y="guide11.y"
            :width="guide11.w"
            :height="guide11.h"
            fill="none"
          />
          <g v-for="e in fc.edges" :key="e.id">
            <line
              v-bind="edgeLineAttrs(e)"
              stroke="var(--muted)"
              stroke-width="2"
            />
          </g>
          <g v-for="n in fc.nodes" :key="n.id">
            <rect
              :x="n.x"
              :y="n.y"
              :width="n.width"
              :height="n.height"
              rx="6"
              :fill="previewNodeFill(n.type)"
              :stroke="
                n.type === 'container'
                  ? '#059669'
                  : n.type.startsWith('var-')
                    ? '#7c3aed'
                    : 'var(--border)'
              "
              :stroke-dasharray="n.type === 'container' ? '7 5' : '0'"
            />
            <rect
              :x="n.x"
              :y="n.y"
              :width="n.width"
              :height="NODE_TITLE_H"
              rx="6"
              :fill="previewTitleFill(n.type)"
            />
            <text
              :x="n.x + n.width / 2"
              :y="n.y + 14"
              text-anchor="middle"
              font-size="11"
              fill="var(--text)"
            >
              {{ n.label }}
            </text>
            <rect
              :x="n.x"
              :y="n.y + NODE_TITLE_H"
              :width="n.width"
              :height="NODE_PREVIEW_H"
              fill="rgba(255,255,255,0.25)"
            />
          </g>
        </svg>
      </div>
    </div>
    <p class="meta">
      {{ t.nodes }}: {{ fc.nodes.length }} · {{ t.edges }}: {{ fc.edges.length }}
    </p>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  padding: 0.5rem;
  background: var(--surface);
  border: none;
  border-radius: 0;
}
.title {
  margin: 0 0 0.2rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.ratio-hint {
  margin: 0 0 0.35rem;
  font-size: 0.68rem;
  color: var(--muted);
  line-height: 1.3;
}
.canvas-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  container-type: size;
  padding: 2px;
}

/* 预览视口：保持与画布相同的 4:3，并在可用区域内取 min(宽, 高×4/3) 以在竖屏/横屏下都协调 */
.preview-viewport {
  box-sizing: border-box;
  /* 与逻辑画布一致的 4:3；在矮而宽的 16:9 区域里由高度限制宽度，在窄而高的 1:1 区域里由宽度限制高度 */
  width: min(100%, calc(100cqh * 4 / 3));
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 4 / 3;
  height: auto;
}

@supports not (container-type: size) {
  .preview-viewport {
    width: 100%;
    max-height: min(36vh, 220px);
    aspect-ratio: 4 / 3;
  }
}

.mini-svg {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  vertical-align: top;
}

.guide {
  pointer-events: none;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
  opacity: 0.45;
}
.guide-169 {
  stroke: var(--accent);
  stroke-dasharray: 4 3;
}
.guide-11 {
  stroke: var(--muted);
  stroke-dasharray: 2 3;
}

.meta {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
