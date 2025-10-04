import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Ensure DOM is reset between tests
afterEach(() => cleanup())

// Silence expected console noise in tests while surfacing real errors
const originalError = console.error
const originalWarn = console.warn

console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? '')
  // Ignore React warnings about act() and other expected testing warnings
  if (msg.includes('Warning: React')) return
  if (msg.includes('Not implemented: HTMLFormElement.prototype.requestSubmit')) return
  originalError(...args as Parameters<typeof originalError>)
}

console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? '')
  // Ignore known warnings
  if (msg.includes('componentWillReceiveProps')) return
  originalWarn(...args as Parameters<typeof originalWarn>)
}

// Mock Recharts to avoid canvas/SVG issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: vi.fn(({ children }) => children),
  BarChart: vi.fn(() => null),
  PieChart: vi.fn(() => null),
  LineChart: vi.fn(() => null),
  Bar: vi.fn(() => null),
  Pie: vi.fn(() => null),
  Line: vi.fn(() => null),
  XAxis: vi.fn(() => null),
  YAxis: vi.fn(() => null),
  CartesianGrid: vi.fn(() => null),
  Tooltip: vi.fn(() => null),
  Legend: vi.fn(() => null),
  Cell: vi.fn(() => null)
}))

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})
