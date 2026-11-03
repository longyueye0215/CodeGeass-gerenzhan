/** 八大小说分类的封面图 / 简介 / 强调色（与 NovelCatalog、DocView 共用） */

export interface NovelCategoryMeta {
  /** 分类封面图（未裁剪，展示时自适应） */
  image: string
  /** 分类简介 */
  desc: string
  /** 分类强调色 */
  color: string
}

export const NOVEL_CATEGORY_META: Record<string, NovelCategoryMeta> = {
  诗作: {
    image: '/images/novels/shizuo.jpg',
    desc: '朦朧の春の月夜、この世の中で比べるものはない。',
    color: '#7fd1c0'
  },
  战国物语: {
    image: '/images/novels/zhanguowu.jpg',
    desc: '敵は、本能寺にあり。',
    color: '#6fa8dc'
  },
  王道: {
    image: '/images/novels/wangdao.jpg',
    desc: '我に従え、その果てには、未来がある。',
    color: '#93c47d'
  },
  骑士物语: {
    image: '/images/novels/qishi.jpg',
    desc: '最高の魂は、この上ない悪徳と極限の美徳を発揮できる。',
    color: '#ffd966'
  },
  原创短篇: {
    image: '/images/novels/yuanchuang.jpg',
    desc: '才能を隠すにも卓越した才能がいる。',
    color: '#f6b26b'
  },
  历史同人: {
    image: '/images/novels/lishi.jpg',
    desc: '地獄、それは他人である。',
    color: '#e06666'
  },
  游戏同人: {
    image: '/images/novels/youxi.jpg',
    desc: '運命は、勇気ある者を助ける。',
    color: '#b4a7d6'
  },
  二创同人: {
    image: '/images/novels/erchuang.jpg',
    desc: '愛は、最も良い教師である。',
    color: '#f09eb8'
  }
}
