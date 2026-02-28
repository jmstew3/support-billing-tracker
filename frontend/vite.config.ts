import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Check if HMR should be disabled
const isHMRDisabled = process.env.VITE_HMR_DISABLED === 'true' || process.env.NODE_ENV === 'production'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'tanstack': ['@tanstack/react-query'],
          'charts': ['recharts'],
          'utils': ['date-fns', 'lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',  // Listen on all network interfaces for Docker
    port: parseInt(process.env.VITE_PORT || '5173'),
    strictPort: true,
    allowedHosts: ['billing.peakonedigital.com', 'portal.peakonedigital.com', 'localhost'],
    watch: {
      usePolling: true  // Required for Docker on some systems
    },
    hmr: isHMRDisabled ? false : {
      protocol: 'ws',
      host: 'localhost',
      port: parseInt(process.env.VITE_HMR_PORT || process.env.VITE_PORT || '5173'),
      clientPort: parseInt(process.env.VITE_HMR_CLIENT_PORT || process.env.VITE_HMR_PORT || process.env.VITE_PORT || '5173')
    }
  }
})
