type Props = { pan: { x: number; y: number } }

export default function Backdrop({ pan }: Props) {
  return (
    <div className="backdrop">
      <div
        className="backdrop-photo"
        style={{
          // 底图已裁成月球居中；放大 1.12 让拖拽范围能到 ±70px 而不露边
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(1.12)`
        }}
      />
      <div className="backdrop-veil" />
      <div className="backdrop-scan" />
      <div className="backdrop-vignette" />
    </div>
  )
}
