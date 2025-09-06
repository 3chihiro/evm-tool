import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  root: path.resolve(__dirname),
  // Electron で file:// 経由読み込み時に絶対パスにならないようにする
  // （/assets/... -> assets/... にする）
  base: './',
  server: { port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true },
  resolve: { alias: {} },
  test: {
    environment: 'jsdom',
    setupFiles: [],
    globals: true,
    include: ['tests/**/*.test.tsx'],
    pool: 'threads',
    maxThreads: 1,
  },
})
