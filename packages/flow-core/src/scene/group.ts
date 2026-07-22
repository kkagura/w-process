import type {
  BoxData,
  FlowNode,
  GroupLayoutData,
  GroupTitleStyleData,
  NodeBorderStyleData,
  NodeFillStyleData,
  Point,
  Rect,
} from '../types/flow'
import { getRotatedRectBounds, getUnionBounds } from '../utils/geometry'
import { createId } from '../utils/ids'

export const DEFAULT_GROUP_FILL_STYLE: NodeFillStyleData = {
  color: '#ffffff',
  opacity: 0.35,
}

export const DEFAULT_GROUP_BORDER_STYLE: NodeBorderStyleData = {
  color: '#94a3b8',
  width: 1,
  dash: 'dashed',
}

export const DEFAULT_GROUP_TITLE_STYLE: GroupTitleStyleData = {
  backgroundColor: '#f1f5f9',
  color: '#334155',
  fontSize: 12,
}

export const DEFAULT_GROUP_LAYOUT: GroupLayoutData = {
  padding: 16,
  headerHeight: 28,
}

export const MIN_GROUP_WIDTH = 120
export const MIN_GROUP_HEIGHT = 72

export function createGroupData(nodes: FlowNode[], label = '新建分组'): BoxData {
  const bounds = getUnionBounds(nodes.map(node => getRotatedRectBounds({
    ...node.position,
    ...node.size,
  }, node.rotation)))
  const { padding, headerHeight } = DEFAULT_GROUP_LAYOUT

  return {
    id: createId('group'),
    type: 'group',
    label,
    position: {
      x: bounds.x - padding,
      y: bounds.y - headerHeight - padding,
    },
    size: {
      width: Math.max(MIN_GROUP_WIDTH, bounds.width + padding * 2),
      height: Math.max(MIN_GROUP_HEIGHT, bounds.height + headerHeight + padding * 2),
    },
    children: [],
    props: {
      fillStyle: structuredClone(DEFAULT_GROUP_FILL_STYLE),
      borderStyle: structuredClone(DEFAULT_GROUP_BORDER_STYLE),
      titleStyle: structuredClone(DEFAULT_GROUP_TITLE_STYLE),
      layout: structuredClone(DEFAULT_GROUP_LAYOUT),
    },
  }
}

export function getGroupContentRect(data: BoxData): Rect {
  const layout = getGroupLayout(data)
  return {
    x: data.position.x + layout.padding,
    y: data.position.y + layout.headerHeight + layout.padding,
    width: Math.max(0, data.size.width - layout.padding * 2),
    height: Math.max(0, data.size.height - layout.headerHeight - layout.padding * 2),
  }
}

export function getGroupHeaderRect(data: BoxData): Rect {
  const layout = getGroupLayout(data)
  return {
    ...data.position,
    width: data.size.width,
    height: Math.min(data.size.height, layout.headerHeight),
  }
}

export function getGroupFillStyle(data: BoxData): NodeFillStyleData {
  const value = getRecord(data.props?.fillStyle)
  return {
    color: getString(value.color, DEFAULT_GROUP_FILL_STYLE.color),
    opacity: clamp(getNumber(value.opacity, DEFAULT_GROUP_FILL_STYLE.opacity), 0, 1),
  }
}

export function getGroupBorderStyle(data: BoxData): NodeBorderStyleData {
  const value = getRecord(data.props?.borderStyle)
  return {
    color: getString(value.color, DEFAULT_GROUP_BORDER_STYLE.color),
    width: Math.max(1, getNumber(value.width, DEFAULT_GROUP_BORDER_STYLE.width)),
    dash: value.dash === 'solid' ? 'solid' : 'dashed',
  }
}

export function getGroupTitleStyle(data: BoxData): GroupTitleStyleData {
  const value = getRecord(data.props?.titleStyle)
  return {
    backgroundColor: getString(value.backgroundColor, DEFAULT_GROUP_TITLE_STYLE.backgroundColor),
    color: getString(value.color, DEFAULT_GROUP_TITLE_STYLE.color),
    fontSize: Math.max(8, getNumber(value.fontSize, DEFAULT_GROUP_TITLE_STYLE.fontSize)),
  }
}

export function getGroupLayout(data: BoxData): GroupLayoutData {
  const value = getRecord(data.props?.layout)
  return {
    padding: Math.max(0, getNumber(value.padding, DEFAULT_GROUP_LAYOUT.padding)),
    headerHeight: Math.max(20, getNumber(value.headerHeight, DEFAULT_GROUP_LAYOUT.headerHeight)),
  }
}

export function translateBoxData(data: BoxData, delta: Point): BoxData {
  const next = structuredClone(data)
  next.position = {
    x: next.position.x + delta.x,
    y: next.position.y + delta.y,
  }
  next.children = next.children.map((child) => {
    if ('children' in child) return translateBoxData(child, delta)

    const moved = structuredClone(child)
    moved.position = {
      x: moved.position.x + delta.x,
      y: moved.position.y + delta.y,
    }
    return moved
  })
  return next
}

function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function getString(value: unknown, fallback: string) {
  return typeof value === 'string' && value ? value : fallback
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
