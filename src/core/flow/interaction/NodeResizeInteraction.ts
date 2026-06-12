import type { FlowNode, Point, Rect, Size, ViewportData } from '../types/flow'
import type { SnapAnchorKind } from './SnapEngine'

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export interface ResizeHandleRect {
  handle: ResizeHandle
  rect: Rect
  cursor: string
}

export interface ResizeHandleOptions {
  offset?: number
}

export interface NodeResizeModeData {
  nodeId: string
  handle: ResizeHandle
  start: Point
  before: FlowNode
  startRect: Rect
}

export interface SelectionResizeModeData {
  handle: ResizeHandle
  start: Point
  before: FlowNode[]
  startBounds: Rect
}

const MIN_NODE_SIZE: Size = {
  width: 40,
  height: 32,
}

const HANDLE_SIZE = 8
const HANDLE_OFFSET = 10

const handleCursors: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
}

export function getResizeHandles(
  rect: Rect,
  viewport: ViewportData,
  options: ResizeHandleOptions = {},
): ResizeHandleRect[] {
  const size = HANDLE_SIZE / viewport.zoom
  const half = size / 2
  const offset = (options.offset ?? HANDLE_OFFSET) / viewport.zoom
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2
  const left = rect.x - offset
  const right = rect.x + rect.width + offset
  const top = rect.y - offset
  const bottom = rect.y + rect.height + offset

  const points: Array<{ handle: ResizeHandle; point: Point }> = [
    { handle: 'nw', point: { x: left, y: top } },
    { handle: 'n', point: { x: centerX, y: top } },
    { handle: 'ne', point: { x: right, y: top } },
    { handle: 'e', point: { x: right, y: centerY } },
    { handle: 'se', point: { x: right, y: bottom } },
    { handle: 's', point: { x: centerX, y: bottom } },
    { handle: 'sw', point: { x: left, y: bottom } },
    { handle: 'w', point: { x: left, y: centerY } },
  ]

  return points.map(({ handle, point }) => ({
    handle,
    cursor: handleCursors[handle],
    rect: {
      x: point.x - half,
      y: point.y - half,
      width: size,
      height: size,
    },
  }))
}

export function hitTestResizeHandle(
  point: Point,
  rect: Rect,
  viewport: ViewportData,
  options: ResizeHandleOptions = {},
): ResizeHandleRect | null {
  return getResizeHandles(rect, viewport, options)
    .find(handle => point.x >= handle.rect.x
      && point.x <= handle.rect.x + handle.rect.width
      && point.y >= handle.rect.y
      && point.y <= handle.rect.y + handle.rect.height) ?? null
}

export function getResizedNodeData(options: {
  mode: NodeResizeModeData
  current: Point
  keepAspectRatio: boolean
  snap?: ResizeSnap
  minSize?: Size
}): FlowNode {
  const minSize = options.minSize ?? MIN_NODE_SIZE
  const resizedRect = getResizedRect({
    startRect: options.mode.startRect,
    delta: {
      x: options.current.x - options.mode.start.x,
      y: options.current.y - options.mode.start.y,
    },
    handle: options.mode.handle,
    minSize,
    keepAspectRatio: options.keepAspectRatio,
  })
  const nextRect = options.snap && !options.keepAspectRatio
    ? applyResizeSnapDelta({
        rect: resizedRect,
        handle: options.mode.handle,
        snap: options.snap,
        minSize,
      })
    : resizedRect

  return resizeNodeData(options.mode.before, nextRect)
}

export function getResizedSelectionNodeData(options: {
  mode: SelectionResizeModeData
  current: Point
  keepAspectRatio: boolean
  snap?: ResizeSnap
}): FlowNode[] {
  const minSize = getSelectionMinSize(options.mode.before, options.mode.startBounds)
  const resizedBounds = getRawResizedSelectionBounds({
    mode: options.mode,
    current: options.current,
    keepAspectRatio: options.keepAspectRatio,
    minSize,
  })
  const nextBounds = options.snap && !options.keepAspectRatio
    ? applyResizeSnapDelta({
        rect: resizedBounds,
        handle: options.mode.handle,
        snap: options.snap,
        minSize,
      })
    : resizedBounds

  return options.mode.before.map(node => resizeSelectionNodeData(
    node,
    options.mode.startBounds,
    nextBounds,
  ))
}

