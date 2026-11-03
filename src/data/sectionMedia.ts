/**
 * 分区预览图、扮演角色、世界、类型。
 * 数组按下标（0 基）与 sectionSlots 当前顺序一一对应：
 *   0 履历 / 1 小说 / 2 音乐 / 3 游戏 / 4 追番 / 5 旅行
 * DocView 用 HERO[index - 1] / ROLE[index - 1] / WORLD[index - 1] / TYPE[index - 1]，
 * ConsolePanel 用 HERO[focusIndex] / ROLE[focusIndex] / WORLD[focusIndex] / TYPE[focusIndex]。
 *
 * 扮演角色（用户指定）：
 *   履历=尼禄(FGO) / 小说=黑摩可拿(xxxHOLiC) / 音乐=初音未来(Vocaloid)
 *   游戏=黑化桃乐丝(NIKKE) / 追番=C.C.(反叛的鲁路修) / 旅行=邪神酱(邪神与厨二病少女)
 */

export const HERO: (string | null)[] = [
  '/images/sections/resume.jpg', // 0 履历 · 尼禄
  '/images/sections/novel.jpg',  // 1 小说 · 黑摩可拿（主体偏右，需右对齐裁切）
  '/images/sections/music.jpg',  // 2 音乐 · 初音未来
  '/images/sections/game.jpg',   // 3 游戏 · 黑化桃乐丝
  '/images/sections/anime.jpg',  // 4 追番 · C.C.
  '/images/sections/travel.jpg'  // 5 旅行 · 邪神酱
]

/** 「扮演角色」一栏对应角色 */
export const ROLE: string[] = [
  '尼禄',       // 履历 · FGO
  '黑摩可拿',   // 小说 · xxxHOLiC
  '初音未来',   // 音乐 · Vocaloid
  '黑化桃乐丝', // 游戏 · NIKKE
  'C.C.',       // 追番 · 反叛的鲁路修
  '邪神酱'      // 旅行 · 邪神与厨二病少女
]

/** 「世界」：各角色所属作品的世界观设定 */
export const WORLD: string[] = [
  '人理·英灵座',   // 履历 · FGO：人理存续 / 英灵座
  '次元夹缝界',     // 小说 · xxxHOLiC：连接异界的次元夹缝
  '电子歌姬界',     // 音乐 · Vocaloid：虚拟歌姬的电子世界
  '废土·方舟',     // 游戏 · NIKKE：地表沦陷后的方舟避难所
  '不列颠尼亚',     // 追番 · Code Geass：架空帝国
  '魔界·现世'      // 旅行 · 邪神与厨二病少女：魔界与现世边境
]

/** 「类型」：各角色所属作品的题材类型 */
export const TYPE: string[] = [
  '圣杯战争',  // 履历 · FGO
  '灵异奇幻',  // 小说 · xxxHOLiC
  '轻松日常',  // 音乐 · Vocaloid（用户指定）
  '末世射击',  // 游戏 · NIKKE
  '机战政治',  // 追番 · Code Geass
  '喜剧日常'   // 旅行 · 邪神与厨二病少女
]
