export type FlowRenderErrorCode =
  | 'INVALID_ARGUMENT'
  | 'INPUT_NOT_FOUND'
  | 'INVALID_JSON'
  | 'INVALID_DOCUMENT'
  | 'FONT_REGISTRATION_FAILED'
  | 'CANVAS_SIZE_EXCEEDED'
  | 'RENDER_FAILED'
  | 'OUTPUT_EXISTS'
  | 'OUTPUT_FAILED'

export class FlowRenderError extends Error {
  readonly code: FlowRenderErrorCode

  constructor(code: FlowRenderErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'FlowRenderError'
    this.code = code
  }
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

