export interface CanvasLayerOptions {
  backgroundCanvas: HTMLCanvasElement
  mainCanvas: HTMLCanvasElement
}

export class CanvasLayerManager {
  readonly backgroundCanvas: HTMLCanvasElement
  readonly mainCanvas: HTMLCanvasElement
  readonly backgroundContext: CanvasRenderingContext2D
  readonly mainContext: CanvasRenderingContext2D

  private width = 0
  private height = 0
  private pixelRatio = 1

  constructor(options: CanvasLayerOptions) {
    this.backgroundCanvas = options.backgroundCanvas
    this.mainCanvas = options.mainCanvas

    const backgroundContext = this.backgroundCanvas.getContext('2d')
    const mainContext = this.mainCanvas.getContext('2d')
    if (!backgroundContext || !mainContext) {
      throw new Error('Canvas 2D context is not available')
    }

    this.backgroundContext = backgroundContext
    this.mainContext = mainContext
  }

  syncSize() {
    const rect = this.mainCanvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(rect.width))
    const height = Math.max(1, Math.round(rect.height))
    const pixelRatio = window.devicePixelRatio || 1
    const changed = width !== this.width
      || height !== this.height
      || pixelRatio !== this.pixelRatio

    if (!changed) return false

    this.width = width
    this.height = height
    this.pixelRatio = pixelRatio

    for (const canvas of [this.backgroundCanvas, this.mainCanvas]) {
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }

    this.resetTransform()
    return true
  }

  getSize() {
    return {
      width: this.width,
      height: this.height,
      pixelRatio: this.pixelRatio,
    }
  }

  resetTransform() {
    this.backgroundContext.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
    this.mainContext.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
  }

  clearBackground() {
    this.backgroundContext.clearRect(0, 0, this.width, this.height)
  }

  clearMain() {
    this.mainContext.clearRect(0, 0, this.width, this.height)
  }
}
