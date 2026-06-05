import type { ElementTemplate } from '../types/flow'

export const flowNodeTemplates: ElementTemplate[] = [
  {
    type: 'start',
    label: '开始节点',
    defaultSize: { width: 120, height: 48 },
    ports: [
      { id: 'right', label: '右侧端口', offset: { x: 120, y: 24 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#166534',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 12,
        maxLines: 1,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#f0fdf4',
        opacity: 1,
      },
      borderStyle: {
        color: '#16a34a',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
  {
    type: 'task',
    label: '任务节点',
    defaultSize: { width: 160, height: 72 },
    ports: [
      { id: 'left', label: '左侧端口', offset: { x: 0, y: 36 } },
      { id: 'right', label: '右侧端口', offset: { x: 160, y: 36 } },
    ],
    defaultProps: {
      description: '',
      textStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 14,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#ffffff',
        opacity: 1,
      },
      borderStyle: {
        color: '#94a3b8',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
  {
    type: 'decision',
    label: '判断节点',
    defaultSize: { width: 144, height: 96 },
    ports: [
      { id: 'top', label: '上方端口', offset: { x: 72, y: 0 } },
      { id: 'right', label: '是 / 右侧端口', offset: { x: 144, y: 48 } },
      { id: 'bottom', label: '下方端口', offset: { x: 72, y: 96 } },
      { id: 'left', label: '否 / 左侧端口', offset: { x: 0, y: 48 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#92400e',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 8,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#fffbeb',
        opacity: 1,
      },
      borderStyle: {
        color: '#f59e0b',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
  {
    type: 'data',
    label: '数据节点',
    defaultSize: { width: 160, height: 72 },
    ports: [
      { id: 'top', label: '上方端口', offset: { x: 80, y: 0 } },
      { id: 'right', label: '右侧端口', offset: { x: 160, y: 36 } },
      { id: 'bottom', label: '下方端口', offset: { x: 80, y: 72 } },
      { id: 'left', label: '左侧端口', offset: { x: 0, y: 36 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#155e75',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 12,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#ecfeff',
        opacity: 1,
      },
      borderStyle: {
        color: '#0891b2',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
  {
    type: 'document',
    label: '文档节点',
    defaultSize: { width: 160, height: 82 },
    ports: [
      { id: 'top', label: '上方端口', offset: { x: 80, y: 0 } },
      { id: 'right', label: '右侧端口', offset: { x: 160, y: 41 } },
      { id: 'bottom', label: '下方端口', offset: { x: 80, y: 82 } },
      { id: 'left', label: '左侧端口', offset: { x: 0, y: 41 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5b21b6',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 14,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#f5f3ff',
        opacity: 1,
      },
      borderStyle: {
        color: '#7c3aed',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
  {
    type: 'subflow',
    label: '子流程节点',
    defaultSize: { width: 180, height: 76 },
    ports: [
      { id: 'top', label: '上方端口', offset: { x: 90, y: 0 } },
      { id: 'right', label: '右侧端口', offset: { x: 180, y: 38 } },
      { id: 'bottom', label: '下方端口', offset: { x: 90, y: 76 } },
      { id: 'left', label: '左侧端口', offset: { x: 0, y: 38 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 14,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#f8fafc',
        opacity: 1,
      },
      borderStyle: {
        color: '#475569',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
  {
    type: 'end',
    label: '结束节点',
    defaultSize: { width: 120, height: 48 },
    ports: [
      { id: 'left', label: '左侧端口', offset: { x: 0, y: 24 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#991b1b',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 12,
        maxLines: 1,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#fef2f2',
        opacity: 1,
      },
      borderStyle: {
        color: '#dc2626',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
]

export const basicShapeTemplates: ElementTemplate[] = [
  {
    type: 'shape-circle',
    label: '圆形',
    defaultSize: { width: 96, height: 96 },
    ports: [
      { id: 'top', label: '上方端口', offset: { x: 48, y: 0 } },
      { id: 'right', label: '右侧端口', offset: { x: 96, y: 48 } },
      { id: 'bottom', label: '下方端口', offset: { x: 48, y: 96 } },
      { id: 'left', label: '左侧端口', offset: { x: 0, y: 48 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e3a8a',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 8,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#eff6ff',
        opacity: 1,
      },
      borderStyle: {
        color: '#2563eb',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
  {
    type: 'shape-rectangle',
    label: '矩形',
    defaultSize: { width: 140, height: 80 },
    ports: [
      { id: 'top', label: '上方端口', offset: { x: 70, y: 0 } },
      { id: 'right', label: '右侧端口', offset: { x: 140, y: 40 } },
      { id: 'bottom', label: '下方端口', offset: { x: 70, y: 80 } },
      { id: 'left', label: '左侧端口', offset: { x: 0, y: 40 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 12,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#f8fafc',
        opacity: 1,
      },
      borderStyle: {
        color: '#475569',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
  {
    type: 'shape-triangle',
    label: '三角形',
    defaultSize: { width: 120, height: 100 },
    ports: [
      { id: 'top', label: '上方端口', offset: { x: 60, y: 0 } },
      { id: 'right', label: '右侧端口', offset: { x: 90, y: 50 } },
      { id: 'bottom', label: '下方端口', offset: { x: 60, y: 100 } },
      { id: 'left', label: '左侧端口', offset: { x: 30, y: 50 } },
    ],
    defaultProps: {
      textStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9a3412',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 6,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#fff7ed',
        opacity: 1,
      },
      borderStyle: {
        color: '#ea580c',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
]

export const iconNodeTemplates: ElementTemplate[] = [
  {
    type: 'icon-service',
    label: '服务',
    defaultSize: { width: 120, height: 112 },
    ports: [
      { id: 'top', label: '上方端口', offset: { x: 60, y: 0 } },
      { id: 'right', label: '右侧端口', offset: { x: 120, y: 56 } },
      { id: 'bottom', label: '下方端口', offset: { x: 60, y: 112 } },
      { id: 'left', label: '左侧端口', offset: { x: 0, y: 56 } },
    ],
    defaultProps: {
      iconStyle: {
        color: '#2563eb',
        backgroundColor: '#dbeafe',
      },
      textStyle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1e3a8a',
        align: 'center',
        verticalAlign: 'middle',
        lineHeight: 18,
        padding: 2,
        maxLines: 2,
        overflow: 'ellipsis',
      },
      fillStyle: {
        color: '#ffffff',
        opacity: 1,
      },
      borderStyle: {
        color: '#2563eb',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
]

export const elementTemplates: ElementTemplate[] = [
  ...flowNodeTemplates,
  ...basicShapeTemplates,
  ...iconNodeTemplates,
]

export function findElementTemplate(type: string) {
  return elementTemplates.find(template => template.type === type) ?? null
}
