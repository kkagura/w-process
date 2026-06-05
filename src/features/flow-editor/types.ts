import type { FlowDocument } from '../../core/flow/types/flow'

export interface FlowEditorApi {
  exportDocument(): FlowDocument | null
  importDocument(document: FlowDocument): void
  markSaved(): void
}

export interface SaveFeedback {
  id: number
  type: 'success' | 'error'
}
