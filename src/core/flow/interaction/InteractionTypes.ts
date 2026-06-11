import type { BoxData, BoxId, EditorFeedbackEvent, Endpoint, FlowNode, NodeId, Point, Rect, Size, ViewportData } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { HistoryManager } from '../commands/HistoryManager'
import type { ResizeHandle } from './NodeResizeInteraction'
import type { NodeRotateModeData, SelectionRotateModeData } from './NodeRotateInteraction'

export type InteractionMode =
  | { type: 'idle' }
  | { type: 'dragging-node'; nodeId: NodeId; start: Point; origins: Array<{ nodeId: NodeId; origin: Point; size: Size }> }
  | { type: 'dragging-box'; boxId: BoxId; start: Point; before: BoxData }
  | { type: 'resizing-node'; nodeId: NodeId; handle: ResizeHandle; start: Point; before: FlowNode; startRect: Rect }
  | { type: 'resizing-selection'; handle: ResizeHandle; start: Point; before: FlowNode[]; startBounds: Rect }
  | ({ type: 'rotating-node' } & NodeRotateModeData)
  | ({ type: 'rotating-selection' } & SelectionRotateModeData)
  | { type: 'connecting'; source: Endpoint; current: Point }
  | { type: 'panning'; start: Point; origin: ViewportData }
  | { type: 'pending-selection'; startCanvas: Point; startWorld: Point }
  | { type: 'selecting'; start: Point; current: Point }

export interface InteractionControllerOptions {
  canvas: HTMLCanvasElement
  scene: SceneManager
  history: HistoryManager
  requestRender: (options?: { background?: boolean; main?: boolean }) => void
  emitFeedback?: (event: EditorFeedbackEvent) => void
}
