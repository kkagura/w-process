import type { FlowDocument } from '@w-process/flow-core'
import { MAX_SCENE_DEPTH, MAX_SCENE_EDGES, MAX_SCENE_ELEMENTS } from './constants'
import { FlowRenderError } from './errors'

interface ValidationState {
  elementCount: number
}

export function validateFlowDocument(value: unknown): asserts value is FlowDocument {
  if (!isRecord(value)) invalid('场景 JSON 顶层必须是对象')
  if (!isRecord(value.root)) invalid('场景 JSON 缺少 root 容器')
  if (!Array.isArray(value.edges)) invalid('场景 JSON 的 edges 必须是数组')
  if (value.edges.length > MAX_SCENE_EDGES) {
    invalid(`连线数量不能超过 ${MAX_SCENE_EDGES}`)
  }

  const state: ValidationState = { elementCount: 0 }
  validateBox(value.root, 'root', 0, state)
  value.edges.forEach((edge, index) => validateEdge(edge, `edges[${index}]`))

  if (value.viewport !== undefined) {
    if (!isRecord(value.viewport)) invalid('viewport 必须是对象')
    if (!isFiniteNumber(value.viewport.x) || !isFiniteNumber(value.viewport.y)) {
      invalid('viewport 必须包含有限数字 x 和 y')
    }
    if (!isFiniteNumber(value.viewport.zoom) || value.viewport.zoom <= 0) {
      invalid('viewport.zoom 必须是大于 0 的有限数字')
    }
  }
}

function validateBox(value: unknown, path: string, depth: number, state: ValidationState): void {
  if (depth > MAX_SCENE_DEPTH) invalid(`容器嵌套深度不能超过 ${MAX_SCENE_DEPTH}`)
  if (!isRecord(value)) invalid(`${path} 必须是对象`)
  validateIdAndType(value, path)
  validatePoint(value.position, `${path}.position`)
  validateSize(value.size, `${path}.size`)
  if (!Array.isArray(value.children)) invalid(`${path}.children 必须是数组`)
  if (value.props !== undefined && !isRecord(value.props)) invalid(`${path}.props 必须是对象`)

  for (const [index, child] of value.children.entries()) {
    state.elementCount += 1
    if (state.elementCount > MAX_SCENE_ELEMENTS) {
      invalid(`场景元素数量不能超过 ${MAX_SCENE_ELEMENTS}`)
    }

    const childPath = `${path}.children[${index}]`
    if (isRecord(child) && Array.isArray(child.children)) {
      validateBox(child, childPath, depth + 1, state)
    }
    else {
      validateNode(child, childPath)
    }
  }
}

function validateNode(value: unknown, path: string): void {
  if (!isRecord(value)) invalid(`${path} 必须是对象`)
  validateIdAndType(value, path)
  if (typeof value.label !== 'string') invalid(`${path}.label 必须是字符串`)
  validatePoint(value.position, `${path}.position`)
  validateSize(value.size, `${path}.size`)
  if (!isFiniteNumber(value.rotation)) invalid(`${path}.rotation 必须是有限数字`)
  if (!Array.isArray(value.ports)) invalid(`${path}.ports 必须是数组`)
  if (!isRecord(value.props)) invalid(`${path}.props 必须是对象`)

  value.ports.forEach((port, index) => validatePort(port, `${path}.ports[${index}]`))
}

function validatePort(value: unknown, path: string): void {
  if (!isRecord(value)) invalid(`${path} 必须是对象`)
  for (const key of ['id', 'nodeId', 'templateId', 'label'] as const) {
    if (typeof value[key] !== 'string' || value[key].length === 0) {
      invalid(`${path}.${key} 必须是非空字符串`)
    }
  }
  validatePoint(value.offset, `${path}.offset`)
}

function validateEdge(value: unknown, path: string): void {
  if (!isRecord(value)) invalid(`${path} 必须是对象`)
  validateIdAndType(value, path, false)
  validateEndpoint(value.source, `${path}.source`)
  validateEndpoint(value.target, `${path}.target`)
  if (value.label !== undefined && typeof value.label !== 'string') invalid(`${path}.label 必须是字符串`)
  if (value.props !== undefined && !isRecord(value.props)) invalid(`${path}.props 必须是对象`)
}

function validateEndpoint(value: unknown, path: string): void {
  if (!isRecord(value)) invalid(`${path} 必须是对象`)
  if (typeof value.nodeId !== 'string' || !value.nodeId) invalid(`${path}.nodeId 必须是非空字符串`)
  if (typeof value.portId !== 'string' || !value.portId) invalid(`${path}.portId 必须是非空字符串`)
}

function validateIdAndType(value: Record<string, unknown>, path: string, requireType = true): void {
  if (typeof value.id !== 'string' || !value.id) invalid(`${path}.id 必须是非空字符串`)
  if (requireType && (typeof value.type !== 'string' || !value.type)) {
    invalid(`${path}.type 必须是非空字符串`)
  }
}

function validatePoint(value: unknown, path: string): asserts value is { x: number, y: number } {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    invalid(`${path} 必须包含有限数字 x 和 y`)
  }
}

function validateSize(value: unknown, path: string): void {
  if (!isRecord(value) || !isFiniteNumber(value.width) || !isFiniteNumber(value.height)) {
    invalid(`${path} 必须包含有限数字 width 和 height`)
  }
  if (value.width < 0 || value.height < 0) invalid(`${path} 的宽高不能小于 0`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function invalid(message: string): never {
  throw new FlowRenderError('INVALID_DOCUMENT', message)
}
