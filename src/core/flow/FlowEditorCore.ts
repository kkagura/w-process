import { ElementRegistry } from './elements/ElementRegistry'
import { InteractionController } from './interaction/InteractionController'
import { CanvasLayerManager } from './renderer/CanvasLayerManager'
import { CanvasRenderer } from './renderer/CanvasRenderer'
import { SceneManager } from './scene/SceneManager'
import type { ElementTemplate, FlowNode, Point } from './types/flow'
import { findElementTemplate } from './constants/elementTemplates'
import { createId } from './utils/ids'
import { CoordinateTransformer } from './viewport/CoordinateTransformer'

export interface FlowEditorCoreOptions {
  backgroundCanvas: HTMLCanvasElement
  mainCanvas: HTMLCanvasElement
}

export class FlowEditorCore {
  readonly registry = ElementRegistry.createDefault()
  readonly scene = new SceneManager(this.registry)

  private layers: CanvasLayerManager
  private renderer: CanvasRenderer
  private interaction: InteractionController
  private resizeObserver: ResizeObserver | null = null
  private mainFrame = 0
  private backgroundFrame = 0
  private unsubscribeScene: (() => void) | null = null

  constructor(options: FlowEditorCoreOptions) {
    this.layers = new CanvasLayerManager(options)
    this.renderer = new CanvasRenderer(this.registry)
    this.interaction = new InteractionController({
      canvas: options.mainCanvas,
      scene: this.scene,
      requestRender: options => this.requestRender(options),
    })

    options.mainCanvas.addEventListener('dragover', this.handleDragOver)
    options.mainCanvas.addEventListener('drop', this.handleDrop)

    this.layers.syncSize()
    this.renderBackground()
    this.renderMain()

    this.unsubscribeScene = this.scene.subscribe((event) => {
      if (event.type === 'viewport-changed' || event.type === 'document-loaded') {
        this.requestRender({ background: true, main: true })
        return
      }

      this.requestMainRender()
    })
    this.resizeObserver = new ResizeObserver(() => {
      if (this.layers.syncSize()) {
        this.requestBackgroundRender()
        this.requestMainRender()
      }
    })
    this.resizeObserver.observe(options.mainCanvas)
  }

  dispose() {
    this.interaction.dispose()
    this.layers.mainCanvas.removeEventListener('dragover', this.handleDragOver)
    this.layers.mainCanvas.removeEventListener('drop', this.handleDrop)
    this.resizeObserver?.disconnect()
    this.unsubscribeScene?.()
    cancelAnimationFrame(this.mainFrame)
    cancelAnimationFrame(this.backgroundFrame)
  }

  requestBackgroundRender() {
    cancelAnimationFrame(this.backgroundFrame)
    this.backgroundFrame = requestAnimationFrame(() => this.renderBackground())
  }

  requestMainRender() {
    cancelAnimationFrame(this.mainFrame)
    this.mainFrame = requestAnimationFrame(() => this.renderMain())
  }

  private requestRender(options: { background?: boolean; main?: boolean } = { main: true }) {
    if (options.background) {
      this.requestBackgroundRender()
    }

    if (options.main ?? !options.background) {
      this.requestMainRender()
    }
  }

  private renderBackground() {
    this.renderer.renderBackground({
      layers: this.layers,
      scene: this.scene,
      interaction: {
        draggingNodeId: this.interaction.getDraggingNodeId(),
      },
    })
  }

  private renderMain() {
    this.renderer.renderMain({
      layers: this.layers,
      scene: this.scene,
      interaction: {
        draggingNodeId: this.interaction.getDraggingNodeId(),
      },
    })
  }

  private handleDragOver = (event: DragEvent) => {
    event.preventDefault()
  }

  private handleDrop = (event: DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer?.getData('application/x-flow-node')
    if (!type) return

    const template = findElementTemplate(type)
    if (!template) return

    const worldPoint = CoordinateTransformer.clientToWorld(
      event,
      this.layers.mainCanvas,
      this.scene.getViewport(),
    )
    this.createNodeFromTemplate(template, {
      x: worldPoint.x - template.defaultSize.width / 2,
      y: worldPoint.y - template.defaultSize.height / 2,
    })
  }

  private createNodeFromTemplate(template: ElementTemplate, position: Point) {
    const nodeId = createId('node')
    const nodeData: FlowNode = {
      id: nodeId,
      type: template.type,
      label: template.label,
      position,
      size: template.defaultSize,
      ports: template.ports.map(port => ({
        id: createId('port'),
        nodeId,
        templateId: port.id,
        label: port.label,
        direction: port.direction,
        offset: port.offset,
      })),
      props: { ...(template.defaultProps ?? {}) },
    }

    this.scene.addNode(this.registry.createNode(nodeData))
  }
}
