<script setup lang="ts">
import ElementPalette from './ElementPalette.vue'
import FlowCanvas from './FlowCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { useFlowEditorCore } from '../composables/useFlowEditorCore'

const { snapshot, mount } = useFlowEditorCore()
</script>

<template>
  <main class="flow-editor">
    <ElementPalette />
    <FlowCanvas :snapshot="snapshot" @canvas-ready="mount" />
    <PropertyPanel :snapshot="snapshot" />
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