export function getRawResizedRect(options: {
  mode: NodeResizeModeData
  current: Point
  keepAspectRatio: boolean
  minSize?: Size
}) {
  const minSize = options.minSize ?? MIN_NODE_SIZE

  return getResizedRect({
    startRect: options.mode.startRect,
    delta: {
      x: options.current.x - options.mode.start.x,
      y: options.current.y - options.mode.start.y,
    },
    handle: options.mode.handle,
    minSize,
    keepAspectRatio: options.keepAspectRatio,
  })
}

export function getRawResizedSelectionBounds(options: {
  mode: SelectionResizeModeData
  current: Point
  keepAspectRatio: boolean
  minSize?: Size
}) {
  return getResizedRect({
    startRect: options.mode.startBounds,
    delta: {
      x: options.current.x - options.mode.start.x,
      y: options.current.y - options.mode.start.y,
    },
    handle: options.mode.handle,
    minSize: options.minSize ?? getSelectionMinSize(options.mode.before, options.mode.startBounds),
    keepAspectRatio: options.keepAspectRatio,
  })
}

export function hasNodeResizeChanges(before: FlowNode, after: FlowNode) {
  return before.position.x !== after.position.x
    || before.position.y !== after.position.y
    || before.size.width !== after.size.width
    || before.size.height !== after.size.height
}

export function hasNodesResizeChanges(before: FlowNode[], after: FlowNode[]) {
  if (before.length !== after.length) return true

  return before.some((beforeNode) => {
    const afterNode = after.find(node => node.id === beforeNode.id)
    return !afterNode || hasNodeResizeChanges(beforeNode, afterNode)
  })
}

export function getResizedRect(options: {
  startRect: Rect
  delta: Point
  handle: ResizeHandle
  minSize: Size
  keepAspectRatio: boolean
}): Rect {
  const baseRect = getFreeResizedRect(options)
  if (!options.keepAspectRatio) return baseRect

  return getAspectResizedRect({
    ...options,
    baseRect,
  })
}

function applyResizeSnapDelta(options: {
  rect: Rect
  handle: ResizeHandle
  snap: ResizeSnap
  minSize: Size
}): Rect {
  const { rect, handle, snap, minSize } = options
  const next = { ...rect }
  const delta = snap.delta
  const deltaX = snap.xKind === 'center' ? delta.x * 2 : delta.x
  const deltaY = snap.yKind === 'center' ? delta.y * 2 : delta.y

  if (handle.includes('e')) {
    next.width = Math.max(minSize.width, next.width + deltaX)
  }
  else if (handle.includes('w')) {
    const width = next.width - deltaX
    if (width >= minSize.width) {
      next.x += deltaX
      next.width = width
    }
  }

  if (handle.includes('s')) {
    next.height = Math.max(minSize.height, next.height + deltaY)
  }
  else if (handle.includes('n')) {
    const height = next.height - deltaY
    if (height >= minSize.height) {
      next.y += deltaY
      next.height = height
    }
  }

  return next
}

interface ResizeSnap {
  delta: Point
  xKind?: SnapAnchorKind
  yKind?: SnapAnchorKind
}

function getFreeResizedRect(options: {
  startRect: Rect
  delta: Point
  handle: ResizeHandle
  minSize: Size
}): Rect {
  const { startRect, delta, handle, minSize } = options
  const right = startRect.x + startRect.width
  const bottom = startRect.y + startRect.height
  let x = startRect.x
  let y = startRect.y
  let width = startRect.width
  let height = startRect.height

  if (handle.includes('e')) {
    width = Math.max(minSize.width, startRect.width + delta.x)
  }
  if (handle.includes('s')) {
    height = Math.max(minSize.height, startRect.height + delta.y)
  }
  if (handle.includes('w')) {
    x = Math.min(startRect.x + delta.x, right - minSize.width)
    width = right - x
  }
  if (handle.includes('n')) {
    y = Math.min(startRect.y + delta.y, bottom - minSize.height)
    height = bottom - y
  }

  return { x, y, width, height }
}

