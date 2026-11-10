import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 每次构建换一个缓存桶版本，Service Worker 会自动清掉上一版
const BUILD_ID = Date.now().toString(36)

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID)
  },
  build: {
    target: 'es2020',
    // 组件 CSS 不跟随 chunk 拆分。
    // 同一个模块既被静态 import（LoadingScreen → AstralShell）又被动态 import
    // （BottomHud lazy）时，Vite 只会为后者注入拆出来的 CSS，
    // 静态路径就会丢掉 .as-root/.as-layer 的布局 → 加载页球体不可见。
    // 统一合并进首屏样式表，彻底消除这类「拆包导致样式失踪」。
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // 把体积最大的三方库拆开：首屏只需要 react，three 只在进入分区时加载
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('@react-three')) return 'r3f'
          if (id.includes('/three/')) return 'three'
          if (id.includes('/ogl/')) return 'ogl'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler'))
            return 'react'
        }
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 4400
  },
  preview: {
    host: '127.0.0.1',
    port: 4401
  }
})
