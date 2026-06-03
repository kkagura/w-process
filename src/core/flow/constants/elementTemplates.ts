import type { ElementTemplate } from '../types/flow'

export const elementTemplates: ElementTemplate[] = [
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
    },
  },
]

export function findElementTemplate(type: string) {
  return elementTemplates.find(template => template.type === type) ?? null
}
