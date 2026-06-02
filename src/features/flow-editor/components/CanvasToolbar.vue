<script setup lang="ts">
interface Props {
  canUndo: boolean
  canRedo: boolean
}

interface Emits {
  undo: []
  redo: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="canvas-toolbar" aria-label="Canvas toolbar">
    <button
      class="toolbar-button"
      type="button"
      :disabled="!canUndo"
      title="Undo"
      @click="emit('undo')"
    >
      Undo
    </button>
    <button
      class="toolbar-button"
      type="button"
      :disabled="!canRedo"
      title="Redo"
      @click="emit('redo')"
    >
      Redo
    </button>
  </div>
</template>

<style scoped>
.canvas-toolbar {
  display: flex;
  gap: 8px;
  left: 16px;
  position: absolute;
  top: 16px;
  z-index: 2;
}

.toolbar-button {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #0f172a;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  min-height: 32px;
  min-width: 64px;
  padding: 0 12px;
}

.toolbar-button:hover:not(:disabled) {
  border-color: #0f766e;
}

.toolbar-button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}
</style>
