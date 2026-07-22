// @env browser

import type {
  EditorFeedbackEvent,
  HistoryManager,
  SceneManager,
} from '@w-process/flow-core'

export interface InteractionControllerOptions {
  canvas: HTMLCanvasElement
  scene: SceneManager
  history: HistoryManager
  requestRender: (options?: { background?: boolean; main?: boolean }) => void
  emitFeedback?: (event: EditorFeedbackEvent) => void
  groupSelection?: () => void
  ungroupSelection?: () => void
}
