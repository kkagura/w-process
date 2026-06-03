<script setup lang="ts">
import { shallowRef } from 'vue'
import FlowEditor from './features/flow-editor/components/FlowEditor.vue'
import type { FlowEditorApi } from './features/flow-editor/types'
import type { FlowDocument } from './core/flow/types/flow'

interface FlowSaveFile {
  version: 1
  document: FlowDocument
  savedAt: string
}

const STORAGE_KEY = 'w-process:flow-document'
const editorApi = shallowRef<FlowEditorApi | null>(null)

function handleEditorReady(api: FlowEditorApi) {
  editorApi.value = api

  const storedDocument = loadFlowDocumentFromStorage()
  if (storedDocument) {
    api.importDocument(storedDocument)
  }
}

function handleSaveRequested() {
  const api = editorApi.value
  if (!api) return

  const document = api.exportDocument()
  if (!document) return

  if (saveFlowDocumentToStorage(document)) {
    api.markSaved()
  }
}

function saveFlowDocumentToStorage(document: FlowDocument) {
  const saveFile: FlowSaveFile = {
    version: 1,
    document,
    savedAt: new Date().toISOString(),
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveFile))
    return true
  }
  catch {
    return false
  }
}

function loadFlowDocumentFromStorage(): FlowDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (!isFlowSaveFile(parsed)) return null

    return parsed.document
  }
  catch {
    return null
  }
}

function isFlowSaveFile(value: unknown): value is FlowSaveFile {
  if (!isRecord(value)) return false
  if (value.version !== 1) return false
  return isFlowDocument(value.document)
}

function isFlowDocument(value: unknown): value is FlowDocument {
  if (!isRecord(value)) return false
  if (!isRecord(value.root)) return false
  return Array.isArray(value.edges)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
</script>

<template>
  <FlowEditor
    @editor-ready="handleEditorReady"
    @save-requested="handleSaveRequested"
  />
</template>
