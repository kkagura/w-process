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
export const MIN_HORIZONTAL_LANE_SIZE = 72
export const MIN_VERTICAL_LANE_SIZE = 120
export const MIN_SWIMLANE_CONTENT_SIZE = 160
export const SWIMLANE_NODE_PADDING = 32

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
  })
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

export function layoutSwimlaneData(source: BoxData): BoxData {
  const lanes = source.children.filter(isLaneData)
  return relayoutSwimlaneData(
    source,
    getMinimumRect(source, {
      ...source.position,
      ...source.size,
    }),
    lanes.map(() => 1),
  )
}

export function resizeSwimlaneData(source: BoxData, rect: Rect): BoxData {
  const orientation = getSwimlaneOrientation(source)
  const lanes = source.children.filter(isLaneData)
  const weights = lanes.map(lane => (
    orientation === 'horizontal' ? lane.size.height : lane.size.width
  ))

  return relayoutSwimlaneData(source, getMinimumRect(source, rect), weights)
}

export function getSwimlaneMinimumSize(swimlane: BoxData) {
  const orientation = getSwimlaneOrientation(swimlane)
  const lanes = swimlane.children.filter(isLaneData)

  if (orientation === 'horizontal') {
    const contentWidth = Math.max(
      MIN_SWIMLANE_CONTENT_SIZE,
      ...lanes.flatMap(lane => lane.children.map(child => child.size.width + SWIMLANE_NODE_PADDING)),
    )
    return {
      width: HORIZONTAL_LANE_LABEL_SIZE + contentWidth,
      height: SWIMLANE_HEADER_SIZE + lanes.reduce(
        (total, lane) => total + getLaneMinimumAxisSize(lane, orientation),
        0,
      ),
    }
  }

  const contentHeight = Math.max(
    MIN_SWIMLANE_CONTENT_SIZE,
    ...lanes.flatMap(lane => lane.children.map(child => child.size.height + SWIMLANE_NODE_PADDING)),
  )
  return {
    width: lanes.reduce(
      (total, lane) => total + getLaneMinimumAxisSize(lane, orientation),
      0,
    ),
    height: SWIMLANE_HEADER_SIZE + VERTICAL_LANE_LABEL_SIZE + contentHeight,
  }
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
  const lanes = next.children.filter(isLaneData)
  const existingSizes = lanes.slice(0, -1).map(lane => (
    orientation === 'horizontal' ? lane.size.height : lane.size.width
  ))
  const newLaneWeight = existingSizes.length > 0
    ? existingSizes.reduce((total, size) => total + size, 0) / existingSizes.length
    : 1

  return relayoutSwimlaneData(
    next,
    getMinimumRect(next, {
      ...next.position,
      ...next.size,
    }),
    [...existingSizes, newLaneWeight],
  )
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
  if (getSwimlaneOrientation(next) === 'horizontal') {
    target.size.height += removed.size.height
  }
  else {
    target.size.width += removed.size.width
  }
  next.children = next.children.filter(child => child.id !== laneId)
  return resizeSwimlaneData(next, {
    ...next.position,
    ...next.size,
  })
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

function relayoutSwimlaneData(
  source: BoxData,
  rect: Rect,
  laneWeights: number[],
): BoxData {
  const data = structuredClone(source)
  const orientation = getSwimlaneOrientation(source)
  const sourceLanes = source.children.filter(isLaneData)
  const lanes = data.children.filter(isLaneData)
  if (lanes.length === 0) {
    data.position = { x: rect.x, y: rect.y }
    data.size = { width: rect.width, height: rect.height }
    return data
  }

  data.position = { x: rect.x, y: rect.y }
  data.size = { width: rect.width, height: rect.height }
  data.props = {
    ...(data.props ?? {}),
    orientation,
    headerSize: SWIMLANE_HEADER_SIZE,
  }

  const contentRect = {
    x: rect.x,
    y: rect.y + SWIMLANE_HEADER_SIZE,
    width: rect.width,
    height: Math.max(0, rect.height - SWIMLANE_HEADER_SIZE),
  }
  const totalAxisSize = orientation === 'horizontal'
    ? contentRect.height
    : contentRect.width
  const minimumSizes = lanes.map(lane => getLaneMinimumAxisSize(lane, orientation))
  const laneSizes = distributeLaneSizes(totalAxisSize, minimumSizes, laneWeights)
  let axisOffset = 0

  lanes.forEach((lane, index) => {
    const sourceLane = sourceLanes.find(item => item.id === lane.id) ?? lane
    const beforeContent = getLaneContentRect(sourceLane)
    const laneRect = orientation === 'horizontal'
      ? {
          x: contentRect.x,
          y: contentRect.y + axisOffset,
          width: contentRect.width,
          height: laneSizes[index],
        }
      : {
          x: contentRect.x + axisOffset,
          y: contentRect.y,
          width: laneSizes[index],
          height: contentRect.height,
        }
    axisOffset += laneSizes[index]

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

function getMinimumRect(swimlane: BoxData, rect: Rect): Rect {
  const minimum = getSwimlaneMinimumSize(swimlane)
  return {
    x: rect.x,
    y: rect.y,
    width: Math.max(minimum.width, rect.width),
    height: Math.max(minimum.height, rect.height),
  }
}

function getLaneMinimumAxisSize(lane: BoxData, orientation: SwimlaneOrientation) {
  if (orientation === 'horizontal') {
    return Math.max(
      MIN_HORIZONTAL_LANE_SIZE,
      ...lane.children.map(child => child.size.height + SWIMLANE_NODE_PADDING),
    )
  }

  return Math.max(
    MIN_VERTICAL_LANE_SIZE,
    ...lane.children.map(child => child.size.width + SWIMLANE_NODE_PADDING),
  )
}

function distributeLaneSizes(total: number, minimumSizes: number[], weights: number[]) {
  const normalizedWeights = weights.map(weight => (
    Number.isFinite(weight) && weight > 0 ? weight : 1
  ))
  const sizes = minimumSizes.map(() => 0)
  let remaining = total
  let activeIndexes = minimumSizes.map((_, index) => index)

  while (activeIndexes.length > 0) {
    const weightTotal = activeIndexes.reduce(
      (sum, index) => sum + normalizedWeights[index],
      0,
    )
    const constrainedIndexes = activeIndexes.filter(index => (
      remaining * normalizedWeights[index] / weightTotal < minimumSizes[index]
    ))

    if (constrainedIndexes.length === 0) {
      for (const index of activeIndexes) {
        sizes[index] = remaining * normalizedWeights[index] / weightTotal
      }
      break
    }

    for (const index of constrainedIndexes) {
      sizes[index] = minimumSizes[index]
      remaining -= minimumSizes[index]
    }
    const constrainedSet = new Set(constrainedIndexes)
    activeIndexes = activeIndexes.filter(index => !constrainedSet.has(index))
  }

  const distributedTotal = sizes.reduce((sum, size) => sum + size, 0)
  sizes[sizes.length - 1] += total - distributedTotal
  return sizes
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
