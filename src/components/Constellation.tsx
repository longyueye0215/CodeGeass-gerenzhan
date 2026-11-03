type Shape = { stars: [number, number][]; links: [number, number][] }

/**
 * 八个星座的线稿（viewBox 0 0 100 100）。
 * 用白色星点 + 细连线构成，直接叠在星空底图上，
 * 不像位图那样会出现拖拽残影，命中区域也和图形完全一致。
 */
const SHAPES: Shape[] = [
  {
    // 白羊
    stars: [
      [10, 60],
      [30, 44],
      [52, 34],
      [72, 40],
      [88, 24]
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4]
    ]
  },
  {
    // 金牛
    stars: [
      [22, 30],
      [42, 52],
      [64, 30],
      [84, 46],
      [64, 52],
      [56, 72]
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [2, 4],
      [4, 5]
    ]
  },
  {
    // 双子
    stars: [
      [28, 16],
      [24, 42],
      [32, 64],
      [26, 86],
      [64, 14],
      [70, 40],
      [60, 64],
      [68, 84]
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
      [5, 6],
      [6, 7],
      [1, 5],
      [2, 6]
    ]
  },
  {
    // 巨蟹
    stars: [
      [50, 16],
      [44, 44],
      [26, 64],
      [70, 62],
      [78, 40]
    ],
    links: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4]
    ]
  },
  {
    // 狮子
    stars: [
      [12, 74],
      [18, 50],
      [32, 36],
      [50, 34],
      [62, 44],
      [76, 56],
      [90, 44]
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6]
    ]
  },
  {
    // 处女
    stars: [
      [18, 24],
      [38, 32],
      [56, 28],
      [68, 44],
      [60, 64],
      [42, 76],
      [26, 62]
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 1]
    ]
  },
  {
    // 天秤
    stars: [
      [28, 28],
      [60, 26],
      [64, 52],
      [32, 56],
      [86, 44],
      [72, 76]
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [2, 4],
      [2, 5]
    ]
  },
  {
    // 天蝎
    stars: [
      [16, 22],
      [34, 32],
      [50, 44],
      [64, 56],
      [78, 70],
      [88, 86],
      [68, 88]
    ],
    links: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6]
    ]
  }
]

export default function Constellation({ index }: { index: number }) {
  const shape = SHAPES[index % SHAPES.length]
  return (
    <svg
      className="constellation"
      viewBox="0 0 100 100"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <g className="constellation-lines">
        {shape.links.map(([a, b], i) => (
          <line
            key={i}
            x1={shape.stars[a][0]}
            y1={shape.stars[a][1]}
            x2={shape.stars[b][0]}
            y2={shape.stars[b][1]}
          />
        ))}
      </g>
      <g className="constellation-stars">
        {shape.stars.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.4} />
        ))}
      </g>
    </svg>
  )
}
