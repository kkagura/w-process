<script setup lang="ts">
import { watch } from 'vue'
import ElementPalette from './ElementPalette.vue'
import FlowCanvas from './FlowCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import ToastContainer from './toast/ToastContainer.vue'
import { useFlowEditorCore } from '../composables/useFlowEditorCore'
import { useToast } from '../composables/useToast'
import type { FlowEditorApi, SaveFeedback } from '../types'
import type { FlowEditorCanvasElements } from '../composables/useFlowEditorCore'
import type { EditorFeedbackEvent } from '../../../core/flow/types/flow'

interface Props {
  saveFeedback: SaveFeedback | null
}

interface Emits {
  editorReady: [api: FlowEditorApi]
  saveRequested: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const {
  uiState,
  historyState,
  latestFeedback,
  canGroupSelection,
  canUngroupSelection,
  canAutoLayout,
  mount,
  undo,
  redo,
  groupSelection,
  ungroupSelection,
  arrangeSelection,
  autoLayout,
  zoomIn,
  zoomOut,
  resetView,
  fitContent,
  updateNodeLabel,
  updateNodePosition,
  updateNodeSize,
  updateNodeRotation,
  updateNodeTextStyle,
  updateNodeBorderStyle,
  updateNodeFillStyle,
  updateEdgeLabel,
  updateEdgeLineStyle,
  updateEdgeRoute,
  updateBoxLabel,
  updateGroupGeometry,
  updateGroupFillStyle,
  updateGroupBorderStyle,
  updateGroupTitleStyle,
  updateGroupLayout,
  updateSwimlaneSize,
  addSwimlaneLane,
  removeSwimlaneLane,
  exportDocument,
  importDocument,
  markSaved,
} = useFlowEditorCore()
const {
  toasts,
  show: showToast,
  remove: removeToast,
} = useToast()

watch(latestFeedback, (event) => {
  if (!event) return
  handleFeedback(event)
})

watch(() => props.saveFeedback, (feedback) => {
  if (!feedback) return
  handleSaveFeedback(feedback)
})

function handleCanvasReady(elements: FlowEditorCanvasElements) {
  mount(elements)
  emit('editorReady', {
    exportDocument,
    importDocument,
    markSaved,
  })
}

async function copySceneJson() {
  const sceneDocument = exportDocument()
  if (!sceneDocument) {
    showToast({
      type: 'error',
      message: '场景尚未准备好，无法复制 JSON',
    })
    return
  }

  try {
    await navigator.clipboard.writeText(JSON.stringify(sceneDocument, null, 2))
    showToast({
      type: 'success',
      message: '场景 JSON 已复制到剪贴板',
    })
  }
  catch {
    showToast({
      type: 'error',
      message: '复制失败，请检查浏览器剪贴板权限',
    })
  }
}

function handleFeedback(event: EditorFeedbackEvent) {
  if (event.type === 'clipboard-copied') {
    showToast({
      type: 'success',
      message: `已复制 ${event.nodeCount} 个节点${formatEdgeSuffix(event.edgeCount)}`,
    })
    return
  }

  if (event.type === 'clipboard-copy-empty') {
    showToast({
      type: 'warning',
      message: '请先选择要复制的节点',
    })
    return
  }

  if (event.type === 'clipboard-pasted') {
    showToast({
      type: 'success',
      message: `已粘贴 ${event.nodeCount} 个节点${formatEdgeSuffix(event.edgeCount)}`,
    })
    return
  }

  if (event.type === 'clipboard-paste-empty') {
    showToast({
      type: 'warning',
      message: '没有可粘贴的内容',
    })
    return
  }

  if (event.type === 'selection-duplicated') {
    showToast({
      type: 'success',
      message: `已快速复制 ${event.nodeCount} 个节点${formatEdgeSuffix(event.edgeCount)}`,
    })
    return
  }

  if (event.type === 'selection-duplicate-empty') {
    showToast({
      type: 'warning',
      message: '请先选择要快速复制的节点',
    })
    return
  }

  if (event.type === 'auto-layout-applied') {
    showToast({
      type: 'success',
      message: `已自动布局 ${event.nodeCount} 个节点（${event.groupCount} 个布局分组）`,
    })
    return
  }

  if (event.type === 'auto-layout-skipped') {
    showToast({
      type: 'warning',
      message: event.reason === 'insufficient-sibling-nodes'
        ? '同一层级内至少需要两个节点才能自动布局'
        : '当前节点已经符合自动布局结果',
    })
  }
}

function handleSaveFeedback(feedback: SaveFeedback) {
  if (feedback.type === 'success') {
    showToast({
      type: 'success',
      message: '保存成功',
    })
    return
  }

  showToast({
    type: 'error',
    message: '保存失败，请稍后重试',
  })
}

function formatEdgeSuffix(edgeCount: number) {
  return edgeCount > 0 ? `，${edgeCount} 条连线` : ''
}
</script>

<template>
  <main class="flow-editor">
    <ElementPalette />
    <FlowCanvas
      :ui-state="uiState"
      :history-state="historyState"
      :can-group-selection="canGroupSelection"
      :can-ungroup-selection="canUngroupSelection"
      :can-auto-layout="canAutoLayout"
      @canvas-ready="handleCanvasReady"
      @undo="undo"
      @redo="redo"
      @group-selection="groupSelection"
      @ungroup-selection="ungroupSelection"
      @arrange-selection="arrangeSelection"
      @auto-layout="autoLayout"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-view="resetView"
      @fit-content="fitContent"
      @copy-scene-json="copySceneJson"
      @save="emit('saveRequested')"
    />
    <PropertyPanel
      :ui-state="uiState"
      @update-node-label="updateNodeLabel"
      @update-node-position="updateNodePosition"
      @update-node-size="updateNodeSize"
      @update-node-rotation="updateNodeRotation"
      @update-node-text-style="updateNodeTextStyle"
      @update-node-border-style="updateNodeBorderStyle"
      @update-node-fill-style="updateNodeFillStyle"
      @update-edge-label="updateEdgeLabel"
      @update-edge-line-style="updateEdgeLineStyle"
      @update-edge-route="updateEdgeRoute"
      @update-box-label="updateBoxLabel"
      @update-group-geometry="updateGroupGeometry"
      @update-group-fill-style="updateGroupFillStyle"
      @update-group-border-style="updateGroupBorderStyle"
      @update-group-title-style="updateGroupTitleStyle"
      @update-group-layout="updateGroupLayout"
      @update-swimlane-size="updateSwimlaneSize"
      @add-swimlane-lane="addSwimlaneLane"
      @remove-swimlane-lane="removeSwimlaneLane"
    />
    <ToastContainer :toasts="toasts" @close="removeToast" />
  </main>
</template>

<style scoped>
.flow-editor {
  display: grid;
  grid-template-columns: 184px minmax(0, 1fr) 260px;
  height: 100svh;
  overflow: hidden;
  position: relative;
}
</style>
