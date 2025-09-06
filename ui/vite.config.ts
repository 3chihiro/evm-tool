import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  root: path.resolve(__dirname),
  server: { port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true },
  resolve: { alias: {} },
  test: {
    environment: 'jsdom',
    setupFiles: [],
    globals: true,
    include: ['ui/tests/**/*.test.tsx'],
    pool: 'threads',
    maxThreads: 1,
  },
})
