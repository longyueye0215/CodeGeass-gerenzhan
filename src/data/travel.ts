/* 旅行分区：六个到访地区的照片清单（由 scripts/gen_travel_data.cjs 生成） */
export interface TravelRegion {
  /** 中文简称，显示用 */
  label: string
  /** 与 chinaGeo 中的要素名称对应 */
  geo: string
  code: string
  en: string
  slug: string
  spots: string[]
  photos: string[]
}

/** 单段画廊的照片上限，超出后自动续接下一段 */
export const SEGMENT_CAP = 36

export const TRAVEL_REGIONS: TravelRegion[] = [
  {
    label: '上海',
    geo: '上海市',
    code: 'SHA',
    en: 'SHANGHAI',
    slug: 'shanghai',
    spots: ['上海'],
    photos: [
      '/images/travel/shanghai/0001.jpg', '/images/travel/shanghai/0002.jpg', '/images/travel/shanghai/0003.jpg', '/images/travel/shanghai/0004.jpg', '/images/travel/shanghai/0005.jpg', '/images/travel/shanghai/0006.jpg',
      '/images/travel/shanghai/0007.jpg', '/images/travel/shanghai/0008.jpg', '/images/travel/shanghai/0009.jpg', '/images/travel/shanghai/0010.jpg', '/images/travel/shanghai/0011.jpg', '/images/travel/shanghai/0012.jpg',
      '/images/travel/shanghai/0013.jpg', '/images/travel/shanghai/0014.jpg', '/images/travel/shanghai/0015.jpg', '/images/travel/shanghai/0016.jpg', '/images/travel/shanghai/0017.jpg',
    ],
  },
  {
    label: '四川',
    geo: '四川省',
    code: 'CTU',
    en: 'SICHUAN',
    slug: 'sichuan',
    spots: ['三星堆', '东方佛都', '中江', '乐山大佛', '仓山古镇', '剑门关', '大熊猫基地', '峨眉山', '德阳', '明蜀王陵', '杜甫草堂', '武侯祠', '永陵', '眉山', '眉山樱花博览园', '都江堰', '金沙博物馆', '青城山'],
    photos: [
      '/images/travel/sichuan/0001.jpg', '/images/travel/sichuan/0002.jpg', '/images/travel/sichuan/0003.jpg', '/images/travel/sichuan/0004.jpg', '/images/travel/sichuan/0005.jpg', '/images/travel/sichuan/0006.jpg',
      '/images/travel/sichuan/0007.jpg', '/images/travel/sichuan/0008.jpg', '/images/travel/sichuan/0009.jpg', '/images/travel/sichuan/0010.jpg', '/images/travel/sichuan/0011.jpg', '/images/travel/sichuan/0012.jpg',
      '/images/travel/sichuan/0013.jpg', '/images/travel/sichuan/0014.jpg', '/images/travel/sichuan/0015.jpg', '/images/travel/sichuan/0016.jpg', '/images/travel/sichuan/0017.jpg', '/images/travel/sichuan/0018.jpg',
      '/images/travel/sichuan/0019.jpg', '/images/travel/sichuan/0020.jpg', '/images/travel/sichuan/0021.jpg', '/images/travel/sichuan/0022.jpg', '/images/travel/sichuan/0023.jpg', '/images/travel/sichuan/0024.jpg',
      '/images/travel/sichuan/0025.jpg', '/images/travel/sichuan/0026.jpg', '/images/travel/sichuan/0027.jpg', '/images/travel/sichuan/0028.jpg', '/images/travel/sichuan/0029.jpg', '/images/travel/sichuan/0030.jpg',
      '/images/travel/sichuan/0031.jpg', '/images/travel/sichuan/0032.jpg', '/images/travel/sichuan/0033.jpg', '/images/travel/sichuan/0034.jpg', '/images/travel/sichuan/0035.jpg', '/images/travel/sichuan/0036.jpg',
      '/images/travel/sichuan/0037.jpg', '/images/travel/sichuan/0038.jpg', '/images/travel/sichuan/0039.jpg', '/images/travel/sichuan/0040.jpg', '/images/travel/sichuan/0041.jpg', '/images/travel/sichuan/0042.jpg',
      '/images/travel/sichuan/0043.jpg', '/images/travel/sichuan/0044.jpg', '/images/travel/sichuan/0045.jpg', '/images/travel/sichuan/0046.jpg', '/images/travel/sichuan/0047.jpg', '/images/travel/sichuan/0048.jpg',
      '/images/travel/sichuan/0049.jpg', '/images/travel/sichuan/0050.jpg', '/images/travel/sichuan/0051.jpg', '/images/travel/sichuan/0052.jpg', '/images/travel/sichuan/0053.jpg', '/images/travel/sichuan/0054.jpg',
      '/images/travel/sichuan/0055.jpg', '/images/travel/sichuan/0056.jpg', '/images/travel/sichuan/0057.jpg', '/images/travel/sichuan/0058.jpg', '/images/travel/sichuan/0059.jpg', '/images/travel/sichuan/0060.jpg',
      '/images/travel/sichuan/0061.jpg', '/images/travel/sichuan/0062.jpg', '/images/travel/sichuan/0063.jpg', '/images/travel/sichuan/0064.jpg', '/images/travel/sichuan/0065.jpg', '/images/travel/sichuan/0066.jpg',
      '/images/travel/sichuan/0067.jpg', '/images/travel/sichuan/0068.jpg', '/images/travel/sichuan/0069.jpg', '/images/travel/sichuan/0070.jpg', '/images/travel/sichuan/0071.jpg', '/images/travel/sichuan/0072.jpg',
      '/images/travel/sichuan/0073.jpg', '/images/travel/sichuan/0074.jpg', '/images/travel/sichuan/0075.jpg', '/images/travel/sichuan/0076.jpg', '/images/travel/sichuan/0077.jpg', '/images/travel/sichuan/0078.jpg',
      '/images/travel/sichuan/0079.jpg', '/images/travel/sichuan/0080.jpg', '/images/travel/sichuan/0081.jpg', '/images/travel/sichuan/0082.jpg', '/images/travel/sichuan/0083.jpg', '/images/travel/sichuan/0084.jpg',
      '/images/travel/sichuan/0085.jpg', '/images/travel/sichuan/0086.jpg', '/images/travel/sichuan/0087.jpg', '/images/travel/sichuan/0088.jpg', '/images/travel/sichuan/0089.jpg', '/images/travel/sichuan/0090.jpg',
      '/images/travel/sichuan/0091.jpg', '/images/travel/sichuan/0092.jpg', '/images/travel/sichuan/0093.jpg', '/images/travel/sichuan/0094.jpg', '/images/travel/sichuan/0095.jpg', '/images/travel/sichuan/0096.jpg',
      '/images/travel/sichuan/0097.jpg', '/images/travel/sichuan/0098.jpg', '/images/travel/sichuan/0099.jpg', '/images/travel/sichuan/0100.jpg', '/images/travel/sichuan/0101.jpg', '/images/travel/sichuan/0102.jpg',
      '/images/travel/sichuan/0103.jpg', '/images/travel/sichuan/0104.jpg', '/images/travel/sichuan/0105.jpg', '/images/travel/sichuan/0106.jpg', '/images/travel/sichuan/0107.jpg', '/images/travel/sichuan/0108.jpg',
      '/images/travel/sichuan/0109.jpg', '/images/travel/sichuan/0110.jpg', '/images/travel/sichuan/0111.jpg', '/images/travel/sichuan/0112.jpg', '/images/travel/sichuan/0113.jpg', '/images/travel/sichuan/0114.jpg',
      '/images/travel/sichuan/0115.jpg', '/images/travel/sichuan/0116.jpg', '/images/travel/sichuan/0117.jpg', '/images/travel/sichuan/0118.jpg', '/images/travel/sichuan/0119.jpg', '/images/travel/sichuan/0120.jpg',
      '/images/travel/sichuan/0121.jpg', '/images/travel/sichuan/0122.jpg', '/images/travel/sichuan/0123.jpg', '/images/travel/sichuan/0124.jpg', '/images/travel/sichuan/0125.jpg', '/images/travel/sichuan/0126.jpg',
      '/images/travel/sichuan/0127.jpg', '/images/travel/sichuan/0128.jpg', '/images/travel/sichuan/0129.jpg', '/images/travel/sichuan/0130.jpg', '/images/travel/sichuan/0131.jpg', '/images/travel/sichuan/0132.jpg',
      '/images/travel/sichuan/0133.jpg', '/images/travel/sichuan/0134.jpg', '/images/travel/sichuan/0135.jpg', '/images/travel/sichuan/0136.jpg', '/images/travel/sichuan/0137.jpg', '/images/travel/sichuan/0138.jpg',
      '/images/travel/sichuan/0139.jpg', '/images/travel/sichuan/0140.jpg', '/images/travel/sichuan/0141.jpg', '/images/travel/sichuan/0142.jpg', '/images/travel/sichuan/0143.jpg', '/images/travel/sichuan/0144.jpg',
      '/images/travel/sichuan/0145.jpg', '/images/travel/sichuan/0146.jpg', '/images/travel/sichuan/0147.jpg', '/images/travel/sichuan/0148.jpg', '/images/travel/sichuan/0149.jpg', '/images/travel/sichuan/0150.jpg',
      '/images/travel/sichuan/0151.jpg', '/images/travel/sichuan/0152.jpg',
    ],
  },
  {
    label: '重庆',
    geo: '重庆市',
    code: 'CKG',
    en: 'CHONGQING',
    slug: 'chongqing',
    spots: ['三峡博物馆', '重庆市区'],
    photos: [
      '/images/travel/chongqing/0001.jpg', '/images/travel/chongqing/0002.jpg', '/images/travel/chongqing/0003.jpg', '/images/travel/chongqing/0004.jpg', '/images/travel/chongqing/0005.jpg', '/images/travel/chongqing/0006.jpg',
      '/images/travel/chongqing/0007.jpg', '/images/travel/chongqing/0008.jpg', '/images/travel/chongqing/0009.jpg', '/images/travel/chongqing/0010.jpg', '/images/travel/chongqing/0011.jpg', '/images/travel/chongqing/0012.jpg',
      '/images/travel/chongqing/0013.jpg', '/images/travel/chongqing/0014.jpg', '/images/travel/chongqing/0015.jpg', '/images/travel/chongqing/0016.jpg', '/images/travel/chongqing/0017.jpg', '/images/travel/chongqing/0018.jpg',
      '/images/travel/chongqing/0019.jpg', '/images/travel/chongqing/0020.jpg', '/images/travel/chongqing/0021.jpg', '/images/travel/chongqing/0022.jpg', '/images/travel/chongqing/0023.jpg', '/images/travel/chongqing/0024.jpg',
      '/images/travel/chongqing/0025.jpg', '/images/travel/chongqing/0026.jpg', '/images/travel/chongqing/0027.jpg', '/images/travel/chongqing/0028.jpg', '/images/travel/chongqing/0029.jpg', '/images/travel/chongqing/0030.jpg',
    ],
  },
  {
    label: '陕西',
    geo: '陕西省',
    code: 'SIA',
    en: 'SHAANXI',
    slug: 'shaanxi',
    spots: ['秦始皇陵', '西安'],
    photos: [
      '/images/travel/shaanxi/0001.jpg', '/images/travel/shaanxi/0002.jpg', '/images/travel/shaanxi/0003.jpg', '/images/travel/shaanxi/0004.jpg', '/images/travel/shaanxi/0005.jpg', '/images/travel/shaanxi/0006.jpg',
      '/images/travel/shaanxi/0007.jpg', '/images/travel/shaanxi/0008.jpg', '/images/travel/shaanxi/0009.jpg', '/images/travel/shaanxi/0010.jpg', '/images/travel/shaanxi/0011.jpg', '/images/travel/shaanxi/0012.jpg',
      '/images/travel/shaanxi/0013.jpg', '/images/travel/shaanxi/0014.jpg', '/images/travel/shaanxi/0015.jpg', '/images/travel/shaanxi/0016.jpg', '/images/travel/shaanxi/0017.jpg', '/images/travel/shaanxi/0018.jpg',
      '/images/travel/shaanxi/0019.jpg',
    ],
  },
  {
    label: '广东',
    geo: '广东省',
    code: 'CAN',
    en: 'GUANGDONG',
    slug: 'guangdong',
    spots: ['南越王博物馆', '广东省博物馆', '广州', '深圳', '深圳博物馆'],
    photos: [
      '/images/travel/guangdong/0001.jpg', '/images/travel/guangdong/0002.jpg', '/images/travel/guangdong/0003.jpg', '/images/travel/guangdong/0004.jpg', '/images/travel/guangdong/0005.jpg', '/images/travel/guangdong/0006.jpg',
      '/images/travel/guangdong/0007.jpg', '/images/travel/guangdong/0008.jpg', '/images/travel/guangdong/0009.jpg', '/images/travel/guangdong/0010.jpg', '/images/travel/guangdong/0011.jpg', '/images/travel/guangdong/0012.jpg',
      '/images/travel/guangdong/0013.jpg', '/images/travel/guangdong/0014.jpg', '/images/travel/guangdong/0015.jpg', '/images/travel/guangdong/0016.jpg', '/images/travel/guangdong/0017.jpg', '/images/travel/guangdong/0018.jpg',
      '/images/travel/guangdong/0019.jpg', '/images/travel/guangdong/0020.jpg', '/images/travel/guangdong/0021.jpg', '/images/travel/guangdong/0022.jpg', '/images/travel/guangdong/0023.jpg', '/images/travel/guangdong/0024.jpg',
      '/images/travel/guangdong/0025.jpg', '/images/travel/guangdong/0026.jpg', '/images/travel/guangdong/0027.jpg', '/images/travel/guangdong/0028.jpg', '/images/travel/guangdong/0029.jpg', '/images/travel/guangdong/0030.jpg',
      '/images/travel/guangdong/0031.jpg', '/images/travel/guangdong/0032.jpg', '/images/travel/guangdong/0033.jpg', '/images/travel/guangdong/0034.jpg', '/images/travel/guangdong/0035.jpg', '/images/travel/guangdong/0036.jpg',
      '/images/travel/guangdong/0037.jpg', '/images/travel/guangdong/0038.jpg', '/images/travel/guangdong/0039.jpg', '/images/travel/guangdong/0040.jpg', '/images/travel/guangdong/0041.jpg', '/images/travel/guangdong/0042.jpg',
      '/images/travel/guangdong/0043.jpg', '/images/travel/guangdong/0044.jpg', '/images/travel/guangdong/0045.jpg', '/images/travel/guangdong/0046.jpg', '/images/travel/guangdong/0047.jpg', '/images/travel/guangdong/0048.jpg',
      '/images/travel/guangdong/0049.jpg', '/images/travel/guangdong/0050.jpg', '/images/travel/guangdong/0051.jpg', '/images/travel/guangdong/0052.jpg',
    ],
  },
  {
    label: '香港',
    geo: '香港特别行政区',
    code: 'HKG',
    en: 'HONG KONG',
    slug: 'hongkong',
    spots: ['香港市区', '香港故宫博物馆'],
    photos: [
      '/images/travel/hongkong/0001.jpg', '/images/travel/hongkong/0002.jpg', '/images/travel/hongkong/0003.jpg', '/images/travel/hongkong/0004.jpg', '/images/travel/hongkong/0005.jpg', '/images/travel/hongkong/0006.jpg',
      '/images/travel/hongkong/0007.jpg', '/images/travel/hongkong/0008.jpg', '/images/travel/hongkong/0009.jpg', '/images/travel/hongkong/0010.jpg', '/images/travel/hongkong/0011.jpg', '/images/travel/hongkong/0012.jpg',
      '/images/travel/hongkong/0013.jpg', '/images/travel/hongkong/0014.jpg', '/images/travel/hongkong/0015.jpg', '/images/travel/hongkong/0016.jpg', '/images/travel/hongkong/0017.jpg', '/images/travel/hongkong/0018.jpg',
    ],
  },
]
