<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import type { SelectionArrangeAction } from '../../../core/flow/types/flow'

interface Props {
  canUndo: boolean
  canRedo: boolean
  canArrangeSelection: boolean
  canZoomIn: boolean
  canZoomOut: boolean
  canResetView: boolean
  selectedNodeCount: number
  dirty: boolean
}

interface Emits {
  undo: []
  redo: []
  arrangeSelection: [action: SelectionArrangeAction]
  zoomIn: []
  zoomOut: []
  resetView: []
  save: []
}

interface ArrangeActionItem {
  action: SelectionArrangeAction
  label: string
  minNodes: number
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const isArrangeMenuOpen = shallowRef(false)

const arrangeActions: ArrangeActionItem[] = [
  { action: 'align-vertical-center', label: '垂直中心对齐', minNodes: 2 },
  { action: 'align-left', label: '左对齐', minNodes: 2 },
  { action: 'align-right', label: '右对齐', minNodes: 2 },
  { action: 'distribute-vertical', label: '垂直方向均匀分布', minNodes: 3 },
  { action: 'align-horizontal-center', label: '水平中心对齐', minNodes: 2 },
  { action: 'align-top', label: '上对齐', minNodes: 2 },
  { action: 'align-bottom', label: '下对齐', minNodes: 2 },
  { action: 'distribute-horizontal', label: '水平方向均匀分布', minNodes: 3 },
]

watch(
  () => props.canArrangeSelection,
  (canArrangeSelection) => {
    if (!canArrangeSelection) closeArrangeMenu()
  },
)

function openArrangeMenu() {
  if (!props.canArrangeSelection) return
  isArrangeMenuOpen.value = true
}

function closeArrangeMenu() {
  isArrangeMenuOpen.value = false
}

function toggleArrangeMenu() {
  if (!props.canArrangeSelection) return
  isArrangeMenuOpen.value = !isArrangeMenuOpen.value
}

function handleArrangeAction(item: ArrangeActionItem) {
  if (props.selectedNodeCount < item.minNodes) return

  emit('arrangeSelection', item.action)
  closeArrangeMenu()
}
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
    <button
      class="toolbar-button"
      type="button"
      :disabled="!canZoomOut"
      title="Zoom Out"
      aria-label="Zoom out canvas"
      @click="emit('zoomOut')"
    >
      Zoom Out
    </button>
    <button
      class="toolbar-button"
      type="button"
      :disabled="!canZoomIn"
      title="Zoom In"
      aria-label="Zoom in canvas"
      @click="emit('zoomIn')"
    >
      Zoom In
    </button>
    <button
      class="toolbar-button"
      type="button"
      :disabled="!canResetView"
      title="Reset View"
      aria-label="Reset canvas view"
      @click="emit('resetView')"
    >
      Reset View
    </button>
    <div
      class="toolbar-menu-wrapper"
      @mouseenter="openArrangeMenu"
      @mouseleave="closeArrangeMenu"
      @keydown.escape="closeArrangeMenu"
    >
      <button
        class="toolbar-button"
        type="button"
        :disabled="!canArrangeSelection"
        title="Arrange selected nodes"
        aria-haspopup="menu"
        :aria-expanded="isArrangeMenuOpen"
        @click="toggleArrangeMenu"
      >
        排列
      </button>
      <div
        v-if="canArrangeSelection && isArrangeMenuOpen"
        class="arrange-menu"
        role="menu"
        aria-label="Arrange selected nodes"
      >
        <button
          v-for="item in arrangeActions"
          :key="item.action"
          class="arrange-menu-item"
          type="button"
          role="menuitem"
          :disabled="selectedNodeCount < item.minNodes"
          @click="handleArrangeAction(item)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>
    <button
      class="toolbar-button"
      :class="{ 'toolbar-button-dirty': dirty }"
      type="button"
      title="Save"
      @click="emit('save')"
    >
      Save
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

.toolbar-menu-wrapper {
  position: relative;
}

.arrange-menu {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow: 0 12px 24px rgb(15 23 42 / 14%);
  display: grid;
  gap: 2px;
  left: 0;
  min-width: 168px;
  padding: 6px;
  position: absolute;
  top: 100%;
}

.arrange-menu-item {
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: #0f172a;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  min-height: 30px;
  padding: 0 10px;
  text-align: left;
  white-space: nowrap;
}

.arrange-menu-item:hover,
.arrange-menu-item:focus-visible {
  background: #f1f5f9;
  outline: none;
}

.arrange-menu-item:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.arrange-menu-item:hover:disabled {
  background: transparent;
}

.toolbar-button-dirty {
  border-color: #2563eb;
  color: #1d4ed8;
}

.toolbar-button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}
</style>
