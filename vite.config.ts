import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/ui/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./tests/ui/setup.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
})
