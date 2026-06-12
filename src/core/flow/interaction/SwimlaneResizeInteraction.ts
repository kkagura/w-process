import type { BoxData, Point, Rect } from '../types/flow'
import { getSwimlaneMinimumSize, resizeSwimlaneData } from '../scene/swimlane'
import type { ResizeHandle } from './NodeResizeInteraction'
import { getResizedRect } from './NodeResizeInteraction'

export interface SwimlaneResizeModeData {
  boxId: string
  handle: ResizeHandle
  start: Point
  before: BoxData
  startRect: Rect
}

export function getResizedSwimlaneData(options: {
  mode: SwimlaneResizeModeData
  current: Point
}): BoxData {
  const rect = getResizedRect({
    startRect: options.mode.startRect,
    delta: {
      x: options.current.x - options.mode.start.x,
      y: options.current.y - options.mode.start.y,
    },
    handle: options.mode.handle,
    minSize: getSwimlaneMinimumSize(options.mode.before),
    keepAspectRatio: false,
  })

  return resizeSwimlaneData(options.mode.before, rect)
}

export function hasSwimlaneResizeChanges(before: BoxData, after: BoxData) {
  return before.position.x !== after.position.x
    || before.position.y !== after.position.y
    || before.size.width !== after.size.width
    || before.size.height !== after.size.height
}
