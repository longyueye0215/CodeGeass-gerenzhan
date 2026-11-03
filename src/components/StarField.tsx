import GlimmerWrap from './GlimmerWrap'

/** 开屏首页的星光层：替换原来四处漂移的白色呼吸光点 */
export default function StarField() {
  return (
    <div className="starfield" aria-hidden="true">
      <GlimmerWrap
        colors={['#CFE4FF', '#FFFFFF']}
        backgroundColor="transparent"
        count={2600}
        size={1}
        sizeVariance={0.7}
        brightness={0.9}
        spread={1}
        hollow={0.34}
        perspective={0.72}
        centerX={0.5}
        centerY={0.44}
        speed={0.22}
        direction="inward"
        twist={0.18}
        turbulence={0.45}
        trail={0.18}
        glitter={0.32}
        glintSize={0.4}
        twinkle={0.3}
        focus={0.5}
        aperture={0.55}
        boost={8}
        parallax={0.5}
        waves
        intro
        dpr={1.5}
      />
    </div>
  )
}
