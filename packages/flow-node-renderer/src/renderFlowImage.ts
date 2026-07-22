// @env node

import {
  CanvasRenderer,
  ElementRegistry,
  SceneManager,
} from '@w-process/flow-core'
import type { CanvasInteractionState, FlowDocument, Rect } from '@w-process/flow-core'
import {
  DEFAULT_MAX_HEIGHT,
  DEFAULT_MAX_PIXELS,
  DEFAULT_MAX_WIDTH,
  DEFAULT_PADDING,
  DEFAULT_PIXEL_RATIO,
} from './constants'
import { FlowRenderError, toErrorMessage } from './errors'
import { registerDefaultFont, registerFonts } from './fonts'
import { NodeCanvasSurface } from './NodeCanvasSurface'
import type { RenderImageLayout, RenderImageOptions, ResolvedRenderImageOptions } from './types'
import { validateFlowDocument } from './validateFlowDocument'

const EMPTY_INTERACTION_STATE: CanvasInteractionState = {
  draggingNodeId: null,
  draggingBoxId: null,
  dropTargetBoxId: null,
  selectionRect: null,
  selectionBoundsOverlay: null,
  snapGuides: [],
  activeSwimlaneDivider: null,
  pendingEdge: null,
}

export async function renderFlowImage(
  document: FlowDocument,
  options: RenderImageOptions = {},
): Promise<Buffer> {
  validateFlowDocument(document)
  const resolvedOptions = resolveRenderImageOptions(options)
  registerDefaultFont()
  registerFonts(resolvedOptions.fonts)

  const registry = ElementRegistry.createDefault()
  const scene = new SceneManager(registry)

  try {
    scene.load(document)
  }
  catch (error) {
    if (error instanceof FlowRenderError) throw error
    throw new FlowRenderError(
      'INVALID_DOCUMENT',
      `无法重建场景：${toErrorMessage(error)}`,
      { cause: error },
    )
  }

  const layout = createRenderImageLayout(scene.getContentBounds(), resolvedOptions)
  scene.setViewport(layout.viewport)

  const surface = new NodeCanvasSurface(layout.width, layout.height, resolvedOptions.pixelRatio)
  const renderer = new CanvasRenderer(registry)
  const renderOptions = {
    mode: 'preview' as const,
    showGrid: resolvedOptions.showGrid,
    showPorts: resolvedOptions.showPorts,
    showInteractionOverlays: false,
    background: resolvedOptions.background,
  }

  try {
    renderer.renderBackground({
      layers: surface,
      scene,
      interaction: EMPTY_INTERACTION_STATE,
      options: renderOptions,
    })
    renderer.renderMain({
      layers: surface,
      scene,
      interaction: EMPTY_INTERACTION_STATE,
      options: renderOptions,
    })
    return await surface.encodePng()
  }
  catch (error) {
    if (error instanceof FlowRenderError) throw error
    throw new FlowRenderError(
      'RENDER_FAILED',
      `图片渲染失败：${toErrorMessage(error)}`,
      { cause: error },
    )
  }
}

export function resolveRenderImageOptions(options: RenderImageOptions): ResolvedRenderImageOptions {
  return {
    padding: getNonNegativeNumber(options.padding, DEFAULT_PADDING, 'padding'),
    pixelRatio: getPositiveNumber(options.pixelRatio, DEFAULT_PIXEL_RATIO, 'pixelRatio'),
    background: options.background,
    showGrid: options.showGrid ?? false,
    showPorts: options.showPorts ?? false,
    fonts: options.fonts ?? [],
    maxWidth: getPositiveInteger(options.maxWidth, DEFAULT_MAX_WIDTH, 'maxWidth'),
    maxHeight: getPositiveInteger(options.maxHeight, DEFAULT_MAX_HEIGHT, 'maxHeight'),
    maxPixels: getPositiveInteger(options.maxPixels, DEFAULT_MAX_PIXELS, 'maxPixels'),
  }
}

export function createRenderImageLayout(
  bounds: Rect,
  options: ResolvedRenderImageOptions,
): RenderImageLayout {
  const width = Math.max(1, Math.ceil(bounds.width + options.padding * 2))
  const height = Math.max(1, Math.ceil(bounds.height + options.padding * 2))
  const physicalWidth = Math.max(1, Math.ceil(width * options.pixelRatio))
  const physicalHeight = Math.max(1, Math.ceil(height * options.pixelRatio))

  if (physicalWidth > options.maxWidth || physicalHeight > options.maxHeight) {
    throw new FlowRenderError(
      'CANVAS_SIZE_EXCEEDED',
      `图片尺寸 ${physicalWidth}x${physicalHeight} 超过限制 ${options.maxWidth}x${options.maxHeight}`,
    )
  }
  if (physicalWidth * physicalHeight > options.maxPixels) {
    throw new FlowRenderError(
      'CANVAS_SIZE_EXCEEDED',
      `图片总像素 ${physicalWidth * physicalHeight} 超过限制 ${options.maxPixels}`,
    )
  }

  return {
    width,
    height,
    physicalWidth,
    physicalHeight,
    viewport: {
      x: options.padding - bounds.x,
      y: options.padding - bounds.y,
      zoom: 1,
    },
  }
}

function getNonNegativeNumber(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback
  if (!Number.isFinite(value) || value < 0) invalidOption(name, '必须是大于等于 0 的有限数字')
  return value
}

function getPositiveNumber(value: number | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback
  if (!Number.isFinite(value) || value <= 0) invalidOption(name, '必须是大于 0 的有限数字')
  return value
}

function getPositiveInteger(value: number | undefined, fallback: number, name: string): number {
  const resolved = getPositiveNumber(value, fallback, name)
  if (!Number.isInteger(resolved)) invalidOption(name, '必须是正整数')
  return resolved
}

function invalidOption(name: string, expectation: string): never {
  throw new FlowRenderError('INVALID_ARGUMENT', `${name} ${expectation}`)
}
