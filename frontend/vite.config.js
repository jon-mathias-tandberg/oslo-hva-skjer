import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase')) return 'firebase'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('date-fns')) return 'vendor'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    globals: true,
  },
})
