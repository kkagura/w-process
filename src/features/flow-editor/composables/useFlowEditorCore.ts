import { onBeforeUnmount, shallowRef } from 'vue'
import { FlowEditorCore } from '../../../core/flow/FlowEditorCore'
import type { HistoryState } from '../../../core/flow/commands/SceneCommand'
import type {
  EdgeId,
  BoxId,
  EdgeLineStyleData,
  EdgeRouteData,
  EditorFeedbackEvent,
  EditorUiState,
  FlowDocument,
  NodeBorderStyleData,
  NodeFillStyleData,
  SceneEvent,
  SelectionArrangeAction,
  SelectionState,
  NodeId,
  NodeTextStyleData,
  Point,
  Size,
  SwimlaneOrientation,
} from '../../../core/flow/types/flow'

export interface FlowEditorCanvasElements {
  backgroundCanvas: HTMLCanvasElement
  mainCanvas: HTMLCanvasElement
}

export function useFlowEditorCore() {
  const core = shallowRef<FlowEditorCore | null>(null)
  const uiState = shallowRef<EditorUiState | null>(null)
  const historyState = shallowRef<HistoryState>(createEmptyHistoryState())
  const latestFeedback = shallowRef<EditorFeedbackEvent | null>(null)
  let unsubscribe: (() => void) | null = null
  let unsubscribeHistory: (() => void) | null = null
  let unsubscribeFeedback: (() => void) | null = null

  function mount(elements: FlowEditorCanvasElements) {
    core.value?.dispose()
    unsubscribe?.()
    unsubscribeHistory?.()
    unsubscribeFeedback?.()

    const nextCore = new FlowEditorCore(elements)
    core.value = nextCore
    uiState.value = nextCore.scene.getUiState()
    historyState.value = nextCore.getHistoryState()
    unsubscribe = nextCore.scene.subscribe((event) => {
      uiState.value = applySceneEvent(uiState.value, event)
    })
    unsubscribeHistory = nextCore.subscribeHistory((state) => {
      historyState.value = state
    })
    unsubscribeFeedback = nextCore.subscribeFeedback((event) => {
      latestFeedback.value = event
    })
  }

  function undo() {
    core.value?.undo()
  }

  function redo() {
    core.value?.redo()
  }

  function arrangeSelection(action: SelectionArrangeAction) {
    core.value?.arrangeSelection(action)
  }

  function autoLayout() {
    core.value?.autoLayout()
  }

  function zoomIn() {
    core.value?.zoomIn()
  }

  function zoomOut() {
    core.value?.zoomOut()
  }

  function resetView() {
    core.value?.resetView()
  }

  function fitContent() {
    core.value?.fitContent()
  }

  function updateNodeLabel(nodeId: NodeId, label: string) {
    core.value?.updateNodeLabel(nodeId, label)
  }

  function updateNodePosition(nodeId: NodeId, position: Point) {
    core.value?.updateNodePosition(nodeId, position)
  }

  function updateNodeSize(nodeId: NodeId, size: Size) {
    core.value?.updateNodeSize(nodeId, size)
  }

  function updateNodeRotation(nodeId: NodeId, rotation: number) {
    core.value?.updateNodeRotation(nodeId, rotation)
  }

  function updateNodeTextStyle(nodeId: NodeId, textStyle: Partial<NodeTextStyleData>) {
    core.value?.updateNodeTextStyle(nodeId, textStyle)
  }

  function updateNodeBorderStyle(nodeId: NodeId, borderStyle: Partial<NodeBorderStyleData>) {
    core.value?.updateNodeBorderStyle(nodeId, borderStyle)
  }

  function updateNodeFillStyle(nodeId: NodeId, fillStyle: Partial<NodeFillStyleData>) {
    core.value?.updateNodeFillStyle(nodeId, fillStyle)
  }

  function updateEdgeLabel(edgeId: EdgeId, label: string) {
    core.value?.updateEdgeLabel(edgeId, label)
  }

  function updateEdgeLineStyle(edgeId: EdgeId, lineStyle: Partial<EdgeLineStyleData>) {
    core.value?.updateEdgeLineStyle(edgeId, lineStyle)
  }

  function updateEdgeRoute(edgeId: EdgeId, route: EdgeRouteData) {
    core.value?.updateEdgeRoute(edgeId, route)
  }

  function updateBoxLabel(boxId: BoxId, label: string) {
    core.value?.updateBoxLabel(boxId, label)
  }

  function updateSwimlaneOrientation(boxId: BoxId, orientation: SwimlaneOrientation) {
    core.value?.updateSwimlaneOrientation(boxId, orientation)
  }

  function addSwimlaneLane(boxId: BoxId) {
    core.value?.addSwimlaneLane(boxId)
  }

  function removeSwimlaneLane(laneId: BoxId) {
    core.value?.removeSwimlaneLane(laneId)
  }

  function exportDocument() {
    return core.value?.exportDocument() ?? null
  }

  function importDocument(document: FlowDocument) {
    const currentCore = core.value
    if (!currentCore) return

    currentCore.importDocument(document)
    uiState.value = currentCore.scene.getUiState()
    historyState.value = currentCore.getHistoryState()
  }

  function markSaved() {
    const currentCore = core.value
    if (!currentCore) return

    currentCore.markSaved()
    historyState.value = currentCore.getHistoryState()
  }

  onBeforeUnmount(() => {
    unsubscribe?.()
    unsubscribeHistory?.()
    unsubscribeFeedback?.()
    core.value?.dispose()
  })

  return {
    core,
    uiState,
    historyState,
    latestFeedback,
    mount,
    undo,
    redo,
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
    updateSwimlaneOrientation,
    addSwimlaneLane,
    removeSwimlaneLane,
    exportDocument,
    importDocument,
    markSaved,
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
      selectedEdge: null,
      selectedBox: null,
      summary: {
        ...state.summary,
        nodeCount: state.summary.nodeCount + 1,
      },
    }
  }

  if (event.type === 'node-updated') {
    if (state.selectedNode?.id !== event.node.id) return state

    return {
      ...state,
      selectedNode: event.node,
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

  if (event.type === 'nodes-moved') {
    if (!state.selectedNode) return state

    const selectedNodeMove = event.moves.find(move => move.nodeId === state.selectedNode?.id)
    if (!selectedNodeMove) return state

    return {
      ...state,
      selectedNode: {
        ...state.selectedNode,
        position: selectedNodeMove.position,
      },
    }
  }

  if (event.type === 'nodes-removed') {
    return {
      ...state,
      selection: createEmptySelectionState(),
      hovered: null,
      selectedNode: null,
      selectedEdge: null,
      selectedBox: null,
      summary: {
        nodeCount: Math.max(0, state.summary.nodeCount - event.nodeIds.length),
        edgeCount: Math.max(0, state.summary.edgeCount - event.removedEdgeCount),
        boxCount: state.summary.boxCount,
      },
    }
  }

  if (event.type === 'edge-added') {
    return {
      ...state,
      selection: event.selection,
      hovered: null,
      selectedNode: null,
      selectedEdge: event.edge,
      selectedBox: null,
      summary: {
        ...state.summary,
        edgeCount: state.summary.edgeCount + 1,
      },
    }
  }

  if (event.type === 'edge-updated') {
    if (state.selectedEdge?.id !== event.edge.id) return state

    return {
      ...state,
      selectedEdge: event.edge,
    }
  }

  if (event.type === 'edges-removed') {
    return {
      ...state,
      selection: createEmptySelectionState(),
      hovered: null,
      selectedNode: null,
      selectedEdge: null,
      selectedBox: null,
      summary: {
        ...state.summary,
        edgeCount: Math.max(0, state.summary.edgeCount - event.edgeIds.length),
      },
    }
  }

  if (event.type === 'selection-changed') {
    return {
      ...state,
      selection: event.selection,
      selectedNode: event.selectedNode,
      selectedEdge: event.selectedEdge,
      selectedBox: event.selectedBox,
    }
  }

  if (event.type === 'box-added') {
    return {
      ...state,
      selection: event.selection,
      hovered: null,
      selectedNode: null,
      selectedEdge: null,
      selectedBox: event.box,
      summary: {
        ...state.summary,
        boxCount: state.summary.boxCount + countBoxData(event.box),
      },
    }
  }

  if (event.type === 'box-updated') {
    if (state.selectedBox?.id !== event.box.id) return state
    return {
      ...state,
      selectedBox: event.box,
    }
  }

  if (event.type === 'boxes-removed') {
    return {
      ...state,
      selection: createEmptySelectionState(),
      hovered: null,
      selectedNode: null,
      selectedEdge: null,
      selectedBox: null,
      summary: {
        nodeCount: Math.max(0, state.summary.nodeCount - event.nodeIds.length),
        edgeCount: Math.max(0, state.summary.edgeCount - event.removedEdgeCount),
        boxCount: Math.max(0, state.summary.boxCount - event.removedBoxCount),
      },
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
    selection: createEmptySelectionState(),
    hovered: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNode: null,
    selectedEdge: null,
    selectedBox: null,
    summary: {
      nodeCount: 0,
      edgeCount: 0,
      boxCount: 0,
    },
  }
}

function createEmptySelectionState(): SelectionState {
  return {
    items: [],
    primary: null,
  }
}

function createEmptyHistoryState(): HistoryState {
  return {
    canUndo: false,
    canRedo: false,
    dirty: false,
  }
}

function countBoxData(data: import('../../../core/flow/types/flow').BoxData): number {
  return 1 + data.children.reduce((total, child) => (
    total + ('children' in child ? countBoxData(child) : 0)
  ), 0)
}
