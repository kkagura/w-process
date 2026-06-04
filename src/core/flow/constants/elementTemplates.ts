import type { ElementTemplate } from '../types/flow'

export const elementTemplates: ElementTemplate[] = [
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
      borderStyle: {
        color: '#94a3b8',
        width: 1.5,
        dash: 'solid',
      },
    },
  },
]

export function findElementTemplate(type: string) {
  return elementTemplates.find(template => template.type === type) ?? null
}
