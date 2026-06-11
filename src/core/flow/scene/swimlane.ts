import type {
  BoxData,
  Point,
  Rect,
  SceneElementData,
  SwimlaneOrientation,
} from '../types/flow'
import { createId } from '../utils/ids'

export const SWIMLANE_HEADER_SIZE = 36
export const HORIZONTAL_LANE_LABEL_SIZE = 96
export const VERTICAL_LANE_LABEL_SIZE = 32
export const HORIZONTAL_LANE_SIZE = 140
export const VERTICAL_LANE_SIZE = 220
export const DEFAULT_SWIMLANE_CROSS_SIZE = 680
export const DEFAULT_SWIMLANE_VERTICAL_HEIGHT = 420

export function createSwimlaneData(options: {
  label: string
  orientation: SwimlaneOrientation
  laneCount: number
  position: Point
}): BoxData {
  const laneCount = Math.max(2, options.laneCount)
  const size = options.orientation === 'horizontal'
    ? {
        width: DEFAULT_SWIMLANE_CROSS_SIZE,
        height: SWIMLANE_HEADER_SIZE + laneCount * HORIZONTAL_LANE_SIZE,
      }
    : {
        width: laneCount * VERTICAL_LANE_SIZE,
        height: DEFAULT_SWIMLANE_VERTICAL_HEIGHT,
      }

  return layoutSwimlaneData({
    id: createId('box'),
    type: 'swimlane',
    label: options.label,
    position: options.position,
    size,
    props: {
      orientation: options.orientation,
      headerSize: SWIMLANE_HEADER_SIZE,
    },
    children: Array.from({ length: laneCount }, (_, index) => ({
      id: createId('lane'),
      type: 'lane' as const,
      label: `泳道 ${index + 1}`,
      position: { ...options.position },
      size: { width: 0, height: 0 },
      props: {
        orientation: options.orientation,
        labelSize: options.orientation === 'horizontal'
          ? HORIZONTAL_LANE_LABEL_SIZE
          : VERTICAL_LANE_LABEL_SIZE,
      },
      children: [],
    })),
  }, options.orientation)
}

export function getSwimlaneOrientation(data: BoxData): SwimlaneOrientation {
  return data.props?.orientation === 'vertical' ? 'vertical' : 'horizontal'
}

export function getLaneOrientation(data: BoxData): SwimlaneOrientation {
  return data.props?.orientation === 'vertical' ? 'vertical' : 'horizontal'
}

export function getLaneContentRect(data: BoxData): Rect {
  const orientation = getLaneOrientation(data)
  const labelSize = getFiniteNumber(
    data.props?.labelSize,
    orientation === 'horizontal'
      ? HORIZONTAL_LANE_LABEL_SIZE
      : VERTICAL_LANE_LABEL_SIZE,
  )

  if (orientation === 'horizontal') {
    return {
      x: data.position.x + labelSize,
      y: data.position.y,
      width: Math.max(0, data.size.width - labelSize),
      height: data.size.height,
    }
  }

  return {
    x: data.position.x,
    y: data.position.y + labelSize,
    width: data.size.width,
    height: Math.max(0, data.size.height - labelSize),
  }
}

