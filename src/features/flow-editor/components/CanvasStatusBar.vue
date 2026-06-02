<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  zoom: number
  viewportX: number
  viewportY: number
  width: number
  height: number
  nodeCount: number
  edgeCount: number
}

const props = defineProps<Props>()

const zoomLabel = computed(() => `${Math.round(props.zoom * 100)}%`)
const viewportLabel = computed(() => `${Math.round(props.viewportX)}, ${Math.round(props.viewportY)}`)
const sizeLabel = computed(() => `${Math.round(props.width)}x${Math.round(props.height)}`)
</script>

<template>
  <div class="canvas-status-bar" aria-label="Canvas status">
    <span class="status-item">Zoom {{ zoomLabel }}</span>
    <span class="status-item">View {{ viewportLabel }}</span>
    <span class="status-item">{{ sizeLabel }}</span>
    <span class="status-item">{{ nodeCount }} nodes</span>
    <span class="status-item">{{ edgeCount }} edges</span>
  </div>
</template>

<style scoped>
.canvas-status-bar {
  align-items: center;
  backdrop-filter: blur(10px);
  background: rgb(255 255 255 / 86%);
  border: 1px solid rgb(148 163 184 / 34%);
  border-radius: 6px;
  bottom: 12px;
  box-shadow: 0 8px 18px rgb(15 23 42 / 10%);
  color: #334155;
  display: flex;
  flex-wrap: wrap;
  font-size: 12px;
  gap: 8px;
  left: 12px;
  line-height: 1;
  max-width: calc(100% - 24px);
  padding: 8px 10px;
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

.status-item {
  white-space: nowrap;
}
</style>
