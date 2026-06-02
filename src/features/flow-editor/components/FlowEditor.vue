<script setup lang="ts">
import ElementPalette from './ElementPalette.vue'
import FlowCanvas from './FlowCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { useFlowEditorCore } from '../composables/useFlowEditorCore'

const { uiState, mount } = useFlowEditorCore()
</script>

<template>
  <main class="flow-editor">
    <ElementPalette />
    <FlowCanvas :ui-state="uiState" @canvas-ready="mount" />
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
