export type NodeId = string
export type PortId = string
export type EdgeId = string
export type BoxId = string

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

export interface SnapGuide {
  type: 'vertical' | 'horizontal'
  position: number
  from: number
  to: number
}

export interface ViewportData {
  x: number
  y: number
  zoom: number
}

export interface PortTemplate {
  id: string
  label: string
  offset: Point
}

export interface ElementTemplate {
  type: string
  label: string
  defaultSize: Size
  ports: PortTemplate[]
  defaultProps?: Record<string, unknown>
}

export type SwimlaneOrientation = 'horizontal' | 'vertical'

export interface SwimlaneBoxTemplate {
  type: 'swimlane'
  label: string
  orientation: SwimlaneOrientation
  laneCount: number
}

export interface ArchitectureLayerBoxTemplate {
  type: 'layer'
  label: string
  defaultSize: Size
  defaultProps?: Record<string, unknown>
}

export type BoxTemplate = SwimlaneBoxTemplate | ArchitectureLayerBoxTemplate

export interface FlowPort {
  id: PortId
  nodeId: NodeId
  templateId: string
  label: string
  offset: Point
}

export interface FlowNode {
  id: NodeId
  type: string
  label: string
  position: Point
  size: Size
  rotation: number
  ports: FlowPort[]
  props: Record<string, unknown>
}

export type NodeTextHorizontalAlign = 'left' | 'center' | 'right'
export type NodeTextVerticalAlign = 'top' | 'middle' | 'bottom'
export type NodeTextOverflow = 'clip' | 'ellipsis'
export type NodeBorderDash = 'solid' | 'dashed'

export interface NodeTextStyleData {
  fontSize: number
  fontFamily?: string
  fontWeight: string
  fontStyle?: string
  color: string
  align: NodeTextHorizontalAlign
  verticalAlign: NodeTextVerticalAlign
  lineHeight: number
  padding: number
  maxLines: number
  overflow: NodeTextOverflow
}

export interface NodeBorderStyleData {
  color: string
  width: number
  dash: NodeBorderDash
}

export interface NodeFillStyleData {
  color: string
  opacity: number
}

export interface GroupTitleStyleData {
  backgroundColor: string
  color: string
  fontSize: number
}

export interface GroupLayoutData {
  padding: number
  headerHeight: number
}

export interface Endpoint {
  nodeId: NodeId
  portId: PortId
}

export interface FlowEdge {
  id: EdgeId
  source: Endpoint
  target: Endpoint
  label?: string
  props?: Record<string, unknown>
}

export type EdgeLineDash = 'solid' | 'dashed'

export interface EdgeLineStyleData {
  color: string
  width: number
  dash: EdgeLineDash
  arrowSize: number
}

export type EdgeRouteType = 'orthogonal' | 'bezier'

export interface EdgeRouteData {
  type: EdgeRouteType
}

export type SceneElementData = FlowNode | BoxData

export interface BoxData {
  id: BoxId
  type: 'root' | 'group' | 'layer' | 'swimlane' | 'lane' | 'subflow'
  label?: string
  position: Point
  size: Size
  children: SceneElementData[]
  props?: Record<string, unknown>
}

export interface FlowDocument {
  root: BoxData
  edges: FlowEdge[]
  viewport?: ViewportData
}

export type SelectableRef =
  | { type: 'node'; id: NodeId }
  | { type: 'edge'; id: EdgeId }
  | { type: 'box'; id: BoxId }

export interface SelectionState {
  items: SelectableRef[]
  primary: SelectableRef | null
}

export interface NodeMove {
  nodeId: NodeId
  position: Point
}

export type SelectionArrangeAction =
  | 'align-left'
  | 'align-vertical-center'
  | 'align-right'
  | 'distribute-vertical'
  | 'align-top'
  | 'align-horizontal-center'
  | 'align-bottom'
  | 'distribute-horizontal'

export interface SceneSummary {
  nodeCount: number
  edgeCount: number
  boxCount: number
}

