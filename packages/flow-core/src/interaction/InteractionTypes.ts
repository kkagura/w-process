import type { BoxData, BoxId, Endpoint, FlowNode, NodeId, Point, Rect, Size, ViewportData } from '../types/flow'
import type { ResizeHandle } from './NodeResizeInteraction'
import type { NodeRotateModeData, SelectionRotateModeData } from './NodeRotateInteraction'
import type { SwimlaneDividerResizeModeData } from './SwimlaneResizeInteraction'
import type { BoxResizeModeData } from './BoxResizeInteraction'

export type InteractionMode =
  | { type: 'idle' }
  | { type: 'dragging-node'; nodeId: NodeId; start: Point; origins: Array<{ nodeId: NodeId; origin: Point; size: Size }> }
  | { type: 'dragging-box'; boxId: BoxId; start: Point; before: BoxData }
  | ({ type: 'resizing-box' } & BoxResizeModeData)
  | ({ type: 'resizing-swimlane-divider' } & SwimlaneDividerResizeModeData)
  | { type: 'resizing-node'; nodeId: NodeId; handle: ResizeHandle; start: Point; before: FlowNode; startRect: Rect }
  | { type: 'resizing-selection'; handle: ResizeHandle; start: Point; before: FlowNode[]; startBounds: Rect }
  | ({ type: 'rotating-node' } & NodeRotateModeData)
  | ({ type: 'rotating-selection' } & SelectionRotateModeData)
  | { type: 'connecting'; source: Endpoint; current: Point }
  | { type: 'panning'; start: Point; origin: ViewportData }
  | { type: 'pending-selection'; startCanvas: Point; startWorld: Point }
  | { type: 'selecting'; start: Point; current: Point }
