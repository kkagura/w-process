import type {
  BoxData,
  GroupLayoutData,
  GroupTitleStyleData,
  NodeBorderStyleData,
  NodeFillStyleData,
  Point,
  Rect,
  Size,
} from '../types/flow'
import { createId } from '../utils/ids'

export const DEFAULT_ARCHITECTURE_LAYER_SIZE: Size = {
  width: 760,
  height: 180,
}

export const DEFAULT_ARCHITECTURE_LAYER_FILL_STYLE: NodeFillStyleData = {
  color: '#eef8ff',
  opacity: 0.82,
}

export const DEFAULT_ARCHITECTURE_LAYER_BORDER_STYLE: NodeBorderStyleData = {
  color: '#bae6fd',
  width: 1.5,
  dash: 'solid',
}

export const DEFAULT_ARCHITECTURE_LAYER_TITLE_STYLE: GroupTitleStyleData = {
  backgroundColor: '#eef8ff',
  color: '#334155',
  fontSize: 14,
}

export const DEFAULT_ARCHITECTURE_LAYER_LAYOUT: GroupLayoutData = {
  padding: 20,
  headerHeight: 38,
}

export const MIN_ARCHITECTURE_LAYER_WIDTH = 240
export const MIN_ARCHITECTURE_LAYER_HEIGHT = 96
export const ARCHITECTURE_LAYER_CORNER_RADIUS = 12

export function createArchitectureLayerData(options: {
  label: string
  position: Point
  size?: Size
  props?: Record<string, unknown>
}): BoxData {
  const size = options.size ?? DEFAULT_ARCHITECTURE_LAYER_SIZE

  return {
    id: createId('layer'),
    type: 'layer',
    label: options.label,
    position: { ...options.position },
    size: {
      width: Math.max(MIN_ARCHITECTURE_LAYER_WIDTH, size.width),
      height: Math.max(MIN_ARCHITECTURE_LAYER_HEIGHT, size.height),
    },
    children: [],
    props: {
      fillStyle: structuredClone(DEFAULT_ARCHITECTURE_LAYER_FILL_STYLE),
      borderStyle: structuredClone(DEFAULT_ARCHITECTURE_LAYER_BORDER_STYLE),
      titleStyle: structuredClone(DEFAULT_ARCHITECTURE_LAYER_TITLE_STYLE),
      layout: structuredClone(DEFAULT_ARCHITECTURE_LAYER_LAYOUT),
      ...(options.props ?? {}),
    },
  }
}

export function resizeArchitectureLayerData(source: BoxData, rect: Rect): BoxData {
  return {
    ...structuredClone(source),
    position: {
      x: rect.x,
      y: rect.y,
    },
    size: {
      width: Math.max(MIN_ARCHITECTURE_LAYER_WIDTH, rect.width),
      height: Math.max(MIN_ARCHITECTURE_LAYER_HEIGHT, rect.height),
    },
  }
}

export function getArchitectureLayerContentRect(data: BoxData): Rect {
  const layout = getArchitectureLayerLayout(data)
  return {
    x: data.position.x + layout.padding,
    y: data.position.y + layout.headerHeight + layout.padding,
    width: Math.max(0, data.size.width - layout.padding * 2),
    height: Math.max(0, data.size.height - layout.headerHeight - layout.padding * 2),
  }
}

export function getArchitectureLayerHeaderRect(data: BoxData): Rect {
  const layout = getArchitectureLayerLayout(data)
  return {
    ...data.position,
    width: data.size.width,
    height: Math.min(data.size.height, layout.headerHeight),
  }
}

export function getArchitectureLayerFillStyle(data: BoxData): NodeFillStyleData {
  const value = getRecord(data.props?.fillStyle)
  return {
    color: getString(value.color, DEFAULT_ARCHITECTURE_LAYER_FILL_STYLE.color),
    opacity: clamp(getNumber(value.opacity, DEFAULT_ARCHITECTURE_LAYER_FILL_STYLE.opacity), 0, 1),
  }
}

export function getArchitectureLayerBorderStyle(data: BoxData): NodeBorderStyleData {
  const value = getRecord(data.props?.borderStyle)
  return {
    color: getString(value.color, DEFAULT_ARCHITECTURE_LAYER_BORDER_STYLE.color),
    width: Math.max(1, getNumber(value.width, DEFAULT_ARCHITECTURE_LAYER_BORDER_STYLE.width)),
    dash: value.dash === 'dashed' ? 'dashed' : 'solid',
  }
}

export function getArchitectureLayerTitleStyle(data: BoxData): GroupTitleStyleData {
  const value = getRecord(data.props?.titleStyle)
  return {
    backgroundColor: getString(value.backgroundColor, DEFAULT_ARCHITECTURE_LAYER_TITLE_STYLE.backgroundColor),
    color: getString(value.color, DEFAULT_ARCHITECTURE_LAYER_TITLE_STYLE.color),
    fontSize: Math.max(8, getNumber(value.fontSize, DEFAULT_ARCHITECTURE_LAYER_TITLE_STYLE.fontSize)),
  }
}

export function getArchitectureLayerLayout(data: BoxData): GroupLayoutData {
  const value = getRecord(data.props?.layout)
  return {
    padding: Math.max(0, getNumber(value.padding, DEFAULT_ARCHITECTURE_LAYER_LAYOUT.padding)),
    headerHeight: Math.max(24, getNumber(value.headerHeight, DEFAULT_ARCHITECTURE_LAYER_LAYOUT.headerHeight)),
  }
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
