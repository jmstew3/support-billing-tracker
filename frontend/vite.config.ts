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
  }
})
