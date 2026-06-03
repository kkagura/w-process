import type { Endpoint, NodeId, Point, Size, ViewportData } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'
import type { HistoryManager } from '../commands/HistoryManager'

export type InteractionMode =
  | { type: 'idle' }
  | { type: 'dragging-node'; nodeId: NodeId; start: Point; origins: Array<{ nodeId: NodeId; origin: Point; size: Size }> }
  | { type: 'connecting'; source: Endpoint; current: Point }
  | { type: 'panning'; start: Point; origin: ViewportData }
  | { type: 'pending-selection'; startCanvas: Point; startWorld: Point }
  | { type: 'selecting'; start: Point; current: Point }

export interface InteractionControllerOptions {
  canvas: HTMLCanvasElement
  scene: SceneManager
  history: HistoryManager
  requestRender: (options?: { background?: boolean; main?: boolean }) => void
}
