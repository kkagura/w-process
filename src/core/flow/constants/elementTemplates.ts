import type { ElementTemplate } from '../types/flow'

export const elementTemplates: ElementTemplate[] = [
  {
    type: 'task',
    label: '任务节点',
    defaultSize: { width: 160, height: 72 },
    ports: [
      { id: 'in', label: '输入', direction: 'input', offset: { x: 0, y: 36 } },
      { id: 'out', label: '输出', direction: 'output', offset: { x: 160, y: 36 } },
    ],
    defaultProps: {
      description: '',
    },
  },
]

export function findElementTemplate(type: string) {
  return elementTemplates.find(template => template.type === type) ?? null
}
