import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setupTests.ts'],
      globals: true,
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        reportsDirectory: './coverage',
        exclude: [
          '**/*.test.{ts,tsx}',
          '**/__tests__/**',
          '**/node_modules/**',
          '**/dist/**',
          '**/.{idea,git,cache,output,temp}/**'
        ]
      }
    }
  })
)
