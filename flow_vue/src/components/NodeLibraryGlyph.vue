<script setup lang="ts">
/**
 * 节点库缩略图：与画布节点配色一致的小型示意
 */
defineProps<{
  type: string
}>()

function fill(type: string) {
  if (type === 'group') return '#d1fae5'
  if (type === 'container') return '#ecfdf5'
  if (type === 'decision') return '#fef3c7'
  if (type === 'terminal') return '#dbeafe'
  if (type === 'for-node') return '#fdf2f8'
  if (type === 'type-convert') return '#e0f2fe'
  if (type === 'script-node') return '#fffbeb'
  if (type.startsWith('var-')) return '#f5f3ff'
  return '#e5e7eb'
}

function stroke(type: string) {
  if (type === 'group') return '#047857'
  if (type === 'container') return '#059669'
  if (type === 'for-node') return '#db2777'
  if (type === 'type-convert') return '#0284c7'
  if (type === 'script-node') return '#d97706'
  if (type.startsWith('var-')) return '#7c3aed'
  return '#94a3b8'
}

function titleFill(type: string) {
  if (type === 'group') return '#a7f3d0'
  if (type === 'container') return '#bbf7d0'
  if (type === 'decision') return '#fde68a'
  if (type === 'terminal') return '#bfdbfe'
  if (type.startsWith('var-')) return '#ddd6fe'
  if (type === 'for-node') return '#fce7f3'
  if (type === 'type-convert') return '#e0f2fe'
  if (type === 'script-node') return '#fef3c7'
  return '#cbd5e1'
}

function iconD(type: string): string {
  switch (type) {
    case 'group':
      return 'M4 5h16v14H4V5zm2 2v10h12V7H6zm2 2h8v2H8V9zm0 3h6v2H8v-2z'
    case 'container':
      return 'M3 7h18v12H3V7zm0 4h18'
    case 'decision':
      return 'M12 2L22 12 12 22 2 12 12 2z'
    case 'terminal':
      return 'M6 7h12v10H6V7zm2 2v6h8V9H8z'
    case 'for-node':
      return 'M12 4a7.5 7.5 0 107.5 7.5H16a4 4 0 10-4-4V4z'
    case 'type-convert':
      return 'M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4'
    case 'script-node':
      return 'M8 6L5 12l3 6M16 6l3 6-3 6M12.5 9h-2l-1 6h2'
    default:
      if (type.startsWith('var-')) {
        return 'M6 6h12v12H6V6zm3 3h6v6H9V9z'
      }
      return 'M5 8h14v8H5V8zm2 2h10v4H7v-4z'
  }
}
</script>

<template>
  <svg
    class="node-glyph"
    viewBox="0 0 64 40"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="2"
      y="2"
      width="60"
      height="36"
      rx="5"
      :fill="fill(type)"
      :stroke="stroke(type)"
      stroke-width="1.5"
      :stroke-dasharray="type === 'container' || type === 'group' ? '4 3' : '0'"
    />
    <rect x="2" y="2" width="60" height="14" rx="5" :fill="titleFill(type)" />
    <text x="32" y="12" text-anchor="middle" font-size="8" font-weight="600" fill="#334155">
      ···
    </text>
    <rect x="4" y="18" width="56" height="18" rx="2" fill="rgba(255,255,255,0.35)" />
    <path
      :d="iconD(type)"
      fill="none"
      :stroke="stroke(type)"
      stroke-width="1.3"
      stroke-linejoin="round"
      transform="translate(20 20) scale(0.9)"
    />
  </svg>
</template>

<style scoped>
.node-glyph {
  display: block;
  width: 100%;
  height: auto;
  max-height: 42px;
}
</style>
