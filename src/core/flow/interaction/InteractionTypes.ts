import type { NodeId, Point, ViewportData } from '../types/flow'
import type { SceneManager } from '../scene/SceneManager'

export type InteractionMode =
  | { type: 'idle' }
  | { type: 'dragging-node'; nodeId: NodeId; start: Point; origin: Point }
  | { type: 'panning'; start: Point; origin: ViewportData }
  | { type: 'pending-selection'; startCanvas: Point; startWorld: Point }
  | { type: 'selecting'; start: Point; current: Point }

export interface InteractionControllerOptions {
  canvas: HTMLCanvasElement
  scene: SceneManager
  requestRender: (options?: { background?: boolean; main?: boolean }) => void
}
