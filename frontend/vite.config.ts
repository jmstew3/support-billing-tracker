import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'recharts',
      'lucide-react',
      'date-fns',
      '@tanstack/react-table',
      'class-variance-authority',
      'clsx',
      'tailwind-merge'
    ]
  },
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces for Docker
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true  // Required for Docker on some systems
    },
    hmr: {
      host: 'localhost',  // HMR should connect to localhost
      port: 5173
    }
  }
})
