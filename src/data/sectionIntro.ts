/**
 * 各分区的档案概述。
 * DocView（分区档案页）与 ConsolePanel（分区选择页）共用同一份，
 * 避免两处文案各写一遍、改了一处忘了另一处。
 */
export const SECTION_INTRO: Record<string, string> = {
  'slot-1': '三度迎来落日的少年从地上爬起，这一次他不再向神明祈祷，而是英勇地向命运竖起了反叛的旗帜。',
  'slot-2': '谨以此，纪念我的小说家梦想。',
  'slot-3': '空耳露娜·一个不定时更新的日语空耳音乐教学up',
  'slot-4': '谨以此，记录我曾玩过的手游。',
  'slot-5': '谨以此，记录彼时我看过的所有番剧。',
  'slot-6': '谨以此，追忆我曾经到达过的地方。'
}

/** 尚未登记的分区给一句占位，方便以后加新分区时不至于空白 */
export function introFor(slotId: string, label: string): string {
  return (
    SECTION_INTRO[slotId] ??
    `此处将承载「${label}」的叙事正文。你可以放入项目记录、翻译笔记、设计说明、影像截图或任何想展示的内容。`
  )
}
