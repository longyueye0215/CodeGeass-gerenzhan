import { lazy, Suspense } from 'react'
import { isMobileMode } from '../hooks/useDeviceMode'

// 星光层用 three 着色器渲染。首屏启动仪式本来就会盖住整屏，
// 没必要让 750KB 的 three 出现在 index.html 的 modulepreload 里抢字体带宽，
// 改成按需加载：HUD 文字先出现，星空在仪式结束前就绪。
const GlimmerWrap = lazy(() => import('./GlimmerWrap'))

/** 开屏首页的星光层：替换原来四处漂移的白色呼吸光点 */
export default function StarField() {
  // 组件渲染时读取，不能在模块顶层求值（applyMode 尚未执行）
  const mobile = isMobileMode()

  return (
    <div className="starfield" aria-hidden="true">
      <Suspense fallback={null}>
        <GlimmerWrap
          colors={['#CFE4FF', '#FFFFFF']}
          backgroundColor="transparent"
          count={mobile ? 1200 : 2600}
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
          dpr={mobile ? 1 : 1.5}
        />
      </Suspense>
    </div>
  )
}
