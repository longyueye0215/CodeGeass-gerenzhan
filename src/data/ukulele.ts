/**
 * 空耳露娜作品集：一条记录对应一个曲目文件夹。
 * 歌词图存在 /public/images/ukulele/<id>/<序号>.webp，序号从 01 起按幻灯片顺序。
 * 此文件由 scripts/import_ukulele.py 生成，请勿手改。
 */

export interface UkuleleTrack {
  id: string
  title: string
  kana: string
  count: number
}

export const UKULELE_TRACKS: UkuleleTrack[] = [
  { id: 't01', title: 'FGO八周年主题曲', kana: 'あ', count: 41 },
  { id: 't02', title: 'one last kiss', kana: 'い', count: 51 },
  { id: 't03', title: '炮姐OP', kana: 'う', count: 64 },
  { id: 't04', title: '艾克斯奥特曼', kana: 'え', count: 46 },
  { id: 't05', title: '艾斯奥特曼', kana: 'お', count: 33 },
  { id: 't06', title: '百恋歌', kana: 'か', count: 36 },
  { id: 't07', title: '残酷天使的行动纲领', kana: 'き', count: 54 },
  { id: 't08', title: 'やきもち', kana: 'く', count: 33 },
  { id: 't09', title: '大概', kana: 'け', count: 67 },
  { id: 't10', title: '迪迦奥特曼主题曲', kana: 'こ', count: 44 },
  { id: 't11', title: '怪物', kana: 'さ', count: 62 },
  { id: 't12', title: '花仙子', kana: 'し', count: 45 },
  { id: 't13', title: '捷德奥特曼OP', kana: 'す', count: 22 },
  { id: 't14', title: '精灵', kana: 'せ', count: 35 },
  { id: 't15', title: '雷欧OP', kana: 'そ', count: 15 },
  { id: 't16', title: '丽奈', kana: 'た', count: 58 },
  { id: 't17', title: '胧月', kana: 'ち', count: 29 },
  { id: 't18', title: '马赛克碎片', kana: 'つ', count: 28 },
  { id: 't19', title: '梦比优斯奥特曼主题曲', kana: 'て', count: 47 },
  { id: 't20', title: '奈克瑟斯奥特曼OP·英雄', kana: 'と', count: 42 },
  { id: 't21', title: '偶像', kana: 'な', count: 76 },
  { id: 't22', title: '千本樱', kana: 'に', count: 51 },
  { id: 't23', title: '群青', kana: 'ぬ', count: 81 },
  { id: 't24', title: '若能绽放光芒', kana: 'ね', count: 50 },
  { id: 't25', title: '赛文奥特曼', kana: 'の', count: 17 },
  { id: 't26', title: '山田小姐ED', kana: 'は', count: 22 },
  { id: 't27', title: '神的随波逐流', kana: 'ひ', count: 76 },
  { id: 't28', title: '泰罗奥特曼OP', kana: 'ふ', count: 13 },
  { id: 't29', title: '未闻花名', kana: 'へ', count: 53 },
  { id: 't30', title: '希望的碎片', kana: 'ほ', count: 49 },
  { id: 't31', title: '向夜晚奔去', kana: 'ま', count: 62 },
  { id: 't32', title: '勇者', kana: 'み', count: 69 },
  { id: 't33', title: '来自妹妹的声音', kana: 'む', count: 48 },
  { id: 't34', title: '月光传说', kana: 'め', count: 29 },
  { id: 't35', title: '祝福', kana: 'も', count: 56 },
  { id: 't36', title: '罪恶王冠OP·My Dearest', kana: 'や', count: 49 },
  { id: 't37', title: '罪恶王冠插曲·Euterpe', kana: 'ゆ', count: 31 }
]
