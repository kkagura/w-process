import type { FlowDocument } from '@w-process/flow-core'

export interface FlowEditorApi {
  exportDocument(): FlowDocument | null
  importDocument(document: FlowDocument): void
  markSaved(): void
}

export interface SaveFeedback {
  id: number
  type: 'success' | 'error'
}
