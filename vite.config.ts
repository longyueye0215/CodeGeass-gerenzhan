import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
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
