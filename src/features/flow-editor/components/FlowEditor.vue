<script setup lang="ts">
import ElementPalette from './ElementPalette.vue'
import FlowCanvas from './FlowCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { useFlowEditorCore } from '../composables/useFlowEditorCore'

const { uiState, historyState, mount, undo, redo } = useFlowEditorCore()
</script>

<template>
  <main class="flow-editor">
    <ElementPalette />
    <FlowCanvas
      :ui-state="uiState"
      :history-state="historyState"
      @canvas-ready="mount"
      @undo="undo"
      @redo="redo"
    />
    <PropertyPanel :ui-state="uiState" />
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
