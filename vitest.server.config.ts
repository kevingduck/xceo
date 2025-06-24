import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-setup/vitest.server.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'client/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/test-setup/',
        '**/tests/',
        '**/__tests__/',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        'playwright.config.ts',
        'tailwind.config.ts',
        'postcss.config.js',
        'drizzle.config.ts'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    include: [
      'server/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
      'db/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'
    ],
    exclude: [
      'node_modules',
      'dist',
      'client',
      '.idea',
      '.git',
      '.cache',
      'e2e/**'
    ]
  },
  resolve: {
    alias: {
      '@db': path.resolve(__dirname, './db'),
      '@server': path.resolve(__dirname, './server')
    }
  }
})