function getAspectResizedRect(options: {
  startRect: Rect
  baseRect: Rect
  handle: ResizeHandle
  minSize: Size
}): Rect {
  const { startRect, baseRect, handle, minSize } = options
  const aspectRatio = startRect.width / startRect.height
  const centerX = startRect.x + startRect.width / 2
  const centerY = startRect.y + startRect.height / 2
  const right = startRect.x + startRect.width
  const bottom = startRect.y + startRect.height
  const horizontal = handle.includes('e') || handle.includes('w')
  const vertical = handle.includes('n') || handle.includes('s')

  let width = baseRect.width
  let height = baseRect.height

  if (horizontal && vertical) {
    const widthDelta = Math.abs(baseRect.width - startRect.width)
    const heightDelta = Math.abs(baseRect.height - startRect.height)
    if (widthDelta >= heightDelta) {
      height = width / aspectRatio
    }
    else {
      width = height * aspectRatio
    }
  }
  else if (horizontal) {
    height = width / aspectRatio
  }
  else if (vertical) {
    width = height * aspectRatio
  }

  if (width < minSize.width) {
    width = minSize.width
    height = width / aspectRatio
  }
  if (height < minSize.height) {
    height = minSize.height
    width = height * aspectRatio
  }

  let x = baseRect.x
  let y = baseRect.y

  if (horizontal && vertical) {
    x = handle.includes('w') ? right - width : startRect.x
    y = handle.includes('n') ? bottom - height : startRect.y
  }
  else if (horizontal) {
    x = handle.includes('w') ? right - width : startRect.x
    y = centerY - height / 2
  }
  else if (vertical) {
    x = centerX - width / 2
    y = handle.includes('n') ? bottom - height : startRect.y
  }

  return { x, y, width, height }
}

export function resizeNodeData(node: FlowNode, rect: Rect): FlowNode {
  const scaleX = node.size.width === 0 ? 1 : rect.width / node.size.width
  const scaleY = node.size.height === 0 ? 1 : rect.height / node.size.height

  return {
    ...node,
    position: {
      x: rect.x,
      y: rect.y,
    },
    size: {
      width: rect.width,
      height: rect.height,
    },
    ports: node.ports.map(port => ({
      ...port,
      offset: {
        x: port.offset.x * scaleX,
        y: port.offset.y * scaleY,
      },
    })),
  }
}

function resizeSelectionNodeData(node: FlowNode, startBounds: Rect, nextBounds: Rect): FlowNode {
  const scaleX = startBounds.width === 0 ? 1 : nextBounds.width / startBounds.width
  const scaleY = startBounds.height === 0 ? 1 : nextBounds.height / startBounds.height
  const center = {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2,
  }
  const nextSize = {
    width: Math.max(MIN_NODE_SIZE.width, node.size.width * scaleX),
    height: Math.max(MIN_NODE_SIZE.height, node.size.height * scaleY),
  }
  const nextCenter = {
    x: nextBounds.x + (center.x - startBounds.x) * scaleX,
    y: nextBounds.y + (center.y - startBounds.y) * scaleY,
  }

  return resizeNodeData(node, {
    x: nextCenter.x - nextSize.width / 2,
    y: nextCenter.y - nextSize.height / 2,
    ...nextSize,
  })
}

function getSelectionMinSize(nodes: FlowNode[], startBounds: Rect): Size {
  const minScaleX = Math.max(
    MIN_NODE_SIZE.width / Math.max(1, startBounds.width),
    ...nodes.map(node => MIN_NODE_SIZE.width / Math.max(1, node.size.width)),
  )
  const minScaleY = Math.max(
    MIN_NODE_SIZE.height / Math.max(1, startBounds.height),
    ...nodes.map(node => MIN_NODE_SIZE.height / Math.max(1, node.size.height)),
  )

  return {
    width: Math.max(MIN_NODE_SIZE.width, startBounds.width * minScaleX),
    height: Math.max(MIN_NODE_SIZE.height, startBounds.height * minScaleY),
  }
}
