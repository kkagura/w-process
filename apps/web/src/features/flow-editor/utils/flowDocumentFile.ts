import type { FlowDocument } from '@w-process/flow-core'

interface VersionedFlowDocumentFile {
  version: 1
  document: FlowDocument
}

export function parseFlowDocumentJson(source: string): FlowDocument {
  const parsed: unknown = JSON.parse(source)
  const document = isVersionedFlowDocumentFile(parsed)
    ? parsed.document
    : parsed

  if (!isFlowDocument(document)) {
    throw new Error('JSON 中未找到有效的流程图数据')
  }

  return document
}

function isVersionedFlowDocumentFile(value: unknown): value is VersionedFlowDocumentFile {
  return isRecord(value)
    && value.version === 1
    && 'document' in value
}

function isFlowDocument(value: unknown): value is FlowDocument {
  return isRecord(value)
    && isRecord(value.root)
    && value.root.type === 'root'
    && Array.isArray(value.root.children)
    && Array.isArray(value.edges)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
