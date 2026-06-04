import type {
  NodeBorderDash,
  NodeBorderStyleData,
  NodeFillStyleData,
  NodeTextHorizontalAlign,
  NodeTextOverflow,
  NodeTextVerticalAlign,
} from '../types/flow'
import type { TextStyle } from '../renderer/TextRenderer'

export interface ResolvedNodeBorderStyle {
  color: string
  width: number
  dash: NodeBorderDash
}

export interface ResolvedNodeFillStyle {
  color: string
  opacity: number
}

export function getNodeTextStyle(
  props: Record<string, unknown>,
  fallback: Partial<TextStyle> = {},
): Partial<TextStyle> {
  const value = props.textStyle
  if (!isRecord(value)) return fallback

  const style: Partial<TextStyle> = { ...fallback }

  if (typeof value.fontSize === 'number') style.fontSize = value.fontSize
  if (typeof value.fontFamily === 'string') style.fontFamily = value.fontFamily
  if (typeof value.fontWeight === 'string') style.fontWeight = value.fontWeight
  if (typeof value.fontStyle === 'string') style.fontStyle = value.fontStyle
  if (typeof value.color === 'string') style.color = value.color
  if (isTextHorizontalAlign(value.align)) style.align = value.align
  if (isTextVerticalAlign(value.verticalAlign)) style.verticalAlign = value.verticalAlign
  if (typeof value.lineHeight === 'number') style.lineHeight = value.lineHeight
  if (typeof value.padding === 'number') style.padding = value.padding
  if (typeof value.maxLines === 'number') style.maxLines = value.maxLines
  if (isTextOverflow(value.overflow)) style.overflow = value.overflow

  return style
}

export function getNodeBorderStyle(
  props: Record<string, unknown>,
  fallback: NodeBorderStyleData,
): ResolvedNodeBorderStyle {
  const value = props.borderStyle
  if (!isRecord(value)) return fallback

  return {
    color: typeof value.color === 'string' ? value.color : fallback.color,
    width: typeof value.width === 'number' && Number.isFinite(value.width) && value.width > 0
      ? value.width
      : fallback.width,
    dash: isBorderDash(value.dash) ? value.dash : fallback.dash,
  }
}

export function getNodeFillStyle(
  props: Record<string, unknown>,
  fallback: NodeFillStyleData,
): ResolvedNodeFillStyle {
  const value = props.fillStyle
  if (!isRecord(value)) {
    return {
      color: toCanvasFillColor(fallback.color, fallback.opacity),
      opacity: fallback.opacity,
    }
  }

  const color = typeof value.color === 'string' && value.color ? value.color : fallback.color
  const opacity = normalizeOpacity(value.opacity, fallback.opacity)

  return {
    color: toCanvasFillColor(color, opacity),
    opacity,
  }
}

function normalizeOpacity(value: unknown, fallback: number) {
  const opacity = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(opacity)) return fallback
  return Math.min(1, Math.max(0, opacity))
}

function toCanvasFillColor(color: string, opacity: number) {
  const normalizedOpacity = normalizeOpacity(opacity, 1)
  if (normalizedOpacity >= 1) return color

  const hex = color.trim()
  if (/^#[\da-f]{3}$/i.test(hex)) {
    const [, r, g, b] = hex
    return `rgba(${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(b + b, 16)}, ${normalizedOpacity})`
  }

  if (/^#[\da-f]{6}$/i.test(hex)) {
    return `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${normalizedOpacity})`
  }

  return color
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTextHorizontalAlign(value: unknown): value is NodeTextHorizontalAlign {
  return value === 'left' || value === 'center' || value === 'right'
}

function isTextVerticalAlign(value: unknown): value is NodeTextVerticalAlign {
  return value === 'top' || value === 'middle' || value === 'bottom'
}

function isTextOverflow(value: unknown): value is NodeTextOverflow {
  return value === 'clip' || value === 'ellipsis'
}

function isBorderDash(value: unknown): value is NodeBorderDash {
  return value === 'solid' || value === 'dashed'
}