export interface EditorUiState {
  selection: SelectionState
  hovered: SelectableRef | null
  viewport: ViewportData
  selectedNode: FlowNode | null
  selectedEdge: FlowEdge | null
  selectedBox: BoxData | null
  summary: SceneSummary
}

export type EditorFeedbackEvent =
  | { type: 'clipboard-copied'; nodeCount: number; edgeCount: number }
  | { type: 'clipboard-copy-empty' }
  | { type: 'clipboard-pasted'; nodeCount: number; edgeCount: number }
  | { type: 'clipboard-paste-empty' }
  | { type: 'selection-duplicated'; nodeCount: number; edgeCount: number }
  | { type: 'selection-duplicate-empty' }
  | { type: 'auto-layout-applied'; nodeCount: number; groupCount: number }
  | { type: 'auto-layout-skipped'; reason: 'insufficient-sibling-nodes' | 'unchanged' }

export type SceneEvent =
  | { type: 'node-added'; node: FlowNode; selection: SelectionState }
  | { type: 'node-updated'; node: FlowNode }
  | { type: 'nodes-updated'; nodes: FlowNode[] }
  | { type: 'node-moved'; nodeId: NodeId; position: Point }
  | { type: 'nodes-moved'; moves: NodeMove[] }
  | { type: 'nodes-reparented'; nodeIds: NodeId[] }
  | { type: 'nodes-removed'; nodeIds: NodeId[]; removedEdgeCount: number }
  | { type: 'box-added'; box: BoxData; selection: SelectionState }
  | { type: 'box-updated'; box: BoxData }
  | { type: 'boxes-removed'; boxIds: BoxId[]; removedBoxCount: number; nodeIds: NodeId[]; removedEdgeCount: number }
  | { type: 'edge-added'; edge: FlowEdge; selection: SelectionState }
  | { type: 'edge-updated'; edge: FlowEdge }
  | { type: 'edges-removed'; edgeIds: EdgeId[] }
  | { type: 'selection-changed'; selection: SelectionState; selectedNode: FlowNode | null; selectedEdge: FlowEdge | null; selectedBox: BoxData | null }
  | { type: 'hover-changed'; hovered: SelectableRef | null }
  | { type: 'viewport-changed'; viewport: ViewportData }
  | { type: 'document-loaded'; uiState: EditorUiState }

export type HitTestResult =
  | { type: 'port'; nodeId: NodeId; portId: PortId }
  | { type: 'node'; id: NodeId }
  | { type: 'box'; id: BoxId }
  | { type: 'edge'; id: EdgeId }
  | null

export interface FlowTheme {
  colors: {
    canvas: string
    grid: string
    nodeFill: string
    nodeBorder: string
    nodeText: string
    portFill: string
    selected: string
    hovered: string
  }
}

export type RenderMode = 'editor' | 'preview'

export interface FlowRenderOptions {
  mode: RenderMode
  showGrid?: boolean
  showPorts?: boolean
  showInteractionOverlays?: boolean
  background?: string | 'transparent'
}

export interface NodeDrawContext {
  renderMode: RenderMode
  showPorts: boolean
  selected: boolean
  hovered: boolean
  dragging: boolean
  connecting: boolean
  disabled: boolean
  theme: FlowTheme
  viewport: ViewportData
}

export interface BoxDrawContext {
  renderMode: RenderMode
  selected: boolean
  hovered: boolean
  dropTarget: boolean
  theme: FlowTheme
  viewport: ViewportData
}

export interface EdgeDrawContext {
  renderMode: RenderMode
  selected: boolean
  hovered: boolean
  sourcePoint: Point
  targetPoint: Point
  sourceRect: Rect | null
  targetRect: Rect | null
  obstacles: Rect[]
  theme: FlowTheme
  viewport: ViewportData
}

export const defaultTheme: FlowTheme = {
  colors: {
    canvas: '#f8fafc',
    grid: '#e2e8f0',
    nodeFill: '#ffffff',
    nodeBorder: '#94a3b8',
    nodeText: '#111827',
    portFill: '#2563eb',
    selected: '#2563eb',
    hovered: '#0ea5e9',
  },
}
