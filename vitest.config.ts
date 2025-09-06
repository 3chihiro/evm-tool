import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.ts'],
    environment: 'node',
    exclude: ['ui/**'],
    pool: 'threads',
    maxThreads: 1,
  },
})
