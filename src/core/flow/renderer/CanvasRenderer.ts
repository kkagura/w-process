import type { ElementRegistry } from '../elements/ElementRegistry'
import type { BaseNode } from '../elements/BaseNode'
import type { SceneManager } from '../scene/SceneManager'
import type { FlowTheme, NodeDrawContext, ViewportData } from '../types/flow'
import type { CanvasLayerManager } from './CanvasLayerManager'

export interface CanvasInteractionState {
  draggingNodeId: string | null
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

    this.drawBoxes(ctx, context)
    this.drawNodes(ctx, context)

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
}
