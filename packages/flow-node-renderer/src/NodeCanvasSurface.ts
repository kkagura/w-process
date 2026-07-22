// @env node

import { createCanvas } from '@napi-rs/canvas'
import type { Canvas, SKRSContext2D } from '@napi-rs/canvas'
import type { CanvasRenderSurface } from '@w-process/flow-core'

export class NodeCanvasSurface implements CanvasRenderSurface {
  readonly backgroundContext: CanvasRenderSurface['backgroundContext']
  readonly mainContext: CanvasRenderSurface['mainContext']

  private readonly backgroundCanvas: Canvas
  private readonly mainCanvas: Canvas
  private readonly backgroundNativeContext: SKRSContext2D
  private readonly mainNativeContext: SKRSContext2D
  private readonly width: number
  private readonly height: number
  private readonly pixelRatio: number
  private readonly physicalWidth: number
  private readonly physicalHeight: number

  constructor(width: number, height: number, pixelRatio: number) {
    this.width = width
    this.height = height
    this.pixelRatio = pixelRatio
    this.physicalWidth = Math.max(1, Math.ceil(width * pixelRatio))
    this.physicalHeight = Math.max(1, Math.ceil(height * pixelRatio))
    this.backgroundCanvas = createCanvas(this.physicalWidth, this.physicalHeight)
    this.mainCanvas = createCanvas(this.physicalWidth, this.physicalHeight)
    this.backgroundNativeContext = this.backgroundCanvas.getContext('2d')
    this.mainNativeContext = this.mainCanvas.getContext('2d')

    // 两套 Canvas 2D API 在运行时兼容；类型断言集中在 Node 适配层，避免污染核心 View。
    this.backgroundContext = this.backgroundNativeContext as unknown as CanvasRenderSurface['backgroundContext']
    this.mainContext = this.mainNativeContext as unknown as CanvasRenderSurface['mainContext']
    this.resetTransform()
  }

  getSize(): { width: number, height: number, pixelRatio: number } {
    return {
      width: this.width,
      height: this.height,
      pixelRatio: this.pixelRatio,
    }
  }

  getPhysicalSize(): { width: number, height: number } {
    return {
      width: this.physicalWidth,
      height: this.physicalHeight,
    }
  }

  resetTransform(): void {
    this.backgroundNativeContext.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
    this.mainNativeContext.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
  }

  clearBackground(): void {
    this.backgroundNativeContext.clearRect(0, 0, this.width, this.height)
  }

  clearMain(): void {
    this.mainNativeContext.clearRect(0, 0, this.width, this.height)
  }

  async encodePng(): Promise<Buffer> {
    const output = createCanvas(this.physicalWidth, this.physicalHeight)
    const context = output.getContext('2d')
    context.drawImage(this.backgroundCanvas, 0, 0)
    context.drawImage(this.mainCanvas, 0, 0)
    return output.encode('png')
  }
}

