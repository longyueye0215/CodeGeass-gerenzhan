export interface SectionSlot {
  id: string
  index: string
  label: string
  caption: string
}

export interface MetricSlot {
  id: string
  label: string
  value: number
}

export const sectionSlots: SectionSlot[] = [
  { id: 'slot-1', index: '01', label: '履历', caption: '待命名' },
  { id: 'slot-2', index: '02', label: '小说', caption: '待命名' },
  { id: 'slot-3', index: '03', label: '音乐', caption: '待命名' },
  { id: 'slot-4', index: '04', label: '游戏', caption: '待命名' },
  { id: 'slot-5', index: '05', label: '追番', caption: '待命名' },
  { id: 'slot-6', index: '06', label: '旅行', caption: '待命名' }
]

export const metricSlots: MetricSlot[] = [
  { id: 'metric-1', label: '智力', value: 76 },
  { id: 'metric-2', label: '体力', value: 38 },
  { id: 'metric-3', label: '毅力', value: 54 },
  { id: 'metric-4', label: '想象力', value: 92 }
]

export const siteMeta = {
  brand: '胧月夜',
  intro: '胧月夜の群星观测站',
  subtitle: '数字出版 · 日中翻译 · 跨界创作者',
  coord: 'COSMIC BROTH / LUNAR NIGHT'
}
