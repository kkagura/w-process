<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { MAX_ZOOM, MIN_ZOOM } from '@w-process/flow-core'
import type { EditorUiState, HistoryState, SelectionArrangeAction, ViewportData } from '@w-process/flow-core'
import CanvasToolbar from './CanvasToolbar.vue'
import CanvasStatusBar from './CanvasStatusBar.vue'

interface Props {
  uiState: EditorUiState | null
  historyState: HistoryState
  canGroupSelection: boolean
  canUngroupSelection: boolean
  canAutoLayout: boolean
}

interface Emits {
  canvasReady: [payload: {
    backgroundCanvas: HTMLCanvasElement
    mainCanvas: HTMLCanvasElement
  }]
  undo: []
  redo: []
  groupSelection: []
  ungroupSelection: []
  arrangeSelection: [action: SelectionArrangeAction]
  autoLayout: []
  zoomIn: []
  zoomOut: []
  resetView: []
  fitContent: []
  copySceneJson: []
  importSceneJson: [file: File]
  save: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const stage = useTemplateRef<HTMLElement>('stage')
const backgroundCanvas = useTemplateRef<HTMLCanvasElement>('backgroundCanvas')
const mainCanvas = useTemplateRef<HTMLCanvasElement>('mainCanvas')
const canvasSize = shallowRef({ width: 0, height: 0 })
let resizeObserver: ResizeObserver | null = null

const defaultViewport: ViewportData = { x: 0, y: 0, zoom: 1 }
const viewport = computed(() => props.uiState?.viewport ?? defaultViewport)
const nodeCount = computed(() => props.uiState?.summary.nodeCount ?? 0)
const edgeCount = computed(() => props.uiState?.summary.edgeCount ?? 0)
const boxCount = computed(() => props.uiState?.summary.boxCount ?? 0)
const canUndo = computed(() => props.historyState.canUndo)
const canRedo = computed(() => props.historyState.canRedo)
const dirty = computed(() => props.historyState.dirty)
const canZoomIn = computed(() => viewport.value.zoom < MAX_ZOOM)
const canZoomOut = computed(() => viewport.value.zoom > MIN_ZOOM)
const canResetView = computed(() =>
  viewport.value.x !== defaultViewport.x
  || viewport.value.y !== defaultViewport.y
  || viewport.value.zoom !== defaultViewport.zoom,
)
const canFitContent = computed(() => nodeCount.value > 0 || boxCount.value > 0)
const selectedNodeCount = computed(() =>
  props.uiState?.selection.items.filter(item => item.type === 'node').length ?? 0,
)
const canArrangeSelection = computed(() => selectedNodeCount.value > 1)

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
      <CanvasToolbar
        :can-undo="canUndo"
        :can-redo="canRedo"
        :can-group-selection="canGroupSelection"
        :can-ungroup-selection="canUngroupSelection"
        :can-arrange-selection="canArrangeSelection"
        :can-auto-layout="canAutoLayout"
        :can-zoom-in="canZoomIn"
        :can-zoom-out="canZoomOut"
        :can-reset-view="canResetView"
        :can-fit-content="canFitContent"
        :selected-node-count="selectedNodeCount"
        :dirty="dirty"
        @undo="emit('undo')"
        @redo="emit('redo')"
        @group-selection="emit('groupSelection')"
        @ungroup-selection="emit('ungroupSelection')"
        @arrange-selection="emit('arrangeSelection', $event)"
        @auto-layout="emit('autoLayout')"
        @zoom-in="emit('zoomIn')"
        @zoom-out="emit('zoomOut')"
        @reset-view="emit('resetView')"
        @fit-content="emit('fitContent')"
        @copy-scene-json="emit('copySceneJson')"
        @import-scene-json="emit('importSceneJson', $event)"
        @save="emit('save')"
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
