import type { Point, Rect } from '../types/flow'

export type TextHorizontalAlign = 'left' | 'center' | 'right'
export type TextVerticalAlign = 'top' | 'middle' | 'bottom'
export type TextOverflow = 'clip' | 'ellipsis'

export interface TextStyle {
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontStyle: string
  color: string
  align: TextHorizontalAlign
  verticalAlign: TextVerticalAlign
  lineHeight: number
  padding: number
  maxLines: number
  overflow: TextOverflow
}

export interface TextLineLayout {
  text: string
  position: Point
}

export interface TextBlockLayout {
  lines: TextLineLayout[]
  style: TextStyle
}

export interface DrawTextBlockOptions {
  text: string
  rect: Rect
  style?: Partial<TextStyle>
}

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 14,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontWeight: '600',
  fontStyle: 'normal',
  color: '#111827',
  align: 'center',
  verticalAlign: 'middle',
  lineHeight: 18,
  padding: 14,
  maxLines: 2,
  overflow: 'ellipsis',
}

const ELLIPSIS = '...'

export function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  options: DrawTextBlockOptions,
) {
  const layout = layoutTextBlock(ctx, options)
  if (layout.lines.length === 0) return

  ctx.save()
  applyTextStyle(ctx, layout.style)

  for (const line of layout.lines) {
    ctx.fillText(line.text, line.position.x, line.position.y)
  }

  ctx.restore()
}

export function layoutTextBlock(
  ctx: CanvasRenderingContext2D,
  options: DrawTextBlockOptions,
): TextBlockLayout {
  const style = normalizeTextStyle(options.style)
  const contentRect = getContentRect(options.rect, style.padding)
  const lines = createWrappedLines(ctx, options.text, contentRect.width, style)
  const visibleLines = getVisibleLines(ctx, lines, contentRect, style)
  const startY = getStartY(contentRect, visibleLines.length, style)

  return {
    style,
    lines: visibleLines.map((line, index) => ({
      text: line,
      position: {
        x: getLineX(contentRect, style),
        y: startY + index * style.lineHeight,
      },
    })),
  }
}

export function normalizeTextStyle(style: Partial<TextStyle> = {}): TextStyle {
  const fontSize = getPositiveNumber(style.fontSize, DEFAULT_TEXT_STYLE.fontSize)
  const lineHeight = getPositiveNumber(style.lineHeight, Math.round(fontSize * 1.3))
  const maxLines = Math.max(1, Math.floor(getPositiveNumber(style.maxLines, DEFAULT_TEXT_STYLE.maxLines)))

  return {
    fontSize,
    fontFamily: style.fontFamily ?? DEFAULT_TEXT_STYLE.fontFamily,
    fontWeight: style.fontWeight ?? DEFAULT_TEXT_STYLE.fontWeight,
    fontStyle: style.fontStyle ?? DEFAULT_TEXT_STYLE.fontStyle,
    color: style.color ?? DEFAULT_TEXT_STYLE.color,
    align: style.align ?? DEFAULT_TEXT_STYLE.align,
    verticalAlign: style.verticalAlign ?? DEFAULT_TEXT_STYLE.verticalAlign,
    lineHeight,
    padding: Math.max(0, getPositiveNumber(style.padding, DEFAULT_TEXT_STYLE.padding)),
    maxLines,
    overflow: style.overflow ?? DEFAULT_TEXT_STYLE.overflow,
  }
}

export function buildCanvasFont(style: TextStyle) {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
}

function applyTextStyle(ctx: CanvasRenderingContext2D, style: TextStyle) {
  ctx.fillStyle = style.color
  ctx.font = buildCanvasFont(style)
  ctx.textAlign = style.align
  ctx.textBaseline = 'middle'
}

function getContentRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x + padding,
    y: rect.y + padding,
    width: Math.max(0, rect.width - padding * 2),
    height: Math.max(0, rect.height - padding * 2),
  }
}

function createWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  style: TextStyle,
) {
  ctx.save()
  ctx.font = buildCanvasFont(style)

  const lines = text
    .split('\n')
    .flatMap(paragraph => wrapParagraph(ctx, paragraph, maxWidth))

  ctx.restore()
  return lines
}

function wrapParagraph(ctx: CanvasRenderingContext2D, paragraph: string, maxWidth: number) {
  if (paragraph.length === 0) return ['']
  if (maxWidth <= 0) return []

  const lines: string[] = []
  let current = ''

  for (const character of Array.from(paragraph)) {
    const next = current + character
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current)
      current = character.trimStart()
    }
    else {
      current = next
    }
  }

  if (current) lines.push(current)
  return lines
}

function getVisibleLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  rect: Rect,
  style: TextStyle,
) {
  const heightLimitedLines = Math.max(1, Math.floor(rect.height / style.lineHeight))
  const maxLines = Math.min(style.maxLines, heightLimitedLines)
  const visibleLines = lines.slice(0, maxLines)

  if (
    style.overflow === 'ellipsis'
    && lines.length > maxLines
    && visibleLines.length > 0
  ) {
    const lastIndex = visibleLines.length - 1
    visibleLines[lastIndex] = ellipsizeLine(ctx, visibleLines[lastIndex], rect.width)
  }

  return visibleLines
}

function ellipsizeLine(ctx: CanvasRenderingContext2D, line: string, maxWidth: number) {
  if (maxWidth <= 0) return ''
  if (ctx.measureText(line).width <= maxWidth) return line
  if (ctx.measureText(ELLIPSIS).width > maxWidth) return ''

  let result = line
  while (result.length > 0 && ctx.measureText(`${result}${ELLIPSIS}`).width > maxWidth) {
    result = result.slice(0, -1)
  }

  return `${result}${ELLIPSIS}`
}

function getLineX(rect: Rect, style: TextStyle) {
  if (style.align === 'left') return rect.x
  if (style.align === 'right') return rect.x + rect.width
  return rect.x + rect.width / 2
}

function getStartY(rect: Rect, lineCount: number, style: TextStyle) {
  const textHeight = lineCount * style.lineHeight

  if (style.verticalAlign === 'top') {
    return rect.y + style.lineHeight / 2
  }

  if (style.verticalAlign === 'bottom') {
    return rect.y + rect.height - textHeight + style.lineHeight / 2
  }

  return rect.y + (rect.height - textHeight) / 2 + style.lineHeight / 2
}

function getPositiveNumber(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : fallback
}
