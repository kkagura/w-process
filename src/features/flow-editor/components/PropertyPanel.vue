<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import PropertyColorField from './property-panel/PropertyColorField.vue'
import PropertyGroup from './property-panel/PropertyGroup.vue'
import PropertyNumberField from './property-panel/PropertyNumberField.vue'
import PropertySelectField from './property-panel/PropertySelectField.vue'
import PropertyTextField from './property-panel/PropertyTextField.vue'
import type {
  EdgeId,
  EdgeLineDash,
  EdgeLineStyleData,
  EdgeRouteData,
  EdgeRouteType,
  EditorUiState,
  NodeBorderDash,
  NodeBorderStyleData,
  NodeFillStyleData,
  NodeId,
  NodeTextHorizontalAlign,
  NodeTextOverflow,
  NodeTextStyleData,
  NodeTextVerticalAlign,
  Point,
  Size,
} from '../../../core/flow/types/flow'

const props = defineProps<{
  uiState: EditorUiState | null
}>()

const emit = defineEmits<{
  updateNodeLabel: [nodeId: NodeId, label: string]
  updateNodePosition: [nodeId: NodeId, position: Point]
  updateNodeSize: [nodeId: NodeId, size: Size]
  updateNodeTextStyle: [nodeId: NodeId, textStyle: Partial<NodeTextStyleData>]
  updateNodeBorderStyle: [nodeId: NodeId, borderStyle: Partial<NodeBorderStyleData>]
  updateNodeFillStyle: [nodeId: NodeId, fillStyle: Partial<NodeFillStyleData>]
  updateEdgeLabel: [edgeId: EdgeId, label: string]
  updateEdgeLineStyle: [edgeId: EdgeId, lineStyle: Partial<EdgeLineStyleData>]
  updateEdgeRoute: [edgeId: EdgeId, route: EdgeRouteData]
}>()

const labelDraft = shallowRef('')
const edgeLabelDraft = shallowRef('')
const edgeRouteTypeDraft = shallowRef<EdgeRouteType>('orthogonal')
const geometryDraft = reactive({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
})
const collapsedGroups = reactive({
  base: false,
  geometry: false,
  text: false,
  fill: false,
  border: false,
  edgeBase: false,
  edgeRoute: false,
  edgeLine: false,
})
const textStyleDraft = reactive<NodeTextStyleData>(createDefaultTextStyle())
const fillStyleDraft = reactive<NodeFillStyleData>(createDefaultFillStyle())
const borderStyleDraft = reactive<NodeBorderStyleData>(createDefaultBorderStyle())
const edgeLineStyleDraft = reactive<EdgeLineStyleData>(createDefaultEdgeLineStyle())
const fontWeightOptions = [
  { label: '常规', value: '400' },
  { label: '半粗', value: '600' },
  { label: '加粗', value: '700' },
]
const horizontalAlignOptions: Array<{ label: string; value: NodeTextHorizontalAlign }> = [
  { label: '左对齐', value: 'left' },
  { label: '居中', value: 'center' },
  { label: '右对齐', value: 'right' },
]
const verticalAlignOptions: Array<{ label: string; value: NodeTextVerticalAlign }> = [
  { label: '顶部', value: 'top' },
  { label: '居中', value: 'middle' },
  { label: '底部', value: 'bottom' },
]
const borderDashOptions: Array<{ label: string; value: NodeBorderDash }> = [
  { label: '实线', value: 'solid' },
  { label: '虚线', value: 'dashed' },
]
const edgeLineDashOptions: Array<{ label: string; value: EdgeLineDash }> = [
  { label: '实线', value: 'solid' },
  { label: '虚线', value: 'dashed' },
]
const edgeRouteTypeOptions: Array<{ label: string; value: EdgeRouteType }> = [
  { label: '正交线', value: 'orthogonal' },
  { label: '贝塞尔曲线', value: 'bezier' },
]

