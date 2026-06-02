import { onBeforeUnmount, shallowRef } from 'vue'
import { FlowEditorCore } from '../../../core/flow/FlowEditorCore'
import type { EditorUiState, SceneEvent } from '../../../core/flow/types/flow'

export interface FlowEditorCanvasElements {
  backgroundCanvas: HTMLCanvasElement
  mainCanvas: HTMLCanvasElement
}

export function useFlowEditorCore() {
  const core = shallowRef<FlowEditorCore | null>(null)
  const uiState = shallowRef<EditorUiState | null>(null)
  let unsubscribe: (() => void) | null = null

  function mount(elements: FlowEditorCanvasElements) {
    core.value?.dispose()
    unsubscribe?.()

    const nextCore = new FlowEditorCore(elements)
    core.value = nextCore
    uiState.value = nextCore.scene.getUiState()
    unsubscribe = nextCore.scene.subscribe((event) => {
      uiState.value = applySceneEvent(uiState.value, event)
    })
  }

  onBeforeUnmount(() => {
    unsubscribe?.()
    core.value?.dispose()
  })

  return {
    core,
    uiState,
    mount,
  }
}

function applySceneEvent(current: EditorUiState | null, event: SceneEvent): EditorUiState {
  if (event.type === 'document-loaded') {
    return event.uiState
  }

  const state = current ?? createEmptyUiState()

  if (event.type === 'node-added') {
    return {
      ...state,
      selection: event.selection,
      hovered: null,
      selectedNode: event.node,
      summary: {
        ...state.summary,
        nodeCount: state.summary.nodeCount + 1,
      },
    }
  }

  if (event.type === 'node-moved') {
    if (state.selectedNode?.id !== event.nodeId) return state

    return {
      ...state,
      selectedNode: {
        ...state.selectedNode,
        position: event.position,
      },
    }
  }

  if (event.type === 'node-removed') {
    return {
      ...state,
      selection: null,
      hovered: null,
      selectedNode: null,
      summary: {
        nodeCount: Math.max(0, state.summary.nodeCount - 1),
        edgeCount: Math.max(0, state.summary.edgeCount - event.removedEdgeCount),
      },
    }
  }

  if (event.type === 'selection-changed') {
    return {
      ...state,
      selection: event.selection,
      selectedNode: event.selectedNode,
    }
  }

  if (event.type === 'hover-changed') {
    return {
      ...state,
      hovered: event.hovered,
    }
  }

  if (event.type === 'viewport-changed') {
    return {
      ...state,
      viewport: event.viewport,
    }
  }

  return state
}

function createEmptyUiState(): EditorUiState {
  return {
    selection: null,
    hovered: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNode: null,
    summary: {
      nodeCount: 0,
      edgeCount: 0,
    },
  }
}
