import {
  MIN_ARCHITECTURE_LAYER_HEIGHT,
  MIN_ARCHITECTURE_LAYER_WIDTH,
  resizeArchitectureLayerData,
} from '../scene/architectureLayer'
import { getSwimlaneMinimumSize, resizeSwimlaneData } from '../scene/swimlane'
import type { BoxData, Point, Rect, Size } from '../types/flow'
import { getResizedRect } from './NodeResizeInteraction'
import type { ResizeHandle } from './NodeResizeInteraction'

export interface BoxResizeModeData {
  boxId: string
  handle: ResizeHandle
  start: Point
  before: BoxData
  startRect: Rect
}

export function getResizedBoxData(options: {
  mode: BoxResizeModeData
  current: Point
}): BoxData {
  const rect = getResizedRect({
    startRect: options.mode.startRect,
    delta: {
      x: options.current.x - options.mode.start.x,
      y: options.current.y - options.mode.start.y,
    },
    handle: options.mode.handle,
    minSize: getBoxMinimumSize(options.mode.before),
    keepAspectRatio: false,
  })

  if (options.mode.before.type === 'swimlane') {
    return resizeSwimlaneData(options.mode.before, rect)
  }

  if (options.mode.before.type === 'layer') {
    return resizeArchitectureLayerData(options.mode.before, rect)
  }

  return structuredClone(options.mode.before)
}

export function hasBoxResizeChanges(before: BoxData, after: BoxData) {
  return before.position.x !== after.position.x
    || before.position.y !== after.position.y
    || before.size.width !== after.size.width
    || before.size.height !== after.size.height
}

function getBoxMinimumSize(box: BoxData): Size {
  if (box.type === 'swimlane') return getSwimlaneMinimumSize(box)

  return {
    width: MIN_ARCHITECTURE_LAYER_WIDTH,
    height: MIN_ARCHITECTURE_LAYER_HEIGHT,
  }
}