const selectedNode = computed(() => props.uiState?.selectedNode ?? null)
const selectedEdge = computed(() => props.uiState?.selectedEdge ?? null)
const selectedCount = computed(() => props.uiState?.selection.items.length ?? 0)
const showSingleNode = computed(() => selectedCount.value <= 1 && Boolean(selectedNode.value))
const showSingleEdge = computed(() => selectedCount.value <= 1 && Boolean(selectedEdge.value))
const fillOpacityPercent = computed({
  get: () => Math.round(fillStyleDraft.opacity * 100),
  set: (value: number) => {
    fillStyleDraft.opacity = clamp(getFiniteNumber(value, 100), 0, 100) / 100
  },
})

watch(
  selectedNode,
  (node) => {
    labelDraft.value = node?.label ?? ''
    if (!node) return

    geometryDraft.x = node.position.x
    geometryDraft.y = node.position.y
    geometryDraft.width = node.size.width
    geometryDraft.height = node.size.height
    Object.assign(textStyleDraft, getTextStyleData(node.props))
    Object.assign(fillStyleDraft, getFillStyleData(node.props))
    Object.assign(borderStyleDraft, getBorderStyleData(node.props))
  },
  { immediate: true },
)

watch(
  selectedEdge,
  (edge) => {
    edgeLabelDraft.value = edge?.label ?? ''
    if (!edge) return

    edgeRouteTypeDraft.value = getEdgeRouteData(edge.props ?? {}).type
    Object.assign(edgeLineStyleDraft, getEdgeLineStyleData(edge.props ?? {}))
  },
  { immediate: true },
)

function commitLabel() {
  const node = selectedNode.value
  if (!node) return

  const nextLabel = labelDraft.value.trim()
  if (!nextLabel) {
    labelDraft.value = node.label
    return
  }

  if (nextLabel === node.label) return
  emit('updateNodeLabel', node.id, nextLabel)
}

function commitPosition() {
  const node = selectedNode.value
  if (!node) return

  const position = {
    x: getFiniteNumber(geometryDraft.x, node.position.x),
    y: getFiniteNumber(geometryDraft.y, node.position.y),
  }
  geometryDraft.x = position.x
  geometryDraft.y = position.y

  if (position.x === node.position.x && position.y === node.position.y) return
  emit('updateNodePosition', node.id, position)
}

function commitSize() {
  const node = selectedNode.value
  if (!node) return

  const size = {
    width: Math.max(40, getFiniteNumber(geometryDraft.width, node.size.width)),
    height: Math.max(32, getFiniteNumber(geometryDraft.height, node.size.height)),
  }
  geometryDraft.width = size.width
  geometryDraft.height = size.height

  if (size.width === node.size.width && size.height === node.size.height) return
  emit('updateNodeSize', node.id, size)
}

function commitTextStyle() {
  const node = selectedNode.value
  if (!node) return

  const textStyle = normalizeTextStyle(textStyleDraft)
  Object.assign(textStyleDraft, textStyle)
  emit('updateNodeTextStyle', node.id, textStyle)
}

function commitBorderStyle() {
  const node = selectedNode.value
  if (!node) return

  const borderStyle = normalizeBorderStyle(borderStyleDraft)
  Object.assign(borderStyleDraft, borderStyle)
  emit('updateNodeBorderStyle', node.id, borderStyle)
}

function commitFillStyle() {
  const node = selectedNode.value
  if (!node) return

  const fillStyle = normalizeFillStyle(fillStyleDraft)
  Object.assign(fillStyleDraft, fillStyle)
  emit('updateNodeFillStyle', node.id, fillStyle)
}

function commitEdgeLabel() {
  const edge = selectedEdge.value
  if (!edge) return

  const nextLabel = edgeLabelDraft.value.trim()
  if (nextLabel === (edge.label ?? '')) return
  emit('updateEdgeLabel', edge.id, nextLabel)
}

function commitEdgeLineStyle() {
  const edge = selectedEdge.value
  if (!edge) return

  const lineStyle = normalizeEdgeLineStyle(edgeLineStyleDraft)
  Object.assign(edgeLineStyleDraft, lineStyle)
  emit('updateEdgeLineStyle', edge.id, lineStyle)
}

function commitEdgeRoute() {
  const edge = selectedEdge.value
  if (!edge) return

  const route = normalizeEdgeRoute({ type: edgeRouteTypeDraft.value })
  edgeRouteTypeDraft.value = route.type
  emit('updateEdgeRoute', edge.id, route)
}

