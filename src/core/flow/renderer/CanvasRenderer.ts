import type { ElementRegistry } from '../elements/ElementRegistry'
import type { BaseNode } from '../elements/BaseNode'
import type { SceneManager } from '../scene/SceneManager'
import type { FlowTheme, NodeDrawContext, Point, Rect, SnapGuide, ViewportData } from '../types/flow'
import type { CanvasLayerManager } from './CanvasLayerManager'
import { routeOrthogonalEdge } from '../routing/orthogonal'

export interface CanvasInteractionState {
  draggingNodeId: string | null
  selectionRect: Rect | null
  snapGuides: SnapGuide[]
  pendingEdge: {
    sourcePoint: { x: number; y: number }
    currentPoint: { x: number; y: number }
    sourceRect: Rect | null
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

    this.drawEdges(ctx, context)
    this.drawPendingEdge(ctx, context)
    this.drawBoxes(ctx, context)
    this.drawNodes(ctx, context)
    this.drawSelectedNodeBounds(ctx, context)
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
      obstacles: context.scene.getNodeRects(),
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

  private drawBoxes(ctx: CanvasRenderingContext2D, context: RenderContext) {
    for (const box of context.scene.getBoxes()) {
      const boxView = this.registry.getBoxView(box.type)
      boxView.draw(ctx, box, {
        selected: context.scene.isSelected({ type: 'box', id: box.id }),
        hovered: context.scene.isHovered({ type: 'box', id: box.id }),
        theme: context.scene.getTheme(),
        viewport: context.scene.getViewport(),
      })
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
    const rect = context.scene.getSelectedNodeBounds()
    if (!rect) return

    const viewport = context.scene.getViewport()
    const theme = context.scene.getTheme()
    const padding = 4 / viewport.zoom

    ctx.save()
    ctx.strokeStyle = theme.colors.selected
    ctx.lineWidth = 1 / viewport.zoom
    ctx.setLineDash([6 / viewport.zoom, 4 / viewport.zoom])
    ctx.strokeRect(
      rect.x - padding,
      rect.y - padding,
      rect.width + padding * 2,
      rect.height + padding * 2,
    )
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

function drawPolyline(ctx: CanvasRenderingContext2D, path: Point[]) {
  if (path.length === 0) return

  ctx.moveTo(path[0].x, path[0].y)
  for (let index = 1; index < path.length; index += 1) {
    ctx.lineTo(path[index].x, path[index].y)
  }
}