export function layoutSwimlaneData(
  source: BoxData,
  orientation = getSwimlaneOrientation(source),
): BoxData {
  const data = structuredClone(source)
  const lanes = data.children.filter(isLaneData)
  if (lanes.length === 0) return data

  const orientationChanged = getSwimlaneOrientation(source) !== orientation
  data.props = {
    ...(data.props ?? {}),
    orientation,
    headerSize: SWIMLANE_HEADER_SIZE,
  }

  if (orientationChanged) {
    data.size = orientation === 'horizontal'
      ? {
          width: Math.max(DEFAULT_SWIMLANE_CROSS_SIZE, data.size.width),
          height: SWIMLANE_HEADER_SIZE + lanes.length * HORIZONTAL_LANE_SIZE,
        }
      : {
          width: lanes.length * VERTICAL_LANE_SIZE,
          height: Math.max(DEFAULT_SWIMLANE_VERTICAL_HEIGHT, data.size.height),
        }
  }
  else if (orientation === 'horizontal') {
    data.size.height = SWIMLANE_HEADER_SIZE + lanes.length * HORIZONTAL_LANE_SIZE
  }
  else {
    data.size.width = lanes.length * VERTICAL_LANE_SIZE
  }

  const contentRect = {
    x: data.position.x,
    y: data.position.y + SWIMLANE_HEADER_SIZE,
    width: data.size.width,
    height: Math.max(0, data.size.height - SWIMLANE_HEADER_SIZE),
  }

  lanes.forEach((lane, index) => {
    const beforeContent = getLaneContentRect(lane)
    const laneRect = orientation === 'horizontal'
      ? {
          x: contentRect.x,
          y: contentRect.y + contentRect.height * index / lanes.length,
          width: contentRect.width,
          height: contentRect.height / lanes.length,
        }
      : {
          x: contentRect.x + contentRect.width * index / lanes.length,
          y: contentRect.y,
          width: contentRect.width / lanes.length,
          height: contentRect.height,
        }

    lane.position = { x: laneRect.x, y: laneRect.y }
    lane.size = { width: laneRect.width, height: laneRect.height }
    lane.props = {
      ...(lane.props ?? {}),
      orientation,
      labelSize: orientation === 'horizontal'
        ? HORIZONTAL_LANE_LABEL_SIZE
        : VERTICAL_LANE_LABEL_SIZE,
    }
    const afterContent = getLaneContentRect(lane)
    lane.children = lane.children.map(child => mapElementToRect(child, beforeContent, afterContent))
  })

  data.children = data.children.map((child) => {
    if (!isLaneData(child)) return child
    return lanes.find(lane => lane.id === child.id) ?? child
  })
  return data
}

export function addLaneData(swimlane: BoxData): BoxData {
  const orientation = getSwimlaneOrientation(swimlane)
  const next = structuredClone(swimlane)
  const laneCount = next.children.filter(isLaneData).length
  next.children.push({
    id: createId('lane'),
    type: 'lane',
    label: `泳道 ${laneCount + 1}`,
    position: { ...next.position },
    size: { width: 0, height: 0 },
    props: {
      orientation,
      labelSize: orientation === 'horizontal'
        ? HORIZONTAL_LANE_LABEL_SIZE
        : VERTICAL_LANE_LABEL_SIZE,
    },
    children: [],
  })
  return layoutSwimlaneData(next, orientation)
}

export function removeLaneData(swimlane: BoxData, laneId: string): BoxData | null {
  const next = structuredClone(swimlane)
  const lanes = next.children.filter(isLaneData)
  if (lanes.length <= 2) return null

  const laneIndex = lanes.findIndex(lane => lane.id === laneId)
  if (laneIndex < 0) return null

  const removed = lanes[laneIndex]
  const target = lanes[laneIndex > 0 ? laneIndex - 1 : 1]
  target.children.push(...removed.children)
  next.children = next.children.filter(child => child.id !== laneId)
  return layoutSwimlaneData(next, getSwimlaneOrientation(next))
}

export function findParentSwimlaneData(root: BoxData, laneId: string): BoxData | null {
  if (
    root.type === 'swimlane'
    && root.children.some(child => isLaneData(child) && child.id === laneId)
  ) {
    return root
  }

  for (const child of root.children) {
    if (!isBoxData(child)) continue
    const matched = findParentSwimlaneData(child, laneId)
    if (matched) return matched
  }
  return null
}

function mapElementToRect(element: SceneElementData, before: Rect, after: Rect): SceneElementData {
  const next = structuredClone(element)
  const relativeX = before.width > 0 ? (next.position.x - before.x) / before.width : 0
  const relativeY = before.height > 0 ? (next.position.y - before.y) / before.height : 0
  next.position = {
    x: after.x + clamp(relativeX, 0, 1) * Math.max(0, after.width - next.size.width),
    y: after.y + clamp(relativeY, 0, 1) * Math.max(0, after.height - next.size.height),
  }

  if ('children' in next) {
    const delta = {
      x: next.position.x - element.position.x,
      y: next.position.y - element.position.y,
    }
    next.children = next.children.map(child => translateElement(child, delta))
  }
  return next
}

function translateElement(element: SceneElementData, delta: Point): SceneElementData {
  const next = structuredClone(element)
  next.position = {
    x: next.position.x + delta.x,
    y: next.position.y + delta.y,
  }
  if ('children' in next) {
    next.children = next.children.map(child => translateElement(child, delta))
  }
  return next
}

function isLaneData(value: SceneElementData): value is BoxData {
  return 'children' in value && value.type === 'lane'
}

function isBoxData(value: SceneElementData): value is BoxData {
  return 'children' in value
}

function getFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
