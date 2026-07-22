export interface CanvasRenderSurface {
  readonly backgroundContext: CanvasRenderingContext2D
  readonly mainContext: CanvasRenderingContext2D

  getSize(): {
    width: number
    height: number
    pixelRatio: number
  }

  resetTransform(): void
  clearBackground(): void
  clearMain(): void
}