function toggleGroup(group: keyof typeof collapsedGroups) {
  collapsedGroups[group] = !collapsedGroups[group]
}

function getTextStyleData(props: Record<string, unknown>) {
  const value = props.textStyle
  const fallback = createDefaultTextStyle()
  if (!isRecord(value)) return fallback

  return normalizeTextStyle({
    ...fallback,
    ...value,
  })
}

function getBorderStyleData(props: Record<string, unknown>) {
  const value = props.borderStyle
  const fallback = createDefaultBorderStyle()
  if (!isRecord(value)) return fallback

  return normalizeBorderStyle({
    ...fallback,
    ...value,
  })
}

function getFillStyleData(props: Record<string, unknown>) {
  const value = props.fillStyle
  const fallback = createDefaultFillStyle()
  if (!isRecord(value)) return fallback

  return normalizeFillStyle({
    ...fallback,
    ...value,
  })
}

function getEdgeLineStyleData(props: Record<string, unknown>) {
  const value = props.lineStyle
  const fallback = createDefaultEdgeLineStyle()
  if (!isRecord(value)) return fallback

  return normalizeEdgeLineStyle({
    ...fallback,
    ...value,
  })
}

function getEdgeRouteData(props: Record<string, unknown>) {
  const value = props.route
  const fallback = createDefaultEdgeRoute()
  if (!isRecord(value)) return fallback

  return normalizeEdgeRoute({
    ...fallback,
    ...value,
  })
}

function createDefaultTextStyle(): NodeTextStyleData {
  return {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 18,
    padding: 14,
    maxLines: 2,
    overflow: 'ellipsis',
  }
}

function createDefaultBorderStyle(): NodeBorderStyleData {
  return {
    color: '#94a3b8',
    width: 1.5,
    dash: 'solid',
  }
}

function createDefaultFillStyle(): NodeFillStyleData {
  return {
    color: '#ffffff',
    opacity: 1,
  }
}

function createDefaultEdgeLineStyle(): EdgeLineStyleData {
  return {
    color: '#64748b',
    width: 1.6,
    dash: 'solid',
    arrowSize: 8,
  }
}

function createDefaultEdgeRoute(): EdgeRouteData {
  return {
    type: 'orthogonal',
  }
}

function normalizeTextStyle(value: NodeTextStyleData): NodeTextStyleData {
  return {
    fontSize: Math.max(8, getFiniteNumber(value.fontSize, 14)),
    fontFamily: typeof value.fontFamily === 'string' ? value.fontFamily : undefined,
    fontWeight: typeof value.fontWeight === 'string' ? value.fontWeight : '600',
    fontStyle: typeof value.fontStyle === 'string' ? value.fontStyle : undefined,
    color: typeof value.color === 'string' && value.color ? value.color : '#111827',
    align: isTextHorizontalAlign(value.align) ? value.align : 'center',
    verticalAlign: isTextVerticalAlign(value.verticalAlign) ? value.verticalAlign : 'middle',
    lineHeight: Math.max(10, getFiniteNumber(value.lineHeight, 18)),
    padding: Math.max(0, getFiniteNumber(value.padding, 14)),
    maxLines: Math.max(1, Math.floor(getFiniteNumber(value.maxLines, 2))),
    overflow: isTextOverflow(value.overflow) ? value.overflow : 'ellipsis',
  }
}

function normalizeBorderStyle(value: NodeBorderStyleData): NodeBorderStyleData {
  return {
    color: typeof value.color === 'string' && value.color ? value.color : '#94a3b8',
    width: Math.max(1, getFiniteNumber(value.width, 1.5)),
    dash: isBorderDash(value.dash) ? value.dash : 'solid',
  }
}

function normalizeFillStyle(value: NodeFillStyleData): NodeFillStyleData {
  return {
    color: typeof value.color === 'string' && value.color ? value.color : '#ffffff',
    opacity: clamp(getFiniteNumber(value.opacity, 1), 0, 1),
  }
}

