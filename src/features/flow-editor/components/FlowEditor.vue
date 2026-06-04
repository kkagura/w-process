<script setup lang="ts">
import ElementPalette from './ElementPalette.vue'
import FlowCanvas from './FlowCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { useFlowEditorCore } from '../composables/useFlowEditorCore'
import type { FlowEditorApi } from '../types'
import type { FlowEditorCanvasElements } from '../composables/useFlowEditorCore'

interface Emits {
  editorReady: [api: FlowEditorApi]
  saveRequested: []
}

const emit = defineEmits<Emits>()
const {
  uiState,
  historyState,
  mount,
  undo,
  redo,
  arrangeSelection,
  updateNodeLabel,
  exportDocument,
  importDocument,
  markSaved,
} = useFlowEditorCore()

function handleCanvasReady(elements: FlowEditorCanvasElements) {
  mount(elements)
  emit('editorReady', {
    exportDocument,
    importDocument,
    markSaved,
  })
}
</script>

<template>
  <main class="flow-editor">
    <ElementPalette />
    <FlowCanvas
      :ui-state="uiState"
      :history-state="historyState"
      @canvas-ready="handleCanvasReady"
      @undo="undo"
      @redo="redo"
      @arrange-selection="arrangeSelection"
      @save="emit('saveRequested')"
    />
    <PropertyPanel
      :ui-state="uiState"
      @update-node-label="updateNodeLabel"
    />
  </main>
</template>

<style scoped>
.flow-editor {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 260px;
  height: 100svh;
  overflow: hidden;
}
</style>
