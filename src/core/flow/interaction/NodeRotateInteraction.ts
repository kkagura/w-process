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

const ROTATE_HANDLE_SIZE = 10
const ROTATE_HANDLE_OFFSET = 30
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

export function hitTestRotateHandle(
  point: Point,
  rect: Rect,
  rotation: number,
  viewport: ViewportData,
) {
  const handle = getRotateHandle(rect, rotation, viewport)
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
  const delta = getPointAngle(options.mode.center, options.current) - options.mode.startAngle
  const rotation = normalizeAngle(options.mode.startRotation + delta)
  const nextRotation = options.snap
    ? Math.round(rotation / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES
    : rotation

  return {
    ...options.mode.before,
    rotation: normalizeAngle(nextRotation),
  }
}

export function hasNodeRotationChanges(before: FlowNode, after: FlowNode) {
  return normalizeAngle(before.rotation) !== normalizeAngle(after.rotation)
}
