import type { FlowNode, Point, Rect, ViewportData } from '../types/flow'
import { containsPoint, getRectCenter, normalizeAngle, rotatePoint } from '../utils/geometry'

export interface RotateHandleRect {
  center: Point
  rect: Rect
  cursor: string
}

export interface NodeRotateModeData {
  nodeId: string
  center: Point
  before: FlowNode
  startAngle: number
  startRotation: number
}

export interface SelectionRotateModeData {
  center: Point
  before: FlowNode[]
  startAngle: number
  startBounds: Rect
  currentRotation: number
}

const ROTATE_HANDLE_SIZE = 10
const ROTATE_HANDLE_OFFSET = 30
const ROTATION_STEP_DEGREES = 5
const ROTATION_SNAP_DEGREES = 15

export function getRotateHandle(rect: Rect, rotation: number, viewport: ViewportData): RotateHandleRect {
  const size = ROTATE_HANDLE_SIZE / viewport.zoom
  const center = getRectCenter(rect)
  const handleCenter = rotatePoint(
    {
      x: rect.x + rect.width / 2,
      y: rect.y - ROTATE_HANDLE_OFFSET / viewport.zoom,
    },
    center,
    rotation,
  )

  return {
    center: handleCenter,
    cursor: 'grab',
    rect: {
      x: handleCenter.x - size / 2,
      y: handleCenter.y - size / 2,
      width: size,
      height: size,
    },
  }
}

export function getRotateHandleAnchor(rect: Rect, rotation: number) {
  return rotatePoint(
    {
      x: rect.x + rect.width / 2,
      y: rect.y,
    },
    getRectCenter(rect),
    rotation,
  )
}

export function getSelectionRotateHandle(rect: Rect, viewport: ViewportData): RotateHandleRect {
  const size = ROTATE_HANDLE_SIZE / viewport.zoom
  const handleCenter = getSelectionRotateHandleCenter(rect, 0, viewport)

  return {
    center: handleCenter,
    cursor: 'grab',
    rect: {
      x: handleCenter.x - size / 2,
      y: handleCenter.y - size / 2,
      width: size,
      height: size,
    },
  }
}

export function getSelectionRotateHandleAnchor(rect: Rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y,
  }
}

export function getRotatedSelectionRotateHandle(
  rect: Rect,
  rotation: number,
  viewport: ViewportData,
): RotateHandleRect {
  const size = ROTATE_HANDLE_SIZE / viewport.zoom
  const handleCenter = getSelectionRotateHandleCenter(rect, rotation, viewport)

  return {
    center: handleCenter,
    cursor: 'grab',
    rect: {
      x: handleCenter.x - size / 2,
      y: handleCenter.y - size / 2,
      width: size,
      height: size,
    },
  }
}

export function getRotatedSelectionRotateHandleAnchor(rect: Rect, rotation: number) {
  return rotatePoint(getSelectionRotateHandleAnchor(rect), getRectCenter(rect), rotation)
}

export function hitTestRotateHandle(
  point: Point,
  rect: Rect,
  rotation: number,
  viewport: ViewportData,
) {
  const handle = getRotateHandle(rect, rotation, viewport)
  return containsPoint(handle.rect, point) ? handle : null
}

export function hitTestSelectionRotateHandle(
  point: Point,
  rect: Rect,
  viewport: ViewportData,
) {
  const handle = getSelectionRotateHandle(rect, viewport)
  return containsPoint(handle.rect, point) ? handle : null
}

export function getPointAngle(center: Point, point: Point) {
  return Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI
}

export function getRotatedNodeData(options: {
  mode: NodeRotateModeData
  current: Point
  snap: boolean
}): FlowNode {
  const steppedDelta = getRotationDelta({
    center: options.mode.center,
    startAngle: options.mode.startAngle,
    current: options.current,
    snap: options.snap,
  })

  return {
    ...options.mode.before,
    rotation: normalizeAngle(options.mode.startRotation + steppedDelta),
  }
}

export function getRotatedSelectionNodeData(options: {
  mode: SelectionRotateModeData
  current: Point
  snap: boolean
}): FlowNode[] {
  const steppedDelta = getSelectionRotationDelta(options)

  return options.mode.before.map((node) => {
    const nodeCenter = {
      x: node.position.x + node.size.width / 2,
      y: node.position.y + node.size.height / 2,
    }
    const nextCenter = rotatePoint(nodeCenter, options.mode.center, steppedDelta)

    return {
      ...node,
      position: {
        x: nextCenter.x - node.size.width / 2,
        y: nextCenter.y - node.size.height / 2,
      },
      rotation: normalizeAngle(node.rotation + steppedDelta),
    }
  })
}

export function getSelectionRotationDelta(options: {
  mode: SelectionRotateModeData
  current: Point
  snap: boolean
}) {
  return getRotationDelta({
    center: options.mode.center,
    startAngle: options.mode.startAngle,
    current: options.current,
    snap: options.snap,
  })
}

export function hasNodeRotationChanges(before: FlowNode, after: FlowNode) {
  return normalizeAngle(before.rotation) !== normalizeAngle(after.rotation)
}

export function hasNodesRotationChanges(before: FlowNode[], after: FlowNode[]) {
  if (before.length !== after.length) return true

  return before.some((beforeNode) => {
    const afterNode = after.find(node => node.id === beforeNode.id)
    return !afterNode
      || beforeNode.position.x !== afterNode.position.x
      || beforeNode.position.y !== afterNode.position.y
      || normalizeAngle(beforeNode.rotation) !== normalizeAngle(afterNode.rotation)
  })
}

function getSelectionRotateHandleCenter(rect: Rect, rotation: number, viewport: ViewportData) {
  return rotatePoint(
    {
      x: rect.x + rect.width / 2,
      y: rect.y - ROTATE_HANDLE_OFFSET / viewport.zoom,
    },
    getRectCenter(rect),
    rotation,
  )
}

function getRotationDelta(options: {
  center: Point
  startAngle: number
  current: Point
  snap: boolean
}) {
  const delta = getPointAngle(options.center, options.current) - options.startAngle
  const step = options.snap ? ROTATION_SNAP_DEGREES : ROTATION_STEP_DEGREES
  return Math.round(delta / step) * step
}
