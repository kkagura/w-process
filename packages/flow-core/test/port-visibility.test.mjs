import assert from 'node:assert/strict'
import {
  BaseNode,
  BaseNodeView,
  CanvasRenderer,
  ElementRegistry,
  getHoveredSelection,
  SceneManager,
} from '../dist/index.js'

testVisiblePortsOnly()
testPortHitModes()
testRenderPortVisibility()
console.log('node port visibility hit tests passed')

function testVisiblePortsOnly() {
  const scene = createScene()
  const portPoint = { x: 164, y: 36 }

  assert.equal(scene.hitTest(portPoint), null)

  const nodeHit = scene.hitTest({ x: 80, y: 36 })
  assert.deepEqual(nodeHit, { type: 'node', id: 'task-1' })
  scene.setHovered(getHoveredSelection(nodeHit))

  const portHit = scene.hitTest(portPoint)
  assert.deepEqual(portHit, {
    type: 'port',
    nodeId: 'task-1',
    portId: 'task-1-right',
  })
  assert.deepEqual(getHoveredSelection(portHit), {
    type: 'node',
    id: 'task-1',
  })
}

function testPortHitModes() {
  const scene = createScene()
  const portPoint = { x: 164, y: 36 }

  scene.select({ type: 'node', id: 'task-1' })
  assert.equal(scene.hitTest(portPoint)?.type, 'port')
  assert.equal(scene.hitTest(portPoint, { portMode: 'none' }), null)

  scene.clearSelection()
  assert.equal(scene.hitTest(portPoint), null)
  assert.equal(scene.hitTest(portPoint, { portMode: 'all' })?.type, 'port')
}

function testRenderPortVisibility() {
  const contexts = []
  class TestNode extends BaseNode {}
  class TestNodeView extends BaseNodeView {
    draw(_ctx, _node, context) {
      contexts.push(context)
    }
  }

  const registry = new ElementRegistry()
  registry.registerNode('test-node', {
    node: TestNode,
    view: TestNodeView,
  })
  const scene = new SceneManager(registry)
  scene.addNodeData({
    id: 'node-1',
    type: 'test-node',
    label: '节点',
    position: { x: 0, y: 0 },
    size: { width: 100, height: 60 },
    rotation: 0,
    ports: [],
    props: {},
  })
  scene.clearSelection()

  const renderer = new CanvasRenderer(registry)
  const layers = createRenderSurface()
  const baseInteraction = {
    draggingNodeId: null,
    draggingBoxId: null,
    dropTargetBoxId: null,
    selectionRect: null,
    selectionBoundsOverlay: null,
    snapGuides: [],
    activeSwimlaneDivider: null,
    pendingEdge: null,
  }
  const render = (options, interaction = baseInteraction) => {
    contexts.length = 0
    renderer.renderMain({ layers, scene, options, interaction })
    assert.equal(contexts.length, 1)
    return contexts[0]
  }

  assert.equal(render({ mode: 'editor' }).showPorts, false)

  scene.setHovered({ type: 'node', id: 'node-1' })
  assert.equal(render({ mode: 'editor' }).showPorts, true)

  scene.setHovered(null)
  scene.select({ type: 'node', id: 'node-1' })
  assert.equal(render({ mode: 'editor' }).showPorts, true)

  scene.clearSelection()
  assert.equal(render({ mode: 'editor' }, {
    ...baseInteraction,
    pendingEdge: {
      sourcePoint: { x: 0, y: 0 },
      currentPoint: { x: 10, y: 10 },
      sourceRect: null,
      targetRect: null,
      valid: false,
    },
  }).showPorts, true)

  assert.equal(render({ mode: 'preview' }).showPorts, false)
  assert.equal(render({ mode: 'preview', showPorts: true }).showPorts, true)
}

function createScene() {
  const scene = new SceneManager(ElementRegistry.createDefault())
  scene.addNodeData({
    id: 'task-1',
    type: 'task',
    label: '任务',
    position: { x: 0, y: 0 },
    size: { width: 160, height: 72 },
    rotation: 0,
    ports: [
      {
        id: 'task-1-right',
        nodeId: 'task-1',
        templateId: 'right',
        label: '右侧端口',
        offset: { x: 160, y: 36 },
      },
    ],
    props: {},
  })
  scene.clearSelection()
  return scene
}

function createRenderSurface() {
  const context = new Proxy({}, {
    get(target, property) {
      if (property in target) return target[property]
      return () => {}
    },
    set(target, property, value) {
      target[property] = value
      return true
    },
  })

  return {
    backgroundContext: context,
    mainContext: context,
    getSize: () => ({ width: 640, height: 480, pixelRatio: 1 }),
    resetTransform: () => {},
    clearBackground: () => {},
    clearMain: () => {},
  }
}
