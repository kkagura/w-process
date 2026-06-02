<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import type { BoxData, SceneElementData, SceneSnapshot, ViewportData } from '../../../core/flow/types/flow'
import CanvasStatusBar from './CanvasStatusBar.vue'

interface Props {
  snapshot: SceneSnapshot | null
}

interface Emits {
  canvasReady: [payload: {
    backgroundCanvas: HTMLCanvasElement
    mainCanvas: HTMLCanvasElement
  }]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const stage = useTemplateRef<HTMLElement>('stage')
const backgroundCanvas = useTemplateRef<HTMLCanvasElement>('backgroundCanvas')
const mainCanvas = useTemplateRef<HTMLCanvasElement>('mainCanvas')
const canvasSize = shallowRef({ width: 0, height: 0 })
let resizeObserver: ResizeObserver | null = null

const defaultViewport: ViewportData = { x: 0, y: 0, zoom: 1 }
const viewport = computed(() => props.snapshot?.document.viewport ?? defaultViewport)
const nodeCount = computed(() => countNodes(props.snapshot?.document.root))
const edgeCount = computed(() => props.snapshot?.document.edges.length ?? 0)

onMounted(() => {
  if (!backgroundCanvas.value || !mainCanvas.value) return
  emit('canvasReady', {
    backgroundCanvas: backgroundCanvas.value,
    mainCanvas: mainCanvas.value,
  })

  if (!stage.value) return
  updateCanvasSize()
  resizeObserver = new ResizeObserver(updateCanvasSize)
  resizeObserver.observe(stage.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

function updateCanvasSize() {
  if (!stage.value) return
  const rect = stage.value.getBoundingClientRect()
  canvasSize.value = {
    width: rect.width,
    height: rect.height,
  }
}

function countNodes(root?: BoxData) {
  if (!root) return 0
  return root.children.reduce((total, child) => total + countElementNodes(child), 0)
}

function countElementNodes(element: SceneElementData): number {
  if (isBoxData(element)) {
    return element.children.reduce((total, child) => total + countElementNodes(child), 0)
  }

  return 1
}

function isBoxData(element: SceneElementData): element is BoxData {
  return 'children' in element
}
</script>

<template>
  <section class="canvas-shell">
    <div ref="stage" class="canvas-stage">
      <canvas
        ref="backgroundCanvas"
        class="canvas-layer canvas-background"
      />
      <canvas
        ref="mainCanvas"
        class="canvas-layer canvas-main"
        tabindex="0"
      />
      <CanvasStatusBar
        :zoom="viewport.zoom"
        :viewport-x="viewport.x"
        :viewport-y="viewport.y"
        :width="canvasSize.width"
        :height="canvasSize.height"
        :node-count="nodeCount"
        :edge-count="edgeCount"
      />
    </div>
  </section>
</template>

<style scoped>
.canvas-shell {
  background: #f8fafc;
  min-width: 0;
  position: relative;
}

.canvas-stage {
  height: 100%;
  min-height: 0;
  position: relative;
  width: 100%;
}

.canvas-layer {
  display: block;
  height: 100%;
  inset: 0;
  position: absolute;
  width: 100%;
}

.canvas-background {
  pointer-events: none;
}

.canvas-main {
  cursor: default;
  outline: none;
  touch-action: none;
  user-select: none;
}
</style>