function normalizeEdgeLineStyle(value: EdgeLineStyleData): EdgeLineStyleData {
  return {
    color: typeof value.color === 'string' && value.color ? value.color : '#64748b',
    width: Math.max(1, getFiniteNumber(value.width, 1.6)),
    dash: isEdgeLineDash(value.dash) ? value.dash : 'solid',
    arrowSize: Math.max(4, getFiniteNumber(value.arrowSize, 8)),
  }
}

function normalizeEdgeRoute(value: EdgeRouteData): EdgeRouteData {
  return {
    type: isEdgeRouteType(value.type) ? value.type : 'orthogonal',
  }
}

function getFiniteNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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

function isEdgeLineDash(value: unknown): value is EdgeLineDash {
  return value === 'solid' || value === 'dashed'
}

function isEdgeRouteType(value: unknown): value is EdgeRouteType {
  return value === 'orthogonal' || value === 'bezier'
}
</script>

<template>
  <aside class="property-panel">
    <div class="panel-heading">属性</div>

    <div v-if="showSingleNode && selectedNode" class="property-section">
      <div class="property-title">{{ selectedNode.label }}</div>

      <PropertyGroup
        title="基础信息"
        :collapsed="collapsedGroups.base"
        @toggle="toggleGroup('base')"
      >
        <dl class="property-list">
          <div>
            <dt>ID</dt>
            <dd>{{ selectedNode.id }}</dd>
          </div>
        </dl>
        <PropertyTextField
          v-model="labelDraft"
          label="名称"
          @commit="commitLabel"
        />
      </PropertyGroup>

      <PropertyGroup
        title="位置尺寸"
        :collapsed="collapsedGroups.geometry"
        @toggle="toggleGroup('geometry')"
      >
        <div class="field-row">
          <PropertyNumberField v-model="geometryDraft.x" label="X" @commit="commitPosition" />
          <PropertyNumberField v-model="geometryDraft.y" label="Y" @commit="commitPosition" />
        </div>
        <div class="field-row">
          <PropertyNumberField v-model="geometryDraft.width" label="宽" :min="40" @commit="commitSize" />
          <PropertyNumberField v-model="geometryDraft.height" label="高" :min="32" @commit="commitSize" />
        </div>
      </PropertyGroup>

      <PropertyGroup
        title="文本样式"
        :collapsed="collapsedGroups.text"
        @toggle="toggleGroup('text')"
      >
        <div class="field-row">
          <PropertyNumberField v-model="textStyleDraft.fontSize" label="字号" :min="8" @commit="commitTextStyle" />
          <PropertyNumberField v-model="textStyleDraft.lineHeight" label="行高" :min="10" @commit="commitTextStyle" />
        </div>
        <div class="field-row">
          <PropertySelectField
            v-model="textStyleDraft.fontWeight"
            label="字重"
            :options="fontWeightOptions"
            @commit="commitTextStyle"
          />
          <PropertyColorField v-model="textStyleDraft.color" label="颜色" @commit="commitTextStyle" />
        </div>
        <div class="field-row">
          <PropertySelectField
            v-model="textStyleDraft.align"
            label="水平"
            :options="horizontalAlignOptions"
            @commit="commitTextStyle"
          />
          <PropertySelectField
            v-model="textStyleDraft.verticalAlign"
            label="垂直"
            :options="verticalAlignOptions"
            @commit="commitTextStyle"
          />
        </div>
        <div class="field-row">
          <PropertyNumberField v-model="textStyleDraft.padding" label="内边距" :min="0" @commit="commitTextStyle" />
          <PropertyNumberField v-model="textStyleDraft.maxLines" label="最大行" :min="1" @commit="commitTextStyle" />
        </div>
      </PropertyGroup>

      <PropertyGroup
        title="填充样式"
        :collapsed="collapsedGroups.fill"
        @toggle="toggleGroup('fill')"
      >
        <div class="field-row">
          <PropertyColorField v-model="fillStyleDraft.color" label="填充色" @commit="commitFillStyle" />
          <PropertyNumberField
            v-model="fillOpacityPercent"
            label="透明度"
            :min="0"
            :max="100"
            :step="1"
            @commit="commitFillStyle"
          />
        </div>
      </PropertyGroup>

      <PropertyGroup
        title="边框样式"
        :collapsed="collapsedGroups.border"
        @toggle="toggleGroup('border')"
      >
        <div class="field-row">
          <PropertyColorField v-model="borderStyleDraft.color" label="颜色" @commit="commitBorderStyle" />
          <PropertyNumberField
            v-model="borderStyleDraft.width"
            label="线宽"
            :min="1"
            :step="0.5"
            @commit="commitBorderStyle"
          />
        </div>
        <PropertySelectField
          v-model="borderStyleDraft.dash"
          label="线型"
          :options="borderDashOptions"
          @commit="commitBorderStyle"
        />
      </PropertyGroup>
    </div>

    <div v-else-if="showSingleEdge && selectedEdge" class="property-section">
      <div class="property-title">{{ selectedEdge.label || '连线' }}</div>

      <PropertyGroup
        title="基础信息"
        :collapsed="collapsedGroups.edgeBase"
        @toggle="toggleGroup('edgeBase')"
      >
        <dl class="property-list">
          <div>
            <dt>ID</dt>
            <dd>{{ selectedEdge.id }}</dd>
          </div>
          <div>
            <dt>起点</dt>
            <dd>{{ selectedEdge.source.nodeId }} / {{ selectedEdge.source.portId }}</dd>
          </div>
          <div>
            <dt>终点</dt>
            <dd>{{ selectedEdge.target.nodeId }} / {{ selectedEdge.target.portId }}</dd>
          </div>
        </dl>
        <PropertyTextField
          v-model="edgeLabelDraft"
          label="标签"
          @commit="commitEdgeLabel"
        />
      </PropertyGroup>

      <PropertyGroup
        title="路径"
        :collapsed="collapsedGroups.edgeRoute"
        @toggle="toggleGroup('edgeRoute')"
      >
        <PropertySelectField
          v-model="edgeRouteTypeDraft"
          label="类型"
          :options="edgeRouteTypeOptions"
          @commit="commitEdgeRoute"
        />
      </PropertyGroup>

      <PropertyGroup
        title="线条样式"
        :collapsed="collapsedGroups.edgeLine"
        @toggle="toggleGroup('edgeLine')"
      >
        <div class="field-row">
          <PropertyColorField v-model="edgeLineStyleDraft.color" label="颜色" @commit="commitEdgeLineStyle" />
          <PropertyNumberField
            v-model="edgeLineStyleDraft.width"
            label="线宽"
            :min="1"
            :step="0.5"
            @commit="commitEdgeLineStyle"
          />
        </div>
        <div class="field-row">
          <PropertySelectField
            v-model="edgeLineStyleDraft.dash"
            label="线型"
            :options="edgeLineDashOptions"
            @commit="commitEdgeLineStyle"
          />
          <PropertyNumberField
            v-model="edgeLineStyleDraft.arrowSize"
            label="箭头"
            :min="4"
            @commit="commitEdgeLineStyle"
          />
        </div>
      </PropertyGroup>
    </div>

    <div v-else-if="selectedCount > 1" class="property-section">
      <div class="property-title">已选择 {{ selectedCount }} 个元素</div>
      <p class="property-hint">多选状态下暂不展示单个节点属性。</p>
    </div>

    <div v-else class="empty-state">
      未选择元素
    </div>
  </aside>
</template>

<style scoped>
.property-panel {
  background: var(--panel-bg);
  border-left: 1px solid var(--app-border);
  min-width: 260px;
  overflow: auto;
  padding: 12px;
}

.panel-heading {
  color: var(--muted-text);
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 10px;
}

.property-section {
  background: #fff;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 10px;
}

.property-title {
  color: var(--strong-text);
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 6px;
  overflow-wrap: anywhere;
}

.field-row {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.property-list {
  display: grid;
  gap: 7px;
  margin: 0;
}

.property-list div {
  display: grid;
  gap: 3px;
}

.property-list dt {
  color: var(--muted-text);
  font-size: 11px;
}

.property-list dd {
  color: var(--strong-text);
  font-size: 12px;
  margin: 0;
  overflow-wrap: anywhere;
}

.property-hint,
.empty-state {
  color: var(--muted-text);
  font-size: 14px;
}

.property-hint {
  line-height: 1.6;
  margin: 0;
}
</style>
