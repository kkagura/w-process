import type { ElementRegistry } from '../elements/ElementRegistry'
import type { BaseNode } from '../elements/BaseNode'
import type { SceneManager } from '../scene/SceneManager'
import type { FlowTheme, NodeDrawContext, Point, Rect, SnapGuide, ViewportData } from '../types/flow'
import type { CanvasLayerManager } from './CanvasLayerManager'
import { routeOrthogonalEdge } from '../routing/orthogonal'
import { getResizeHandles } from '../interaction/NodeResizeInteraction'
import {
  getRotateHandle,
  getRotateHandleAnchor,
  getRotatedSelectionRotateHandle,
  getRotatedSelectionRotateHandleAnchor,
  getSelectionRotateHandle,
  getSelectionRotateHandleAnchor,
} from '../interaction/NodeRotateInteraction'
import { getRectCenter, rotatePoint } from '../utils/geometry'

export interface CanvasInteractionState {
  draggingNodeId: string | null
  draggingBoxId: string | null
  dropTargetBoxId: string | null
  selectionRect: Rect | null
  selectionBoundsOverlay: {
    rect: Rect
    rotation: number
  } | null
  snapGuides: SnapGuide[]
  pendingEdge: {
    sourcePoint: { x: number; y: number }
    currentPoint: { x: number; y: number }
    sourceRect: Rect | null
    targetRect: Rect | null
    valid: boolean
  } | null
}

export interface RenderContext {
  layers: CanvasLayerManager
  scene: SceneManager
  interaction: CanvasInteractionState
}

export class CanvasRenderer {
  private registry: ElementRegistry

  constructor(registry: ElementRegistry) {
    this.registry = registry
  }

  renderBackground(context: RenderContext) {
    const { width, height } = context.layers.getSize()
    const ctx = context.layers.backgroundContext
    const theme = context.scene.getTheme()

    context.layers.resetTransform()
    context.layers.clearBackground()
    ctx.fillStyle = theme.colors.canvas
    ctx.fillRect(0, 0, width, height)
    this.drawGrid(ctx, width, height, context.scene.getViewport(), theme)
  }

  renderMain(context: RenderContext) {
    const ctx = context.layers.mainContext
    const viewport = context.scene.getViewport()

    context.layers.resetTransform()
    context.layers.clearMain()

    ctx.save()
    ctx.translate(viewport.x, viewport.y)
    ctx.scale(viewport.zoom, viewport.zoom)

    this.drawBoxBackgrounds(ctx, context)
    this.drawEdges(ctx, context)
    this.drawPendingEdge(ctx, context)
    this.drawBoxForegrounds(ctx, context)
    this.drawNodes(ctx, context)
    this.drawSelectedNodeBounds(ctx, context)
    this.drawResizeHandles(ctx, context)
    this.drawSwimlaneResizeHandles(ctx, context)
    this.drawRotateHandle(ctx, context)
    this.drawSnapGuides(ctx, context)
    this.drawSelectionRect(ctx, context)

    ctx.restore()
  }

  private drawEdges(ctx: CanvasRenderingContext2D, context: RenderContext) {
    for (const edge of context.scene.getEdges()) {
      const edgeContext = context.scene.createEdgeDrawContext(edge)
      if (!edgeContext) continue

      const edgeView = this.registry.getEdgeView(edge.id)
      edgeView.draw(ctx, edge, edgeContext)
    }
  }

  private drawPendingEdge(ctx: CanvasRenderingContext2D, context: RenderContext) {
    const pendingEdge = context.interaction.pendingEdge
    if (!pendingEdge) return

    const viewport = context.scene.getViewport()
    const theme = context.scene.getTheme()
    const path = routeOrthogonalEdge({
      source: pendingEdge.sourcePoint,
      target: pendingEdge.currentPoint,
      sourceRect: pendingEdge.sourceRect,
      targetRect: pendingEdge.targetRect,
      obstacles: getEndpointObstacles(pendingEdge.sourceRect, pendingEdge.targetRect),
    })

    ctx.save()
    ctx.beginPath()
    drawPolyline(ctx, path)
    ctx.strokeStyle = pendingEdge.valid ? theme.colors.selected : '#ef4444'
    ctx.lineWidth = 1.8 / viewport.zoom
    ctx.setLineDash([6 / viewport.zoom, 5 / viewport.zoom])
    ctx.stroke()
    ctx.restore()
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    viewport: ViewportData,
    theme: FlowTheme,
  ) {
    const gap = 24 * viewport.zoom
    const offsetX = viewport.x % gap
    const offsetY = viewport.y % gap

    ctx.save()
    ctx.strokeStyle = theme.colors.grid
    ctx.lineWidth = 1
    ctx.beginPath()

    for (let x = offsetX; x < width; x += gap) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }

    for (let y = offsetY; y < height; y += gap) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }

    ctx.stroke()
    ctx.restore()
  }

  private drawBoxBackgrounds(ctx: CanvasRenderingContext2D, context: RenderContext) {
    for (const box of context.scene.getBoxes()) {
      const boxView = this.registry.getBoxView(box.type)
      boxView.drawBackground(ctx, box, this.createBoxDrawContext(box.id, context))
    }
  }

  private drawBoxForegrounds(ctx: CanvasRenderingContext2D, context: RenderContext) {
    for (const box of context.scene.getBoxes()) {
      const boxView = this.registry.getBoxView(box.type)
      boxView.drawForeground(ctx, box, this.createBoxDrawContext(box.id, context))
    }
  }

  private createBoxDrawContext(boxId: string, context: RenderContext) {
    return {
      selected: context.scene.isSelected({ type: 'box' as const, id: boxId }),
      hovered: context.scene.isHovered({ type: 'box' as const, id: boxId }),
      dropTarget: context.interaction.dropTargetBoxId === boxId,
      theme: context.scene.getTheme(),
      viewport: context.scene.getViewport(),
    }
  }

  private drawNodes(ctx: CanvasRenderingContext2D, context: RenderContext) {
    for (const node of context.scene.getNodes()) {
      const nodeView = this.registry.getNodeView(node.type)
      nodeView.draw(ctx, node, this.createNodeDrawContext(node, context))
    }
  }

  private createNodeDrawContext(node: BaseNode, context: RenderContext): NodeDrawContext {
    return {
      selected: context.scene.isSelected({ type: 'node', id: node.id }),
      hovered: context.scene.isHovered({ type: 'node', id: node.id }),
      dragging: context.interaction.draggingNodeId === node.id,
      connecting: false,
      disabled: false,
      theme: context.scene.getTheme(),
      viewport: context.scene.getViewport(),
    }
  }

  private drawSelectionRect(ctx: CanvasRenderingContext2D, context: RenderContext) {
    const rect = context.interaction.selectionRect
    if (!rect) return

    const viewport = context.scene.getViewport()
    const theme = context.scene.getTheme()

    ctx.save()
    ctx.fillStyle = 'rgba(37, 99, 235, 0.08)'
    ctx.strokeStyle = theme.colors.selected
    ctx.lineWidth = 1 / viewport.zoom
    ctx.setLineDash([6 / viewport.zoom, 4 / viewport.zoom])
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    ctx.restore()
  }

  private drawSelectedNodeBounds(ctx: CanvasRenderingContext2D, context: RenderContext) {
    const viewport = context.scene.getViewport()
    const theme = context.scene.getTheme()
    const overlay = context.interaction.selectionBoundsOverlay
    const paddedRect = overlay?.rect
      ?? getNullableSelectionResizeRect(context.scene.getSelectedNodeBounds(), viewport)
    if (!paddedRect) return

    ctx.save()
    ctx.strokeStyle = theme.colors.selected
    ctx.lineWidth = 1 / viewport.zoom
    ctx.setLineDash([6 / viewport.zoom, 4 / viewport.zoom])
    strokeRotatedRect(ctx, paddedRect, overlay?.rotation ?? 0)
    ctx.restore()
  }

  private drawResizeHandles(ctx: CanvasRenderingContext2D, context: RenderContext) {
    const selection = context.scene.getSelection()
    const singleNodeSelected = selection.items.length === 1 && selection.primary?.type === 'node'
    const overlay = context.interaction.selectionBoundsOverlay
    const baseRect = singleNodeSelected
      ? context.scene.getNodeRect(selection.primary!.id)
      : overlay?.rect ?? getNullableSelectionResizeRect(context.scene.getSelectedNodeBounds(), context.scene.getViewport())
    if (!baseRect) return

    const viewport = context.scene.getViewport()
    const theme = context.scene.getTheme()
    const handles = getResizeHandles(baseRect, viewport, {
      offset: singleNodeSelected ? undefined : 0,
    })
    const rotation = singleNodeSelected ? 0 : overlay?.rotation ?? 0

    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = theme.colors.selected
    ctx.lineWidth = 1.2 / viewport.zoom

    for (const handle of handles) {
      const handleRect = rotation === 0
        ? handle.rect
        : rotateHandleRect(handle.rect, getRectCenter(baseRect), rotation)
      ctx.beginPath()
      ctx.rect(handleRect.x, handleRect.y, handleRect.width, handleRect.height)
      ctx.fill()
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawRotateHandle(ctx: CanvasRenderingContext2D, context: RenderContext) {
    const selection = context.scene.getSelection()
    const viewport = context.scene.getViewport()
    const theme = context.scene.getTheme()

    const singleNodeSelected = selection.items.length === 1 && selection.primary?.type === 'node'
    const node = singleNodeSelected ? context.scene.getNodeData(selection.primary!.id) : null
    const singleNodeRect = singleNodeSelected ? context.scene.getNodeRawRect(selection.primary!.id) : null
    const overlay = context.interaction.selectionBoundsOverlay
    const selectionRect = singleNodeSelected
      ? null
      : overlay?.rect ?? getNullableSelectionResizeRect(context.scene.getSelectedNodeBounds(), viewport)
    const rotateHandleData = node && singleNodeRect
      ? {
          handle: getRotateHandle(singleNodeRect, node.rotation, viewport),
          anchor: getRotateHandleAnchor(singleNodeRect, node.rotation),
        }
      : overlay
        ? {
            handle: getRotatedSelectionRotateHandle(overlay.rect, overlay.rotation, viewport),
            anchor: getRotatedSelectionRotateHandleAnchor(overlay.rect, overlay.rotation),
          }
      : selectionRect
        ? {
            handle: getSelectionRotateHandle(selectionRect, viewport),
            anchor: getSelectionRotateHandleAnchor(selectionRect),
          }
        : null
    if (!rotateHandleData) return

    const { handle, anchor } = rotateHandleData
    const radius = handle.rect.width / 2

    ctx.save()
    ctx.strokeStyle = theme.colors.selected
    ctx.fillStyle = '#ffffff'
    ctx.lineWidth = 1.2 / viewport.zoom
    ctx.beginPath()
    ctx.moveTo(anchor.x, anchor.y)
    ctx.lineTo(handle.center.x, handle.center.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(handle.center.x, handle.center.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }

  private drawSwimlaneResizeHandles(ctx: CanvasRenderingContext2D, context: RenderContext) {
    const selection = context.scene.getSelection()
    if (selection.items.length !== 1 || selection.primary?.type !== 'box') return

    const box = context.scene.getBoxData(selection.primary.id)
    if (!box || box.type !== 'swimlane') return

    const viewport = context.scene.getViewport()
    const theme = context.scene.getTheme()
    const rect = {
      ...box.position,
      ...box.size,
    }

    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = theme.colors.selected
    ctx.lineWidth = 1.2 / viewport.zoom

    for (const handle of getResizeHandles(rect, viewport, { offset: 0 })) {
      ctx.beginPath()
      ctx.rect(handle.rect.x, handle.rect.y, handle.rect.width, handle.rect.height)
      ctx.fill()
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawSnapGuides(ctx: CanvasRenderingContext2D, context: RenderContext) {
    const guides = context.interaction.snapGuides
    if (guides.length === 0) return

    const viewport = context.scene.getViewport()

    ctx.save()
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.78)'
    ctx.lineWidth = 1 / viewport.zoom
    ctx.setLineDash([5 / viewport.zoom, 4 / viewport.zoom])
    ctx.beginPath()

    for (const guide of guides) {
      if (guide.type === 'vertical') {
        ctx.moveTo(guide.position, guide.from)
        ctx.lineTo(guide.position, guide.to)
      }
      else {
        ctx.moveTo(guide.from, guide.position)
        ctx.lineTo(guide.to, guide.position)
      }
    }

    ctx.stroke()
    ctx.restore()
  }
}

function getEndpointObstacles(...rects: Array<Rect | null>) {
  return rects.filter((rect): rect is Rect => Boolean(rect))
}

function getNullableSelectionResizeRect(rect: Rect | null, viewport: ViewportData) {
  return rect ? getSelectionResizeRect(rect, viewport) : null
}

function getSelectionResizeRect(rect: Rect, viewport: ViewportData): Rect {
  const padding = 4 / viewport.zoom
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

function strokeRotatedRect(ctx: CanvasRenderingContext2D, rect: Rect, rotation: number) {
  if (rotation === 0) {
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    return
  }

  const center = getRectCenter(rect)
  ctx.save()
  ctx.translate(center.x, center.y)
  ctx.rotate(rotation * Math.PI / 180)
  ctx.strokeRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height)
  ctx.restore()
}

function rotateHandleRect(rect: Rect, center: Point, rotation: number): Rect {
  const handleCenter = rotatePoint(getRectCenter(rect), center, rotation)
  return {
    x: handleCenter.x - rect.width / 2,
    y: handleCenter.y - rect.height / 2,
    width: rect.width,
    height: rect.height,
  }
}

function drawPolyline(ctx: CanvasRenderingContext2D, path: Point[]) {
  if (path.length === 0) return

  ctx.moveTo(path[0].x, path[0].y)
  for (let index = 1; index < path.length; index += 1) {
    ctx.lineTo(path[index].x, path[index].y)
  }
}
