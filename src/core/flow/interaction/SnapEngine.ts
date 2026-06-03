import type { Point, Rect, SnapGuide } from '../types/flow'

export interface SnapResult {
  delta: Point
  guides: SnapGuide[]
  snappedX: boolean
  snappedY: boolean
}

export interface SnapOptions {
  movingBounds: Rect
  targetRects: Rect[]
  threshold: number
}

type SnapAxis = 'x' | 'y'
type SnapAnchorKind = 'start' | 'center' | 'end'

interface SnapCandidate {
  axis: SnapAxis
  kind: SnapAnchorKind
  delta: number
  distance: number
  movingValue: number
  targetValue: number
  targetRect: Rect
}

const CENTER_PRIORITY = 0
const EDGE_PRIORITY = 1

export function snapRectToNodes(options: SnapOptions): SnapResult {
  const xCandidate = findBestCandidate('x', options.movingBounds, options.targetRects, options.threshold)
  const yCandidate = findBestCandidate('y', options.movingBounds, options.targetRects, options.threshold)
  const delta = {
    x: xCandidate?.delta ?? 0,
    y: yCandidate?.delta ?? 0,
  }
  const snappedBounds = {
    ...options.movingBounds,
    x: options.movingBounds.x + delta.x,
    y: options.movingBounds.y + delta.y,
  }

  return {
    delta,
    guides: [
      xCandidate ? createGuide(xCandidate, snappedBounds) : null,
      yCandidate ? createGuide(yCandidate, snappedBounds) : null,
    ].filter((guide): guide is SnapGuide => Boolean(guide)),
    snappedX: Boolean(xCandidate),
    snappedY: Boolean(yCandidate),
  }
}

function findBestCandidate(
  axis: SnapAxis,
  movingBounds: Rect,
  targetRects: Rect[],
  threshold: number,
) {
  const movingAnchors = getAnchors(axis, movingBounds)
  const candidates: SnapCandidate[] = []

  for (const targetRect of targetRects) {
    const targetAnchors = getAnchors(axis, targetRect)

    for (const movingAnchor of movingAnchors) {
      for (const targetAnchor of targetAnchors) {
        const delta = targetAnchor.value - movingAnchor.value
        const distance = Math.abs(delta)
        if (distance > threshold) continue

        candidates.push({
          axis,
          kind: movingAnchor.kind,
          delta,
          distance,
          movingValue: movingAnchor.value,
          targetValue: targetAnchor.value,
          targetRect,
        })
      }
    }
  }

  return candidates.sort(compareCandidates)[0] ?? null
}

function compareCandidates(left: SnapCandidate, right: SnapCandidate) {
  if (left.distance !== right.distance) return left.distance - right.distance

  const leftPriority = getAnchorPriority(left.kind)
  const rightPriority = getAnchorPriority(right.kind)
  if (leftPriority !== rightPriority) return leftPriority - rightPriority

  return Math.abs(left.delta) - Math.abs(right.delta)
}

function getAnchors(axis: SnapAxis, rect: Rect) {
  if (axis === 'x') {
    return [
      { kind: 'start' as const, value: rect.x },
      { kind: 'center' as const, value: rect.x + rect.width / 2 },
      { kind: 'end' as const, value: rect.x + rect.width },
    ]
  }

  return [
    { kind: 'start' as const, value: rect.y },
    { kind: 'center' as const, value: rect.y + rect.height / 2 },
    { kind: 'end' as const, value: rect.y + rect.height },
  ]
}

function getAnchorPriority(kind: SnapAnchorKind) {
  return kind === 'center' ? CENTER_PRIORITY : EDGE_PRIORITY
}

function createGuide(candidate: SnapCandidate, movingBounds: Rect): SnapGuide {
  if (candidate.axis === 'x') {
    return {
      type: 'vertical',
      position: candidate.targetValue,
      from: Math.min(movingBounds.y, candidate.targetRect.y),
      to: Math.max(
        movingBounds.y + movingBounds.height,
        candidate.targetRect.y + candidate.targetRect.height,
      ),
    }
  }

  return {
    type: 'horizontal',
    position: candidate.targetValue,
    from: Math.min(movingBounds.x, candidate.targetRect.x),
    to: Math.max(
      movingBounds.x + movingBounds.width,
      candidate.targetRect.x + candidate.targetRect.width,
    ),
  }
}
